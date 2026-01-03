using System.Collections.Generic;

namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Validates tool call arguments against expected schema
/// Per Project_requirements.md Section 13 (Security & Compliance - Schema validation)
/// </summary>
public interface ISchemaValidator
{
    /// <summary>
    /// Validates tool arguments against expected schema
    /// </summary>
    /// <param name="toolName">Name of the tool</param>
    /// <param name="arguments">Arguments to validate</param>
    /// <returns>Validation result with error message if invalid</returns>
    ValidationResult ValidateArguments(string toolName, Dictionary<string, object> arguments);
}

/// <summary>
/// Result of schema validation
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    
    public static ValidationResult Success() => new ValidationResult { IsValid = true };
    public static ValidationResult Failure(string error) => new ValidationResult { IsValid = false, ErrorMessage = error };
}


