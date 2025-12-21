
const supabase = require('../config/supabaseclient');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. Define Tools
const TOOLS = [
    {
        type: "function",
        name: "escalate_to_human",
        description: "Escalate the ticket to a human agent. Use this if the user is frustrated, asks for a human, or if the issue requires physical intervention.",
        parameters: {
            type: "object",
            properties: {
                reason: {
                    type: "string",
                    description: "The reason for escalation (e.g., 'User request', 'Complex hardware failure').",
                },
            },
            required: ["reason"],
        },
    },
    {
        type: "function",
        name: "update_ticket_priority",
        description: "Update the priority of the ticket based on the user's description of urgency or impact.",
        parameters: {
            type: "object",
            properties: {
                priority: {
                    type: "string",
                    enum: ["Low", "Medium", "High", "Critical"],
                    description: "The new priority level.",
                },
            },
            required: ["priority"],
        },
    },
];

// 2. Main Controller Logic
exports.postMessage = async (req, res) => {
    const { ticketId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Contact ID from JWT

    try {
        // A. Save USER Message to DB
        // We do this first so the user's message is safely recorded.
        await supabase.from('ticket_messages').insert([{
            ticket_id: ticketId,
            sender_contact_id: userId,
            content: content,
            message_type: 'text'
        }]);

        // B. Fetch Context & History
        // 1. Get Org Name
        const { data: ticketData } = await supabase
            .from('support_tickets')
            .select(`organizations (name)`)
            .eq('ticket_id', ticketId)
            .single();

        const orgName = ticketData?.organizations?.name || "our client";

        // 2. Fetch Message History for Context (Last 10 messages)
        const { data: historyData } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('message_time', { ascending: false })
            .limit(10); // Limit context window

        // Format history for OpenAI Input
        // The API likely expects a list of message objects.
        // We reverse it to be chronological (Oldest -> Newest)
        const conversationHistory = (historyData || []).reverse().map(msg => {
            if (msg.sender_contact_id) {
                return { role: "user", content: msg.content };
            } else {
                return { role: "assistant", content: msg.title || msg.content }; // Use content for now
            }
        });

        // The current user message is already in DB, but the 'history' query might miss it
        // if it happened in the same millisecond or if we rely on the input body.
        // To be safe and explicit, let's strictly pass the history read from DB (which includes the new msg usually)
        // OR manually append the current message if we filtered it out.
        // Since we just inserted it, let's just use the `conversationHistory` we fetched.
        // Wait, we just inserted it. It MIGHT show up in the select if we await properly.
        // Let's rely on the explicit input format: History + Current Message.
        // Actually, if we use the "Responses" API, we pass `input`.

        const DYNAMIC_INSTRUCTIONS = `
        You are the Tier-1 IT Support Agent for ${orgName}.
        - Context: You are talking to an employee of ${orgName}.
        - Goal: Solve simple issues, gather information for complex issues, or use the 'escalate_to_human' tool if you cannot.
        - Constraints: Do NOT invent technical steps.
        - Tone: Professional, helpful, and concise.
        - Formatting: Use Markdown for lists or code blocks.
        `;

        // C. Call OpenAI Responses API
        // NOTE: This uses the new `client.responses.create` structure found in the SDK v6+
        const response = await openai.responses.create({
            model: "gpt-5",
            tools: TOOLS,
            instructions: DYNAMIC_INSTRUCTIONS,
            input: conversationHistory, // Pass the full history including the latest user message
        });

        console.log("FULL OPENAI RESPONSE:", JSON.stringify(response, null, 2));

        // D. Process Output Items
        // The API returns a list of output items in the 'output' field
        let aiResponseText = "";
        let toolResponseText = "";

        // Log to be sure we see what we are processing
        const items = response.output || response.output_items || [];

        if (items.length > 0) {
            for (const item of items) {

                // --- Type: MESSAGE (Text) ---
                if (item.type === "message" && item.role === "assistant") {
                    // Extract text content
                    // Content can be specific string or array of content parts
                    const content = item.content;
                    if (Array.isArray(content)) {
                        aiResponseText += content.map(c => c.text || c.value || '').join('');
                    } else if (typeof content === 'string') {
                        aiResponseText += content;
                    }
                }

                // --- Type: FUNCTION CALL (Tools) ---
                else if (item.type === "function_call" || item.type === "tool_call") {
                    // Handle tool calls (structure depends on exact API version)
                    // Checking for both standard structures
                    const call = item.function_call || item.tool_call || item;
                    const functionName = call.name || call.function?.name;
                    const argsString = call.arguments || call.function?.arguments;

                    if (functionName && argsString) {
                        const args = JSON.parse(argsString);

                        if (functionName === "escalate_to_human") {
                            await supabase
                                .from('support_tickets')
                                .update({ requires_human_agent: true })
                                .eq('ticket_id', ticketId);
                            toolResponseText = `Ticket escalated. Reason: ${args.reason}`;
                        }
                        else if (functionName === "update_ticket_priority") {
                            const priorityMap = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
                            const newPriorityId = priorityMap[args.priority] || 2;

                            await supabase
                                .from('support_tickets')
                                .update({ priority_id: newPriorityId })
                                .eq('ticket_id', ticketId);
                            toolResponseText = `Updated priority to ${args.priority}.`;
                        }

                        // Log the tool event
                        await supabase.from('ticket_messages').insert([{
                            ticket_id: ticketId,
                            sender_agent_id: 1,
                            content: toolResponseText,
                            message_type: 'event',
                            response_id: response.id
                        }]);
                    }
                }
            }
        }

        // E. Save AI Text Response (if any)
        // Only save if we got text back. Tool calls handled above.
        if (aiResponseText) {
            await supabase.from('ticket_messages').insert([{
                ticket_id: ticketId,
                sender_agent_id: 1,
                content: aiResponseText,
                message_type: 'text',
                response_id: response.id
            }]);
        }

        // F. Send Response to Client
        // We return the text (or tool result) so the UI can update immediately
        // without waiting for a subscription/poll.
        const finalResponse = aiResponseText || toolResponseText;

        res.status(201).json({
            userMessage: content,
            aiResponse: finalResponse
        });

    } catch (err) {
        console.error('Agent/OpenAI Error:', err);
        res.status(500).json({ error: 'Failed to process message' });
    }
};