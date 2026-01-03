using System;
using System.Collections.Generic;
using System.Linq;
using WindowsMcpAgent.Core.Models;

namespace WindowsMcpAgent.Core.Tools;

/// <summary>
/// Registry of all available tools and their policies
/// </summary>
public class ToolRegistry
{
    private readonly Dictionary<string, ToolPolicy> _policies = new();
    private readonly Dictionary<string, ITool> _tools = new();

    public void RegisterTool(ITool tool, ToolPolicy policy)
    {
        _tools[tool.Name] = tool;
        _policies[tool.Name] = policy;
    }

    public ITool? GetTool(string name)
    {
        return _tools.TryGetValue(name, out var tool) ? tool : null;
    }

    public ToolPolicy? GetPolicy(string name)
    {
        return _policies.TryGetValue(name, out var policy) ? policy : null;
    }

    public bool IsToolAllowed(string toolName, Role userRole)
    {
        if (!_policies.TryGetValue(toolName, out var policy))
        {
            return false;
        }

        return userRole >= policy.MinRole;
    }

    public IEnumerable<string> GetAllowedTools(Role role)
    {
        return _policies
            .Where(p => role >= p.Value.MinRole)
            .Select(p => p.Key);
    }
}









