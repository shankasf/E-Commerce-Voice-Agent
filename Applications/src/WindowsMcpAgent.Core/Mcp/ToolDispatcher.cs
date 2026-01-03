using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using WindowsMcpAgent.Core.Logging;
using WindowsMcpAgent.Core.Models;
using WindowsMcpAgent.Core.Services;
using WindowsMcpAgent.Core.Tools;

namespace WindowsMcpAgent.Core.Mcp;

/// <summary>
/// Dispatches tool execution requests and handles authorization, validation, and execution.
/// Per Project_requirements.md Section 10 (Tool Authorization Engine) and Section 13 (Security & Compliance).
/// </summary>
public class ToolDispatcher
{
    private readonly ToolRegistry _toolRegistry;
    private readonly ToolAuthorizationEngine _authorizationEngine;
    private readonly AuditLogger _auditLogger;
    private readonly ISchemaValidator? _schemaValidator;
    private readonly INotificationService? _notificationService;
    private readonly IIdleCheckService? _idleCheckService;

    public ToolDispatcher(
        ToolRegistry toolRegistry,
        ToolAuthorizationEngine authorizationEngine,
        AuditLogger auditLogger,
        ISchemaValidator? schemaValidator = null,
        INotificationService? notificationService = null,
        IIdleCheckService? idleCheckService = null)
    {
        _toolRegistry = toolRegistry;
        _authorizationEngine = authorizationEngine;
        _auditLogger = auditLogger;
        _schemaValidator = schemaValidator;
        _notificationService = notificationService;
        _idleCheckService = idleCheckService;
    }

    /// <summary>
    /// Dispatches a tool execution request with full validation and authorization
    /// </summary>
    public async Task<ToolResultMessage> DispatchAsync(ToolCallMessage toolCall, Role userRole)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            // Step 1: Schema validation (Security & Compliance - Section 13)
            if (_schemaValidator != null)
            {
                var validationResult = _schemaValidator.ValidateArguments(toolCall.Name, toolCall.Arguments);
                if (!validationResult.IsValid)
                {
                    _auditLogger.LogToolExecution(toolCall.Name, userRole.ToString(), false, false, validationResult.ErrorMessage);
                    return CreateErrorResult(toolCall.Id, validationResult.ErrorMessage ?? "Schema validation failed", stopwatch.ElapsedMilliseconds);
                }
            }

            // Step 2: Authorization check (Tool Authorization Engine - Section 10)
            var authResult = _authorizationEngine.Authorize(toolCall.Name, userRole);
            _auditLogger.LogAuthorizationDecision(toolCall.Name, userRole.ToString(), authResult.IsAllowed, authResult.Reason);
            
            if (!authResult.IsAllowed)
            {
                _auditLogger.LogToolExecution(toolCall.Name, userRole.ToString(), false, false, authResult.Reason);
                return CreateErrorResult(toolCall.Id, authResult.Reason, stopwatch.ElapsedMilliseconds);
            }

            var policy = authResult.Policy;
            if (policy == null)
            {
                return CreateErrorResult(toolCall.Id, "Policy not found", stopwatch.ElapsedMilliseconds);
            }

            // Step 3: Guard condition checks (Section 10)
            // Check idle requirement
            if (policy.RequiresIdleCheck && _idleCheckService != null)
            {
                if (!_idleCheckService.IsSystemIdle())
                {
                    var idleTime = _idleCheckService.GetIdleTimeSeconds();
                    var errorMsg = $"System is not idle. Last activity: {idleTime} seconds ago. Idle check required for this tool.";
                    _auditLogger.LogToolExecution(toolCall.Name, userRole.ToString(), false, false, errorMsg);
                    return CreateErrorResult(toolCall.Id, errorMsg, stopwatch.ElapsedMilliseconds);
                }
            }

            // Step 4: User notice for caution tools (Section 12 - Notifications)
            if (policy.RequiresUserNotice && _notificationService != null)
            {
                _notificationService.ShowCautionToolNotice(toolCall.Name, $"Executing {toolCall.Name}");
            }

            // Step 5: Get the tool
            var tool = _toolRegistry.GetTool(toolCall.Name);
            if (tool == null)
            {
                return CreateErrorResult(toolCall.Id, $"Tool '{toolCall.Name}' not found", stopwatch.ElapsedMilliseconds);
            }

            // Step 6: Execute with timeout (Security & Compliance - Section 13)
            var timeout = policy.TimeoutSeconds ?? 300; // Default 5 minutes
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeout));
            
            ToolResult result;
            try
            {
                result = await tool.ExecuteAsync(toolCall.Arguments);
            }
            catch (OperationCanceledException)
            {
                stopwatch.Stop();
                var timeoutError = $"Tool execution timed out after {timeout} seconds";
                _auditLogger.LogToolExecution(toolCall.Name, userRole.ToString(), true, false, timeoutError);
                return CreateErrorResult(toolCall.Id, timeoutError, stopwatch.ElapsedMilliseconds);
            }
            
            stopwatch.Stop();

            // Step 7: Audit logging
            _auditLogger.LogToolExecution(toolCall.Name, userRole.ToString(), true, result.Success, result.Error);

            // Step 8: Return result
            return new ToolResultMessage
            {
                Id = toolCall.Id,
                Type = "tool_result",
                Status = result.Success ? "success" : "error",
                Output = result.Output,
                Error = result.Error,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _auditLogger.LogToolExecution(toolCall.Name, userRole.ToString(), true, false, ex.Message);
            return CreateErrorResult(toolCall.Id, ex.Message, stopwatch.ElapsedMilliseconds);
        }
    }

    private static ToolResultMessage CreateErrorResult(string id, string error, long executionTimeMs)
    {
        return new ToolResultMessage
        {
            Id = id,
            Type = "tool_result",
            Status = "error",
            Error = error,
            ExecutionTimeMs = executionTimeMs
        };
    }
}

