using System.Collections.Generic;
using WindowsMcpAgent.Core.Models;
using WindowsMcpAgent.Core.Tools;
using WindowsMcpAgent.Core.Tools.NetworkTools;
using WindowsMcpAgent.Core.Tools.ServiceTools;
using WindowsMcpAgent.Core.Tools.SystemTools;

namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Centralized service for registering all tools with their policies.
/// Follows Project_requirements.md specifications.
/// </summary>
public class ToolRegistrationService : IToolRegistrationService
{
    /// <summary>
    /// Registers all tools according to Project_requirements.md
    /// </summary>
    public void RegisterAllTools(ToolRegistry toolRegistry)
    {
        // AI_AGENT - SAFE Tools (Section 7.1)
        RegisterAIAgentSafeTools(toolRegistry);
        
        // AI_AGENT - CAUTION Tools (Section 7.1)
        RegisterAIAgentCautionTools(toolRegistry);
        
        // AI_AGENT - Special Case: restart_system (Section 7.1)
        RegisterRestartSystemTool(toolRegistry);
        
        // HUMAN_AGENT Tools (Section 7.2)
        RegisterHumanAgentTools(toolRegistry);
        
        // ADMIN Tools (Section 7.3)
        RegisterAdminTools(toolRegistry);
    }
    
    private void RegisterAIAgentSafeTools(ToolRegistry toolRegistry)
    {
        // check_cpu_usage
        toolRegistry.RegisterTool(
            new CheckCpuUsageTool(),
            new ToolPolicy
            {
                Name = "check_cpu_usage",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });
        
        // check_memory_usage
        toolRegistry.RegisterTool(
            new CheckMemoryUsageTool(),
            new ToolPolicy
            {
                Name = "check_memory_usage",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });
        
        // check_disk_usage
        toolRegistry.RegisterTool(
            new CheckDiskUsageTool(),
            new ToolPolicy
            {
                Name = "check_disk_usage",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });
        
        // check_system_uptime
        toolRegistry.RegisterTool(
            new CheckSystemUptimeTool(),
            new ToolPolicy
            {
                Name = "check_system_uptime",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });
        
        // check_event_logs_summary
        toolRegistry.RegisterTool(
            new CheckEventLogsSummaryTool(),
            new ToolPolicy
            {
                Name = "check_event_logs_summary",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });
        
        // check_network_status
        toolRegistry.RegisterTool(
            new CheckNetworkStatusTool(),
            new ToolPolicy
            {
                Name = "check_network_status",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });
        
        // check_ip_address - Shows IP addresses, gateways, DNS servers
        toolRegistry.RegisterTool(
            new CheckIpAddressTool(),
            new ToolPolicy
            {
                Name = "check_ip_address",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });

        // search_files - Search for files across user directories
        toolRegistry.RegisterTool(
            new SearchFilesTool(),
            new ToolPolicy
            {
                Name = "search_files",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });

        // list_files - List files in a specific directory
        toolRegistry.RegisterTool(
            new ListFilesTool(),
            new ToolPolicy
            {
                Name = "list_files",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.SAFE,
                RequiresUserNotice = false,
                RequiresIdleCheck = false
            });
    }
    
