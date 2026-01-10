import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

// Allowed commands for security (whitelist approach)
const ALLOWED_COMMANDS = [
  'ls', 'pwd', 'whoami', 'date', 'uname', 'uptime',
  'ps', 'top', 'df', 'du', 'cat', 'head', 'tail', 'grep',
  'find', 'which', 'whereis', 'echo', 'env', 'printenv',
  'npm', 'node', 'git', 'python', 'python3',
];

// Dangerous commands that should never be allowed
const BLOCKED_COMMANDS = [
  'rm -rf', 'rm -r', 'del /f', 'format', 'mkfs', 'dd if=',
  'shutdown', 'reboot', 'halt', 'poweroff', 'init 0', 'init 6',
  'sudo', 'su', 'passwd', 'chmod 777', 'chmod +x',
];

interface TerminalExecuteRequest {
  ticketId: number;
  userId: number;
  userRole: 'requester' | 'agent' | 'admin';
  command: string;
}

function isCommandAllowed(command: string, userRole: string): { allowed: boolean; reason?: string } {
  const cmd = command.trim().toLowerCase();
  
  // Check for blocked commands
  for (const blocked of BLOCKED_COMMANDS) {
    if (cmd.includes(blocked.toLowerCase())) {
      return { allowed: false, reason: `Blocked command: ${blocked}` };
    }
  }

  // For requesters, only allow safe read-only commands
  if (userRole === 'requester') {
    const safeCommands = ['ls', 'pwd', 'whoami', 'date', 'uname', 'uptime', 'env', 'echo'];
    const firstWord = cmd.split(' ')[0];
    if (!safeCommands.includes(firstWord)) {
      return { allowed: false, reason: `Requester role can only execute read-only commands. Allowed: ${safeCommands.join(', ')}` };
    }
  }

  // For agents and admins, check whitelist
  if (userRole === 'agent' || userRole === 'admin') {
    const firstWord = cmd.split(' ')[0];
    // Allow commands that start with allowed commands
    const isAllowed = ALLOWED_COMMANDS.some(allowed => firstWord === allowed || firstWord.startsWith(allowed));
    
    // Also allow custom scripts/tools if they're in the project directory
    const isProjectCommand = cmd.includes('ticket-console') || cmd.includes('npm') || cmd.includes('node');
    
    if (!isAllowed && !isProjectCommand) {
      return { allowed: false, reason: `Command not in whitelist. Contact admin for permission.` };
    }
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const body: TerminalExecuteRequest = await request.json();
    const { ticketId, userId, userRole, command } = body;

    if (!command || typeof command !== 'string') {
      return new Response('ERROR: Invalid command\n', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Security check
    const securityCheck = isCommandAllowed(command, userRole);
    if (!securityCheck.allowed) {
      return new Response(`ERROR: ${securityCheck.reason}\n`, {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Create a readable stream for Server-Sent Events style output
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Determine shell based on platform
          const isWindows = process.platform === 'win32';
          const shell = isWindows ? 'cmd.exe' : '/bin/bash';
          const shellArgs = isWindows ? ['/c'] : ['-c'];

          // Set working directory to project root (or safe directory)
          const cwd = process.cwd();
          
          // Execute command
          const childProcess = spawn(shell, [...shellArgs, command], {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env },
          });

          // Stream stdout
          childProcess.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            controller.enqueue(encoder.encode(output));
          });

          // Stream stderr
          childProcess.stderr?.on('data', (data: Buffer) => {
            const error = data.toString();
            controller.enqueue(encoder.encode(`ERROR: ${error}`));
          });

          // Handle process exit
          childProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
              controller.enqueue(encoder.encode(`\nProcess exited with code ${code}\n`));
            }
            controller.close();
          });

          // Handle errors
          childProcess.on('error', (error) => {
            controller.enqueue(encoder.encode(`ERROR: ${error.message}\n`));
            controller.close();
          });

          // Timeout after 30 seconds
          const timeout = setTimeout(() => {
            childProcess.kill('SIGTERM');
            controller.enqueue(encoder.encode('\nERROR: Command execution timed out (30s limit)\n'));
            controller.close();
          }, 30000);

          childProcess.on('exit', () => {
            clearTimeout(timeout);
          });

        } catch (error: any) {
          controller.enqueue(encoder.encode(`ERROR: ${error.message}\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[Terminal API] Error:', error);
    return new Response(`ERROR: ${error.message}\n`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

