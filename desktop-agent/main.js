const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const io = require('socket.io-client');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Store = require('electron-store');
const axios = require('axios');
require('dotenv').config();

// CONFIGURATION
const SERVER_URL = "http://localhost:5000";
const store = new Store();
let currentDir = os.homedir(); // Persistent CWD

// SECURITY: STRICT ALLOWLIST FOR REMOTE, BUT LOCAL IS MORE PERMISSIVE?
// The prompt implies we can "run something in the desktop agent app".
// Usually local terminals allow anything, but to be safe we stick to non-destructive for now or same allowlist.
// However, a real "terminal" implies open access. 
// Use Caution: We will allow any command for LOCAL input, but keep strict list for REMOTE AI.
const REMOTE_ALLOWED_COMMANDS = [
    'ping', 'ipconfig', 'whoami', 'systeminfo', 'hostname', 'Get-ComputerInfo', 'dir', 'ls', 'cd'
];

let socket;
let mainWindow;

function checkAuthAndStart() {
    const authData = store.get('auth');
    createBaseWindow();

    if (authData && authData.token && authData.user?.id) {
        console.log(`Auto-login as ${authData.user.email}`);
        loadDashboard(authData.user);
        connectSocket(authData.user.id, authData.token);
    } else {
        loadLogin();
    }
}

function createBaseWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: '#1e1e1e', // VS Code BG
        title: "IT Support Desktop Agent",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function loadLogin() {
    mainWindow.setSize(400, 600);
    mainWindow.center();
    mainWindow.loadFile('login.html');
}

function loadDashboard(user) {
    mainWindow.setSize(1000, 700);
    mainWindow.center();
    mainWindow.loadFile('dashboard.html').then(() => {
        setTimeout(() => {
            sendTerminalStatus({ text: "Connecting...", connected: false, user: user.email, prompt: `PS ${currentDir}>` });
        }, 500);
    });
}

// IPC: Handle Login Attempt
ipcMain.handle('login-attempt', async (event, { email, password }) => {
    try {
        const response = await axios.post(`${SERVER_URL}/api/auth/login`, { email, password });
        const data = response.data;

        if (data.token && data.user) {
            store.set('auth', { token: data.token, user: data.user });
            loadDashboard(data.user);
            connectSocket(data.user.id, data.token);
            return { success: true };
        } else {
            return { success: false, error: 'Invalid response' };
        }
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "Login fail" };
    }
});

// IPC: Handle Local Terminal Input
ipcMain.on('terminal:input', (event, command) => {
    // Execute immediately without dialog
    executeLocalCommand(command);
});

function connectSocket(userId, token) {
    if (socket && socket.connected) socket.disconnect();

    socket = io(SERVER_URL, {
        auth: { token } // SEND TOKEN for Auth Middleware
    });

    socket.on('connect', () => {
        console.log(`Connected! ID: ${socket.id}`);
        socket.emit('register_agent'); // Auth handled by Token
        sendTerminalStatus({ text: "ONLINE", connected: true });
        sendTerminalLog("Connected to Dispatch Server.", 'log-success');
    });

    socket.on('disconnect', () => {
        sendTerminalStatus({ text: "OFFLINE", connected: false });
        sendTerminalLog("Disconnected from connection.", 'log-warn');
    });

    socket.on('agent:execute_command', (data) => {
        const { command, runId } = data;
        handleRemoteRequest(command, runId, userId);
    });
}

function handleRemoteRequest(commandString, runId, userId) {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }

    sendTerminalLog(`Incoming Request: ${commandString}`, 'log-cmd');

    // 1. SECURITY CHECK (Remote Only)
    const baseCommand = commandString.split(' ')[0].trim();
    if (!REMOTE_ALLOWED_COMMANDS.some(cmd => baseCommand.toLowerCase() === cmd.toLowerCase())) {
        const msg = `Security Violation: '${baseCommand}' not in remote allowlist.`;
        sendTerminalLog(msg, 'log-error');
        emitResult(runId, null, msg, userId);
        return;
    }

    // 2. DIALOG
    const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['No', 'Yes'],
        defaultId: 0,
        title: 'IT Support Approval',
        message: `Run remote command: ${commandString}?`,
        detail: 'Requested by AI Agent.'
    });

    if (response === 1) {
        executeRemoteCommand(commandString, runId, userId);
    } else {
        sendTerminalLog("User denied request.", 'log-warn');
        emitResult(runId, null, "User denied execution.", userId);
    }
}

// IPC: Get System Specs
ipcMain.handle('get-system-specs', () => {
    return {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        cpu: os.cpus()[0].model,
        arch: os.arch(),
        totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        hostname: os.hostname(),
        uptime: (os.uptime() / 3600).toFixed(1) + ' Hours'
    };
});

function executeRemoteCommand(commandString, runId, userId) {
    // Use persistent CWD
    const child = spawn('powershell.exe', ['-Command', commandString], { cwd: currentDir });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    child.stdout.on('data', (data) => {
        const str = data.toString();
        stdoutBuffer += str;
        sendTerminalData(str);
    });

    child.stderr.on('data', (data) => {
        const str = data.toString();
        stderrBuffer += str;
        sendTerminalData(str);
    });

    child.on('close', (code) => {
        // Return full result to AI
        const output = stdoutBuffer + stderrBuffer;
        // Trim for clean display but send full to AI
        emitResult(runId, output, null, userId);
    });

    child.on('error', (err) => {
        emitResult(runId, null, err.message, userId);
    });
}

function executeLocalCommand(commandString) {
    const trimmed = commandString.trim();

    // Handle CD manually
    if (trimmed.toLowerCase().startsWith('cd ')) {
        const targetPath = trimmed.substring(3).trim();
        const resolvedPath = path.resolve(currentDir, targetPath);

        fs.stat(resolvedPath, (err, stats) => {
            if (err || !stats.isDirectory()) {
                sendTerminalLog(`cd: Cannot find path '${targetPath}'`, 'log-error');
            } else {
                currentDir = resolvedPath;
                sendTerminalStatus({ prompt: `PS ${currentDir}>` });
            }
        });
        return;
    }

    // Spawn with persistent CWD
    const child = spawn('powershell.exe', ['-Command', commandString], { cwd: currentDir });

    child.stdout.on('data', (data) => sendTerminalData(data.toString()));
    child.stderr.on('data', (data) => sendTerminalData(data.toString()));

    child.on('error', (err) => {
        sendTerminalLog(`Error: ${err.message}`, 'log-error');
    });
}

function emitResult(runId, output, error, userId) {
    socket.emit('command:result', {
        userId: userId,
        runId: runId,
        output: output ? output.trim() : null,
        error: error
    });
}

// UI Helpers
function sendTerminalLog(message, type) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('terminal:log', { message, type });
    }
}

function sendTerminalData(chunk) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('terminal:data', chunk);
    }
}

function sendTerminalStatus(status) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('terminal:status', status);
    }
}

app.whenReady().then(checkAuthAndStart);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
