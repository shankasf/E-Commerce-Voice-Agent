# Code Standards for Windows MCP Agent

## Architecture Principles

### 1. Separation of Concerns
- **UI Layer**: Only handles presentation and user interaction
- **Service Layer**: Business logic and orchestration
- **Core Layer**: Domain models and interfaces
- **Tools Layer**: Tool implementations (stateless, testable)

### 2. Dependency Injection Ready
- Services implement interfaces
- Dependencies passed via constructor
- Easy to mock for testing

### 3. Single Responsibility
- Each class has one clear purpose
- Methods do one thing
- Services are focused and cohesive

## Code Organization

### Directory Structure
```
WindowsMcpAgent.Core/
├── Authentication/      # JWT, device registration
├── Configuration/       # App configuration
├── Logging/            # Audit logging
├── Mcp/                # MCP protocol handling
├── Models/             # Domain models (Role, RiskLevel, etc.)
├── Services/           # Business logic services
│   ├── IToolRegistrationService.cs
│   ├── ToolRegistrationService.cs
│   ├── INotificationService.cs
│   ├── NotificationService.cs
│   ├── IApplicationStateService.cs
│   ├── ApplicationStateService.cs
│   ├── IIdleCheckService.cs
│   ├── IdleCheckService.cs
│   ├── ISchemaValidator.cs
│   └── SchemaValidator.cs
├── Storage/            # Local storage
└── Tools/              # Tool implementations
    ├── NetworkTools/
    ├── ServiceTools/
    └── SystemTools/
```

## Naming Conventions

### Classes
- **Services**: `{Purpose}Service` (e.g., `ToolRegistrationService`)
- **Interfaces**: `I{Purpose}` (e.g., `IToolRegistrationService`)
- **Tools**: `{Action}Tool` (e.g., `RestartSystemTool`)
- **Models**: Descriptive names (e.g., `ToolPolicy`, `Role`)

### Methods
- **Public**: PascalCase, descriptive verbs (e.g., `RegisterAllTools`)
- **Private**: PascalCase, clear purpose (e.g., `UpdateApplicationState`)
- **Async**: End with `Async` (e.g., `ExecuteAsync`)

### Variables
- **Private fields**: `_camelCase` (e.g., `_toolRegistry`)
- **Local variables**: `camelCase` (e.g., `toolName`)
- **Constants**: `PascalCase` (e.g., `DefaultTimeoutSeconds`)

## Documentation Standards

### XML Documentation
Every public class, method, and property should have XML documentation:

```csharp
/// <summary>
/// Brief description of what it does
/// </summary>
/// <param name="paramName">Parameter description</param>
/// <returns>Return value description</returns>
/// <remarks>
/// Additional notes, examples, or important information
/// </remarks>
```

### Code Comments
- **Why, not what**: Explain reasoning, not obvious code
- **Complex logic**: Explain non-obvious algorithms
- **Requirements references**: Link to Project_requirements.md sections

## Error Handling

### Exception Handling Pattern
```csharp
try
{
    // Operation
}
catch (SpecificException ex)
{
    // Handle specific case
    _auditLogger.LogError(...);
    return ErrorResult(...);
}
catch (Exception ex)
{
    // Handle general case
    _auditLogger.LogError(...);
    return ErrorResult(...);
}
```

### Error Messages
- **User-facing**: Clear, actionable, non-technical
- **Logging**: Detailed, technical, with context
- **Audit**: Include role, tool name, timestamp

## Testing Considerations

### Testability
- **Dependencies**: Pass via constructor (DI)
- **Stateless**: Tools should be stateless
- **Mockable**: Interfaces for all services
- **Isolated**: No static dependencies

### Test Structure
```csharp
[Fact]
public void MethodName_Scenario_ExpectedResult()
{
    // Arrange
    // Act
    // Assert
}
```

## Performance

### Async/Await
- Use `async Task` for I/O operations
- Use `ConfigureAwait(false)` in library code
- Avoid `async void` (except event handlers)

### Resource Management
- Implement `IDisposable` for resources
- Use `using` statements
- Dispose WebSocket connections properly

## Security

### Input Validation
- Validate all tool arguments (SchemaValidator)
- Check role permissions (ToolAuthorizationEngine)
- Enforce guard conditions (idle check, user notice)

### Audit Logging
- Log all tool executions
- Log authorization decisions
- Log connection events
- Include timestamps and context

## Maintainability

### Code Size
- **Classes**: < 300 lines (ideally < 200)
- **Methods**: < 50 lines (ideally < 30)
- **Files**: One class per file

### Complexity
- **Cyclomatic Complexity**: < 10 per method
- **Nesting**: Max 3 levels deep
- **Parameters**: Max 5 per method

### Refactoring Indicators
- Repeated code → Extract method
- Large class → Split into services
- Complex conditionals → Extract to method
- Magic numbers → Extract to constants

## Scalability

### Adding New Tools
1. Create tool class in appropriate folder
2. Implement `ITool` interface
3. Add to `ToolRegistrationService`
4. Update backend `ToolRegistry` (Python)
5. Test with appropriate role

### Adding New Services
1. Create interface in `Services/`
2. Create implementation
3. Register in `MainWindow.xaml.cs`
4. Pass to dependent services
5. Document in XML comments

## Compliance Checklist

- [x] All tools from Project_requirements.md implemented
- [x] Role-based permissions enforced
- [x] Risk levels respected
- [x] User notifications for caution tools
- [x] Idle check for restart_system
- [x] Execution timeouts
- [x] Schema validation
- [x] Audit logging
- [x] Tray state management
- [x] Error handling
- [x] XML documentation
- [x] Code organization
- [x] Service layer architecture


