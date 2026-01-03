```markdown
# Windows App — Build & Launch (Windows)

This guide covers building and launching the Windows MCP Agent on a developer machine (Windows 10/11).

Prerequisites
- .NET 8 SDK installed: https://dotnet.microsoft.com
- PowerShell 7+ (recommended)
- Backend API running and reachable (default: http://localhost:9000)

Build
1. Open a Developer PowerShell in the `Applications` root.
2. Restore and build the solution:
```powershell
dotnet restore WindowsMcpAgent.sln
dotnet build WindowsMcpAgent.sln -c Release
```

Configure
1. Copy example config to project:
```powershell
copy src\WindowsMcpAgent\appsettings.json.example src\WindowsMcpAgent\appsettings.json
```
2. Edit `appsettings.json` and update the backend API URL (`BackendSettings.ApiUrl`) and `JwtSecret`.

Run (development)
```powershell
dotnet run --project src/WindowsMcpAgent/WindowsMcpAgent.csproj
```

Run (packaged)
1. Publish the app:
```powershell
dotnet publish src/WindowsMcpAgent/WindowsMcpAgent.csproj -c Release -o out\publish
```
2. Launch the executable from `out\publish`.

Notes
- Environment variables that can be used: `MCP_BACKEND_API_URL`, `MCP_JWT_SECRET`, `MCP_WSS_URL`.
- Default backend URL used during development: `http://localhost:9000`.

Remove this file when no longer needed.
```
