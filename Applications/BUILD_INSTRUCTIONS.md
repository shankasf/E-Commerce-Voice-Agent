# Build Instructions for Windows MCP Agent

## Prerequisites

1. **.NET 8 SDK** - Download and install from [Microsoft's website](https://dotnet.microsoft.com/download/dotnet/8.0)
   - Verify installation: `dotnet --version` (should show 8.x.x)

2. **Visual Studio 2022** (optional, but recommended)
   - Community edition is free
   - Make sure to install the ".NET desktop development" workload

## Building the Application

### Option 1: Using .NET CLI (Command Line)

1. **Open a terminal/command prompt** in the project root directory:
   ```powershell
   cd C:\Users\sunil\source\repos\WindowsMcpAgent
   ```

2. **Restore NuGet packages**:
   ```powershell
   dotnet restore WindowsMcpAgent.sln
   ```

3. **Build the solution**:
   ```powershell
   dotnet build WindowsMcpAgent.sln
   ```

4. **Build in Release mode** (for production):
   ```powershell
   dotnet build WindowsMcpAgent.sln --configuration Release
   ```

### Option 2: Using Visual Studio

1. **Open the solution**:
   - Double-click `WindowsMcpAgent.sln` or open it from Visual Studio

2. **Restore packages** (if prompted, or manually):
   - Right-click solution → "Restore NuGet Packages"

3. **Build the solution**:
   - Press `Ctrl+Shift+B` or
   - Menu: Build → Build Solution

4. **Set startup project** (if needed):
   - Right-click `WindowsMcpAgent` project → "Set as Startup Project"

## Running the Application

### From Command Line

```powershell
dotnet run --project src\WindowsMcpAgent\WindowsMcpAgent.csproj
```

### From Visual Studio

- Press `F5` to run with debugging
- Press `Ctrl+F5` to run without debugging

## Output Location

After building, the executable will be located at:
- **Debug**: `src\WindowsMcpAgent\bin\Debug\net8.0-windows\WindowsMcpAgent.exe`
- **Release**: `src\WindowsMcpAgent\bin\Release\net8.0-windows\WindowsMcpAgent.exe`

## Configuration Before Running

Before running the application, configure the MCP server connection:

1. **Edit `appsettings.json`** in `src\WindowsMcpAgent\`:
   ```json
   {
     "McpSettings": {
       "WssUrl": "wss://your-mcp-server.com/mcp",
       "JwtSecret": "your-secret-key-here"
     }
   }
   ```

2. **Or set environment variables**:
   ```powershell
   $env:MCP_WSS_URL = "wss://your-mcp-server.com/mcp"
   $env:MCP_JWT_SECRET = "your-secret-key-here"
   ```

## Troubleshooting

### Common Build Errors

1. **"NETSDK1045: The current .NET SDK does not support targeting .NET 8.0"**
   - Solution: Install .NET 8 SDK

2. **"Package restore failed"**
   - Solution: Run `dotnet restore` or check internet connection

3. **"The type or namespace name 'X' could not be found"**
   - Solution: Ensure all projects are included in the solution
   - Check that project references are correct

4. **"Could not load file or assembly"**
   - Solution: Clean and rebuild:
     ```powershell
     dotnet clean WindowsMcpAgent.sln
     dotnet build WindowsMcpAgent.sln
     ```

### Verify Project Structure

Ensure these files exist:
- `WindowsMcpAgent.sln` (solution file)
- `src\WindowsMcpAgent\WindowsMcpAgent.csproj` (main project)
- `src\WindowsMcpAgent.Core\WindowsMcpAgent.Core.csproj` (core library)
- `src\WindowsMcpAgent\appsettings.json` (configuration)

## Publishing (Creating Standalone Executable)

To create a standalone executable that doesn't require .NET runtime:

```powershell
dotnet publish src\WindowsMcpAgent\WindowsMcpAgent.csproj -c Release -r win-x64 --self-contained true
```

The published application will be in:
`src\WindowsMcpAgent\bin\Release\net8.0-windows\win-x64\publish\`

## Next Steps After Building

1. Configure the MCP server URL and JWT secret
2. Test the connection to your MCP server
3. Check audit logs in `%LOCALAPPDATA%\WindowsMcpAgent\Logs\`
4. Verify the system tray icon appears









