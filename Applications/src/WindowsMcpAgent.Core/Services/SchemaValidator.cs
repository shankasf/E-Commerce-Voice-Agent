using System;
using System.Collections.Generic;
using System.Linq;

namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Validates tool arguments against expected schemas
/// </summary>
public class SchemaValidator : ISchemaValidator
{
    // Define expected argument schemas for each tool
    private static readonly Dictionary<string, Dictionary<string, Type>> ToolSchemas = new()
    {
        ["restart_whitelisted_service"] = new Dictionary<string, Type>
        {
            ["service_name"] = typeof(string)
        },
        ["restart_any_service"] = new Dictionary<string, Type>
        {
            ["service_name"] = typeof(string)
        },
        ["restart_application"] = new Dictionary<string, Type>
        {
            ["process_name"] = typeof(string)
        },
        ["restart_system"] = new Dictionary<string, Type>
        {
            ["delay_seconds"] = typeof(int)  // Optional
        },
        ["signed_driver_reinstall"] = new Dictionary<string, Type>
        {
            ["driver_name"] = typeof(string)
        }
    };

    public ValidationResult ValidateArguments(string toolName, Dictionary<string, object> arguments)
    {
        // If no schema defined, allow all arguments (backward compatibility)
        if (!ToolSchemas.TryGetValue(toolName, out var expectedSchema))
        {
            return ValidationResult.Success();
        }

        // Check for unexpected arguments
        var unexpectedArgs = arguments.Keys.Except(expectedSchema.Keys).ToList();
        if (unexpectedArgs.Any())
        {
            return ValidationResult.Failure(
                $"Tool '{toolName}' received unexpected arguments: {string.Join(", ", unexpectedArgs)}");
        }

        // Validate argument types
        foreach (var (argName, expectedType) in expectedSchema)
        {
            if (!arguments.TryGetValue(argName, out var argValue))
            {
                // Optional arguments are allowed to be missing
                continue;
            }

            if (argValue == null)
            {
                return ValidationResult.Failure($"Argument '{argName}' cannot be null for tool '{toolName}'");
            }

            // Check type compatibility
            var actualType = argValue.GetType();
            if (!IsTypeCompatible(actualType, expectedType))
            {
                return ValidationResult.Failure(
                    $"Argument '{argName}' for tool '{toolName}' has invalid type. Expected {expectedType.Name}, got {actualType.Name}");
            }
        }

        return ValidationResult.Success();
    }

    private static bool IsTypeCompatible(Type actualType, Type expectedType)
    {
        // Exact match
        if (actualType == expectedType)
            return true;

        // Nullable handling
        if (expectedType.IsGenericType && expectedType.GetGenericTypeDefinition() == typeof(Nullable<>))
        {
            var underlyingType = Nullable.GetUnderlyingType(expectedType);
            return underlyingType != null && IsTypeCompatible(actualType, underlyingType);
        }

        // Numeric type compatibility (int can be long, etc.)
        if (expectedType == typeof(int))
        {
            return actualType == typeof(int) || actualType == typeof(long) || actualType == typeof(short);
        }

        // String compatibility
        if (expectedType == typeof(string))
        {
            return actualType == typeof(string);
        }

        return false;
    }
}


