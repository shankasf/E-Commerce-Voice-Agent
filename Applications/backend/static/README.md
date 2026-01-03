# Chat UI Front-End

Simple HTML/JavaScript chat interface for testing the Windows MCP Agent backend.

## Usage

1. Start the backend server:
   ```bash
   python start.py
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:9000/static/index.html
   ```
   
   Or simply:
   ```
   http://localhost:9000/
   ```
   (This will redirect to the chat UI)

3. Enter your User ID (from device registration)

4. Start chatting! Try:
   - "List my network configurations"
   - "Check CPU and memory usage"
   - "Show disk space"
   - "Check system uptime"

## Features

- **Real-time chat interface** - Send messages and get responses
- **Tool execution display** - See which tools were executed
- **Connection status** - Check backend connectivity
- **Persistent configuration** - User ID and backend URL saved in browser
- **Modern UI** - Clean, responsive design

## Configuration

- **User ID**: Enter the user_id from device registration (check `mcp_agent_data.json`)
- **Backend URL**: Default is `http://localhost:9000`, can be changed if needed

## Troubleshooting

- **"Connection Failed"**: Make sure backend is running on the specified port
- **"No device found"**: Ensure device is registered first
- **Empty responses**: Check backend logs for errors









