export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || "";

// Only create client if env vars are present
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type CommandResult = {
  command: string;
  ok: boolean;
  stdout?: string;
  stderr?: string;
  reason?: string;
};

export async function POST(req: Request) {
  // Check if Supabase is configured
  if (!supabase) {
    return NextResponse.json(
      { 
        error: 'Database not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in .env.local' 
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { 
    ticketId, 
    message, 
    conversationHistory = [],
    commandResults = [],
    mode = "chat", // "chat" | "analyze" | "analyze_single" | "continue"
    target = "local", // "local" (Windows) | "linux" (WSL/SSH)
    previousCommand,
    previousReason,
  } = body;

  if (!ticketId) {
    return NextResponse.json(
      { error: "ticketId is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch ticket context from database 
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select(`
        *,
        contact:contact_id(full_name, email, phone),
        organization:organization_id(name, u_e_code),
        status:status_id(name),
        priority:priority_id(name)
      `)
      .eq("ticket_id", ticketId)
      .single();

    // 2. Fetch conversation history from DB
    const { data: dbMessages } = await supabase
      .from("ticket_messages")
      .select("content, message_type, created_at, sender_agent_id, sender_contact_id")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(20);

    // 3. Fetch device info if available
    let deviceInfo = null;
    if (ticket?.device_id) {
      const { data: device } = await supabase
        .from("devices")
        .select("*")
        .eq("device_id", ticket.device_id)
        .single();
      deviceInfo = device;
    }

    // 4. Build context for AI
    const ticketContext = `
TICKET INFORMATION:
- Ticket ID: ${ticket?.ticket_id}
- Subject: ${ticket?.subject}
- Description: ${ticket?.description || "N/A"}
- Status: ${ticket?.status?.name}
- Priority: ${ticket?.priority?.name}
- Contact: ${ticket?.contact?.full_name} (${ticket?.contact?.email})
- Organization: ${ticket?.organization?.name}
${deviceInfo ? `
DEVICE INFORMATION:
- Asset Name: ${deviceInfo.asset_name}
- Status: ${deviceInfo.status}
- Hostname: ${deviceInfo.host_name || "N/A"}
- IP: ${deviceInfo.public_ip || "N/A"}
- OS: ${deviceInfo.os_version || "N/A"}
` : ""}

CONVERSATION HISTORY (from ticket):
${dbMessages?.map(m => `- ${m.content}`).join("\n") || "No messages yet"}
`;

    // 5. Build command results context if any
    let commandResultsContext = "";
    if (commandResults && commandResults.length > 0) {
      commandResultsContext = "\n\nCOMMAND EXECUTION RESULTS:\n";
      commandResults.forEach((result: CommandResult) => {
        commandResultsContext += `\nCommand: ${result.command}\n`;
        if (result.ok) {
          commandResultsContext += `Status: SUCCESS\n`;
          if (result.stdout) commandResultsContext += `Output:\n${result.stdout}\n`;
          if (result.stderr) commandResultsContext += `Stderr:\n${result.stderr}\n`;
        } else {
          commandResultsContext += `Status: FAILED\nReason: ${result.reason || "Unknown"}\n`;
        }
      });
    }

    // 6. Build the system prompt based on mode and target
    const isLinux = target === "linux";
    const targetName = isLinux ? "Linux (WSL)" : "Windows";
    
    const windowsCommands = `
- ipconfig, ipconfig /all, ipconfig /release, ipconfig /renew, ipconfig /flushdns
- ping [host], ping -n 4 [host]
- nslookup [domain]
- tracert [host]
- netstat -an, netstat -b
- tasklist, tasklist /svc
- systeminfo
- whoami, hostname
- powershell Get-Service [name]
- powershell Get-Process
- powershell Get-NetIPConfiguration
- powershell Test-Connection [host]
- powershell Resolve-DnsName [domain]`;

    const linuxCommands = `
- ip addr, ip addr show, ip route
- ifconfig (if available)
- ping [host], ping -c 4 [host]
- dig [domain] (preferred for DNS lookup)
- host [domain] (alternative DNS lookup)
- cat /etc/resolv.conf (check DNS config)
- traceroute [host] (if available) or tracepath [host]
- netstat -an, ss -tuln
- ps aux, ps -ef
- df -h (disk usage)
- free -m (memory)
- uname -a (system info)
- hostname, whoami
- cat /etc/os-release
- cat /etc/hosts
- systemctl status [service]
- service [name] status
- ls -la [path]
- uptime, lscpu, lsmem

NOTE: Use 'dig' for DNS lookups on Linux. nslookup may not be installed on minimal systems.`;

    const systemPrompt = `You are an AI IT support assistant helping agents resolve tickets through an AGENTIC workflow.

CURRENT TARGET: ${targetName}
⚠️ IMPORTANT: Only suggest ${targetName} commands! The agent is running commands on a ${targetName} system.

YOUR CAPABILITIES:
1. Analyze ticket details and conversation history
2. Suggest safe diagnostic commands for ${targetName}
3. Analyze command output and determine next steps
4. Continue troubleshooting until the issue is resolved or needs escalation
5. Be conversational - explain findings clearly like talking to a colleague

ALLOWED ${targetName.toUpperCase()} COMMANDS (only suggest these):
${isLinux ? linuxCommands : windowsCommands}

RESPONSE FORMAT (always JSON):
{
  "answer": "Your conversational analysis explaining what you found and what to do next. Be clear and helpful.",
  "proposed_commands": [
    {
      "title": "Short title",
      "command": "exact command",
      "reason": "Why this helps based on previous output",
      "risk": "low|medium|high",
      "auto_approve": true|false  // true for low-risk diagnostic commands
    }
  ],
  "status": "investigating|need_more_info|resolved|escalate",
  "next_step_hint": "Brief hint about what to do after these commands run",
  "confidence": 0.0-1.0  // Your confidence this will help resolve the issue
}

ANALYSIS STYLE (when mode is "analyze_single"):
- Start with: "Looking at this output, I can see..."
- Explain what the command revealed
- Identify specific issues or confirm things are working
- Suggest next steps with clear reasoning
- If resolved, clearly state: "This appears to be resolved because..."

WORKFLOW RULES:
1. Start with basic diagnostics (ipconfig, ping) before complex ones
2. Set auto_approve=true ONLY for read-only, low-risk diagnostic commands
3. Analyze command outputs thoroughly - look for error patterns, timeouts, connection issues
4. If you see a clear solution, explain it and mark status="resolved"
5. If you need user action (restart, reconnect cable), explain and mark status="need_more_info"
6. If the issue is beyond diagnostic commands, mark status="escalate"
7. Keep iterating until resolved - don't give up after one command!
8. When analyzing single commands, be conversational and explain your reasoning clearly

CURRENT CONTEXT:
${ticketContext}
${commandResultsContext}`;

    // 7. Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: ConversationMessage) => {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    // Add the current message based on mode
    if (mode === "analyze_single" && commandResults?.length === 1) {
      // NEW: Analyze single command result with conversational style
      const result = commandResults[0];
      
      messages.push({
        role: "user",
        content: `I just ran this command:
Command: "${previousCommand || result.command || 'Unknown'}"
Reason: ${previousReason || "Diagnostic check"}

Result:
- Status: ${result.ok ? "✅ SUCCESS" : "❌ FAILED"}
- Output: ${result.stdout || "(no output)"}
- Error Output: ${result.stderr || "(no errors)"}
- Exit Code: ${result.exit_code ?? (result.ok ? 0 : 1)}

Please analyze this result in a conversational way:
1. What does this output tell us about the system?
2. What issues (if any) can you identify?
3. What should we do next?
4. Should I continue troubleshooting or is this resolved?

Be clear and explain like you're talking to a colleague. If you see a clear next step, suggest it with auto_approve=true for low-risk diagnostic commands.`
      });
    } else if (mode === "analyze" && commandResults?.length > 0) {
      messages.push({
        role: "user",
        content: `I ran the commands you suggested. Please analyze the results above and tell me what's wrong and what to do next. Continue troubleshooting if needed.`
      });
    } else if (mode === "continue") {
      messages.push({
        role: "user",
        content: message || "Continue troubleshooting based on the results."
      });
    } else if (message) {
      messages.push({
        role: "user",
        content: `AGENT QUESTION: ${message}`
      });
    }

    // 8. Call OpenAI (gpt-4o is the latest flagship model)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.7,
    });

    const response = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      answer: response.answer || "I couldn't generate a response.",
      proposed_commands: response.proposed_commands || [],
      status: response.status || "investigating",
      next_step_hint: response.next_step_hint || null,
      confidence: response.confidence || 0.5,
    });

  } catch (error: any) {
    console.error("Copilot chat error:", error);
    return NextResponse.json(
      { error: error.message || "Chat failed" },
      { status: 500 }
    );
  }
}
