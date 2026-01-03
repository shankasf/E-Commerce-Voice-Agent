# Chat UI Guide

## Quick Start

1. **Start the backend**:
   ```bash
   cd backend
   python start.py
   ```

2. **Open the chat UI**:
   - Navigate to: http://localhost:9000/
   - Or directly: http://localhost:9000/static/index.html

3. **Get your User ID**:
   - Check `mcp_agent_data.json` file in the backend directory
   - Look for the `user_id` in the `users` section
   - Example: `"user_1766549075"`

4. **Enter User ID** in the chat UI configuration panel

5. **Start chatting!**

## Example Queries

### Network Configuration
- "List my network configurations"
- "Show me all network interfaces and their status"
- "Check network connectivity"

### System Diagnostics
- "Check CPU and memory usage"
- "Show disk space usage"
- "Check system uptime"
- "Show event log summary"

### Problem Solving
- "My computer is running slow"
- "I'm having network connectivity issues"
- "Check for system errors"

## Features

- **Real-time Chat**: Send messages and get instant responses
- **Tool Execution Display**: See which Windows tools were executed
- **Connection Status**: Visual indicator of backend connectivity
- **Persistent Settings**: User ID and backend URL saved in browser
- **Modern UI**: Clean, responsive design

## Troubleshooting

### "Connection Failed" Status
- Ensure backend is running: `python start.py`
- Check backend URL is correct (default: `http://localhost:9000`)

### "No device found for user"
- Make sure your device is registered
- Verify User ID matches the one in `mcp_agent_data.json`
- Check that Windows MCP Agent is running

### Empty or Error Responses
- Check backend console for error messages
- Verify Windows MCP Agent WebSocket server is running
- Check firewall settings

## Current User ID

Based on your registration, your User ID is:
**`user_1766549075`**

Enter this in the chat UI configuration panel.









