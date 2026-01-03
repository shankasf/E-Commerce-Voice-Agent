# Troubleshooting Connection Issues

## Problem: "Failed to connect to device"

### Issue 1: Server Listening on localhost Only

**Problem**: The WebSocket server was listening on `localhost` only, but the URL uses the network IP.

**Solution**: I've updated the code to listen on `0.0.0.0` (all interfaces). You need to rebuild the application:

```bash
dotnet build WindowsMcpAgent.sln --configuration Release
```

### Issue 2: Windows Firewall Blocking

**Problem**: Windows Firewall may be blocking incoming connections on the MCP port.

**Solution**: 
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Add the Windows MCP Agent executable
4. Or allow the port (5000 in your case) for inbound connections

**Quick PowerShell command** (run as Administrator):
```powershell
New-NetFirewallRule -DisplayName "Windows MCP Agent" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### Issue 3: URL Path Mismatch

**Problem**: The URL includes device ID in path: `ws://192.168.1.236:5000/mcp/303ae8a4-9aea-4103-8ef7-0d5ce61dad54`

**Solution**: The server accepts any path under `/mcp/`, so this should work. But verify:
- Server listens on: `http://0.0.0.0:5000/mcp/`
- Client connects to: `ws://192.168.1.236:5000/mcp/303ae8a4-9aea-4103-8ef7-0d5ce61dad54`

### Issue 4: Backend and Client on Different Networks

**Problem**: If backend is on a different machine/network, it may not be able to reach the client IP.

**Solution**: 
- Ensure both are on the same network
- Or use a VPN
- Or configure port forwarding if needed

## Verification Steps

1. **Check if server is listening**:
   ```powershell
   netstat -an | findstr :5000
   ```
   Should show: `0.0.0.0:5000` or `[::]:5000`

2. **Test connection from backend machine**:
   ```bash
   # From backend (if Python websockets installed)
   python -c "import asyncio, websockets; asyncio.run(websockets.connect('ws://192.168.1.236:5000/mcp/test').__aenter__())"
   ```

3. **Check Windows MCP Agent logs**:
   - Check system tray icon tooltip for connection status
   - Check audit logs in `%LOCALAPPDATA%\WindowsMcpAgent\Logs\`

4. **Verify IP address**:
   - Make sure `192.168.1.236` is the correct IP of the Windows machine
   - Run `ipconfig` on Windows machine to verify

## Quick Fix: Rebuild and Restart

1. Rebuild the application:
   ```bash
   dotnet build WindowsMcpAgent.sln --configuration Release
   ```

2. Restart Windows MCP Agent

3. Check the system tray - it should show "Server listening on port X"

4. Try the connection again from backend



