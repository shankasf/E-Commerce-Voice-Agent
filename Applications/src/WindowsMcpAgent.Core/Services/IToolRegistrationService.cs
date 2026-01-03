using System.Collections.Generic;
using WindowsMcpAgent.Core.Models;
using WindowsMcpAgent.Core.Tools;

namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Service for registering tools with their policies.
/// Centralizes tool registration logic for better maintainability.
/// </summary>
public interface IToolRegistrationService
{
    /// <summary>
    /// Registers all available tools with their policies
    /// </summary>
    void RegisterAllTools(ToolRegistry toolRegistry);
    
    /// <summary>
    /// Gets all registered tool names for a specific role
    /// </summary>
    IEnumerable<string> GetToolsForRole(Role role);
}


