namespace WindowsMcpAgent.Core.Models;

/// <summary>
/// Defines the policy for a tool, including role requirements, risk level, and execution guards
/// </summary>
public class ToolPolicy
{
    public string Name { get; set; } = string.Empty;
    public Role MinRole { get; set; }
    public RiskLevel Risk { get; set; }
    public bool RequiresUserNotice { get; set; }
    public bool RequiresIdleCheck { get; set; }
    public bool RequiresAdminElevation { get; set; }
    public int? TimeoutSeconds { get; set; }
}









