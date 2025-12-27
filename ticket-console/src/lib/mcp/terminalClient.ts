import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Optional override for Windows if you prefer "py"
const PYTHON_BIN = process.env.MCP_PYTHON_BIN ?? "python";

export type TerminalTarget = "local" | "linux";

export type SSHConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export async function runTerminalCommand(
  command: string,
  target: TerminalTarget = "local",
  sshConfig?: SSHConfig,
  timeout_s = 15
) {
  const serverPath = path.join(process.cwd(), "mcp", "terminal_server.py");

  // Spawn the MCP server over stdio (simple + local)
  const transport = new StdioClientTransport({
    command: PYTHON_BIN,
    args: [serverPath],
  });

  const client = new Client(
    { name: "ticket-console", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "execute_command",
      arguments: { 
        command, 
        target,
        // Pass SSH config if provided (for SSH connections)
        ssh_host: sshConfig?.host,
        ssh_port: sshConfig?.port,
        ssh_user: sshConfig?.username,
        ssh_password: sshConfig?.password,
      },
    });

    return result;
  } finally {
    await client.close();
  }
}

export async function listTargets(sshConfig?: SSHConfig) {
  const serverPath = path.join(process.cwd(), "mcp", "terminal_server.py");

  const transport = new StdioClientTransport({
    command: PYTHON_BIN,
    args: [serverPath],
  });

  const client = new Client(
    { name: "ticket-console", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "list_targets",
      arguments: {
        ssh_host: sshConfig?.host,
        ssh_port: sshConfig?.port,
        ssh_user: sshConfig?.username,
        ssh_password: sshConfig?.password,
      },
    });

    return result;
  } finally {
    await client.close();
  }
}