    private void RegisterAIAgentCautionTools(ToolRegistry toolRegistry)
    {
        // flush_dns_cache
        toolRegistry.RegisterTool(
            new FlushDnsCacheTool(),
            new ToolPolicy
            {
                Name = "flush_dns_cache",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
        
        // renew_ip_address
        toolRegistry.RegisterTool(
            new RenewIpAddressTool(),
            new ToolPolicy
            {
                Name = "renew_ip_address",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
        
        // reset_network_stack
        toolRegistry.RegisterTool(
            new ResetNetworkStackTool(),
            new ToolPolicy
            {
                Name = "reset_network_stack",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = true
            });
        
        // restart_whitelisted_service
        toolRegistry.RegisterTool(
            new RestartWhitelistedServiceTool(),
            new ToolPolicy
            {
                Name = "restart_whitelisted_service",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
        
        // clear_windows_temp
        toolRegistry.RegisterTool(
            new ClearWindowsTempTool(),
            new ToolPolicy
            {
                Name = "clear_windows_temp",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
        
        // clear_user_temp
        toolRegistry.RegisterTool(
            new ClearUserTempTool(),
            new ToolPolicy
            {
                Name = "clear_user_temp",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
    }
    
    private void RegisterRestartSystemTool(ToolRegistry toolRegistry)
    {
        // restart_system - Special case with idle check + countdown + cancel option
        toolRegistry.RegisterTool(
            new RestartSystemTool(),
            new ToolPolicy
            {
                Name = "restart_system",
                MinRole = Role.AI_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = true,  // Per requirements: with idle check
                TimeoutSeconds = 300  // 5 minute timeout
            });
    }
    
    private void RegisterHumanAgentTools(ToolRegistry toolRegistry)
    {
        // Includes all AI_AGENT tools plus:
        
        // restart_any_service
        toolRegistry.RegisterTool(
            new RestartAnyServiceTool(),
            new ToolPolicy
            {
                Name = "restart_any_service",
                MinRole = Role.HUMAN_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
        
        // restart_application
        toolRegistry.RegisterTool(
            new RestartApplicationTool(),
            new ToolPolicy
            {
                Name = "restart_application",
                MinRole = Role.HUMAN_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
        
        // network_adapter_reset
        toolRegistry.RegisterTool(
            new NetworkAdapterResetTool(),
            new ToolPolicy
            {
                Name = "network_adapter_reset",
                MinRole = Role.HUMAN_AGENT,
                Risk = RiskLevel.CAUTION,
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = true
            });
        
        // windows_update_repair
        toolRegistry.RegisterTool(
            new WindowsUpdateRepairTool(),
            new ToolPolicy
            {
                Name = "windows_update_repair",
                MinRole = Role.HUMAN_AGENT,
                Risk = RiskLevel.ELEVATED,
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = true
            });
        
        // immediate_restart (HUMAN_AGENT)
        toolRegistry.RegisterTool(
            new ImmediateRestartTool(),
            new ToolPolicy
            {
                Name = "immediate_restart",
                MinRole = Role.HUMAN_AGENT,
                Risk = RiskLevel.ELEVATED,
                RequiresUserNotice = true,
                RequiresIdleCheck = false
            });
        
        // execute_terminal_command (AI_AGENT with consent, HUMAN_AGENT and ADMIN)
        toolRegistry.RegisterTool(
            new ExecuteTerminalCommandTool(),
            new ToolPolicy
            {
                Name = "execute_terminal_command",
                MinRole = Role.AI_AGENT,  // AI_AGENT can use it but requires consent
                Risk = RiskLevel.CAUTION,  // Changed from ELEVATED to CAUTION for ai_agent
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = false  // Regular user privileges, no admin elevation
            });
    }
    
    private void RegisterAdminTools(ToolRegistry toolRegistry)
    {
        // Includes all lower tools plus:
        
        // registry_fix
        toolRegistry.RegisterTool(
            new RegistryFixTool(),
            new ToolPolicy
            {
                Name = "registry_fix",
                MinRole = Role.ADMIN,
                Risk = RiskLevel.ELEVATED,
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = true
            });
        
        // firewall_rule_repair
        toolRegistry.RegisterTool(
            new FirewallRuleRepairTool(),
            new ToolPolicy
            {
                Name = "firewall_rule_repair",
                MinRole = Role.ADMIN,
                Risk = RiskLevel.ELEVATED,
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = true
            });
        
        // signed_driver_reinstall (ADMIN)
        toolRegistry.RegisterTool(
            new SignedDriverReinstallTool(),
            new ToolPolicy
            {
                Name = "signed_driver_reinstall",
                MinRole = Role.ADMIN,
                Risk = RiskLevel.ELEVATED,
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = true
            });
        
        // system_restart_no_delay (ADMIN)
        toolRegistry.RegisterTool(
            new SystemRestartNoDelayTool(),
            new ToolPolicy
            {
                Name = "system_restart_no_delay",
                MinRole = Role.ADMIN,
                Risk = RiskLevel.ELEVATED,
                RequiresUserNotice = true,
                RequiresIdleCheck = false,
                RequiresAdminElevation = true
            });
    }
    
    public IEnumerable<string> GetToolsForRole(Role role)
    {
        // This would query the registry, but for now return empty
        // In production, this would be implemented to query ToolRegistry
        yield break;
    }
}

