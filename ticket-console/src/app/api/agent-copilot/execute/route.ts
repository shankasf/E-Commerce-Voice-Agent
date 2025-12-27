export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runTerminalCommand, listTargets, TerminalTarget, SSHConfig } from "@/lib/mcp/terminalClient";

export async function POST(req: Request) {
  const { ticketId, command, target = "local", action, sshConfig } = await req.json();

  // List available targets
  if (action === "list_targets") {
    try {
      const result = await listTargets(sshConfig);
      return NextResponse.json({ result });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message ?? "Failed to list targets" }, { status: 500 });
    }
  }

  if (!ticketId || !command) {
    return NextResponse.json(
      { error: "ticketId and command are required" },
      { status: 400 }
    );
  }

  // MCP server also validates, but keep a tiny server-side guard too
  if (typeof command !== "string" || command.length > 300) {
    return NextResponse.json({ error: "Invalid command" }, { status: 400 });
  }

  // Validate target
  const validTargets: TerminalTarget[] = ["local", "linux"];
  if (!validTargets.includes(target)) {
    return NextResponse.json({ error: "Invalid target. Use 'local' or 'linux'" }, { status: 400 });
  }

  try {
    const result = await runTerminalCommand(command, target, sshConfig, 30);
    return NextResponse.json({ ticketId, command, target, result });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message ?? "Command execution failed",
      ticketId,
      command,
      target
    }, { status: 500 });
  }
}
