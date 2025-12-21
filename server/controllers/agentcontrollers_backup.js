
const supabase = require('../config/supabaseclient');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//const SYSTEM_INSTRUCTIONS = `
//You are "AI Support", a tier-1 IT help desk agent .
// - Your Goal: Resolve simple issues (password resets, wifi) or gather info for complex ones.
// - Tone: Professional, concise, and empathetic.
// - Constraints: Do NOT invent technical steps. If unsure, just say you don't know.
// - Formatting: Use Markdown for lists or code blocks.
//`;

// 1. Define Tools

const TOOLS = [
    {
        type: "function",
        function: {
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
    },
    {
        type: "function",
        function: {
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
    },
];

// 2. Main Controller Logic
exports.postMessage = async (req, res) => {
    const { ticketId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    try {
        // A. Save USER Message to DB
        await supabase.from('ticket_messages').insert([{
            ticket_id: ticketId,
            sender_contact_id: userId,
            content: content,
            message_type: 'text'
        }]);

        // B. Fetch Context (Org Name) for Dynamic Prompt
        const { data: ticketData } = await supabase
            .from('support_tickets')
            .select(`organizations (name)`)
            .eq('ticket_id', ticketId)
            .single();

        const orgName = ticketData.organizations?.name || "our client";

        // Dynamic Prompt for Multi-Tenancy
        const DYNAMIC_INSTRUCTIONS = `
        You are the Tier-1 IT Support Agent for ${orgName}.
        - Context: You are talking to an employee of ${orgName}.
        - Goal: Solve simple issues, gather information for complex issues, or use the 'escalate_to_human' tool if you cannot.
        - Constraints: Do NOT invent technical steps.
        - Tone: Professional, helpful, and concise.
        - Formatting: Use Markdown for lists or code blocks
        `;

        // C. Find the chain link (The ID of the LAST AI message)
        // We look for the most recent message in this ticket that has a response_id
        const { data: lastAiMsg } = await supabase
            .from('ticket_messages')
            .select('response_id')
            .eq('ticket_id', ticketId)
            .not('response_id', 'is', null) // Only look for rows with an ID
            .order('message_time', { ascending: false }) // Newest first
            .limit(1)
            .maybeSingle();

        // D. Configure OpenAI Request
        const responseConfig = {
            model: "gpt-5",
            input: content,
            tools: TOOLS,
            reasoning: { effort: "medium" },
            store: true
        };

        if (lastAiMsg && lastAiMsg.response_id) {
            // Continue the conversation chain
            responseConfig.previous_response_id = lastAiMsg.response_id;
        } else {
            // Start fresh with instructions
            responseConfig.instructions = DYNAMIC_INSTRUCTIONS;
        }

        // E. Call OpenAI
        const aiResponse = await openai.responses.create(responseConfig);

        // F. Check for Output (Text vs Tool)
        // Note: The Responses API output structure varies slightly by SDK version.
        // We check 'output_items' to see if a tool was called.
        const outputItem = aiResponse.output_items[0];


        // --- CASE 1: TOOL CALL ---
        if (outputItem.type === "function_call" || outputItem.function_call) {
            const functionName = outputItem.function_call.name;
            const args = JSON.parse(outputItem.function_call.arguments);
            let toolResultText = "";

            if (functionName === "escalate_to_human") {
                // Execute DB Update: Flag for Human
                await supabase
                    .from('support_tickets')
                    .update({ requires_human_agent: true })
                    .eq('ticket_id', ticketId);

                toolResultText = `Ticket escalated. Reason: ${args.reason}. A human agent will take over shortly.`;
            }
            else if (functionName === "update_ticket_priority") {
                // Execute DB Update: Change Priority
                // Simple map: Low=1, Medium=2, High=3, Critical=4 (Adjust based on your DB IDs)
                const priorityMap = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
                const newPriorityId = priorityMap[args.priority] || 2;

                await supabase
                    .from('support_tickets')
                    .update({ priority_id: newPriorityId })
                    .eq('ticket_id', ticketId);

                toolResultText = `I have updated the ticket priority to ${args.priority}.`;
            }

            // Save the "Action" as a message event
            await supabase.from('ticket_messages').insert([{
                ticket_id: ticketId,
                sender_agent_id: 1, // AI Agent ID
                content: toolResultText,
                message_type: 'event', // Different type for UI styling
                response_id: aiResponse.id
            }]);

            return res.status(201).json({
                userMessage: content,
                aiResponse: toolResultText
            });
        }

        // --- CASE 2: NORMAL TEXT RESPONSE ---
        const aiText = aiResponse.output_text;

        await supabase.from('ticket_messages').insert([{
            ticket_id: ticketId,
            sender_agent_id: 1,
            content: aiText,
            message_type: 'text',
            response_id: aiResponse.id
        }]);

        //const aiText = aiResponse.output_text;
        const newResponseId = aiResponse.id; // Capture the specific ID for this reply

        // 5. Save AI Reply (WITH the new ID)
        await supabase.from('ticket_messages').insert([{
            ticket_id: ticketId,
            sender_agent_id: 1,
            content: aiText,
            message_type: 'text',
            response_id: newResponseId // <--- Storing it right where it belongs!
        }]);

        res.status(201).json({
            userMessage: content,
            aiResponse: aiText
        });

    } catch (err) {
        console.error('Agent Error:', err);
        // Graceful handling if no previous message found (e.g., .single() fails on empty)
        // In production, you'd add a specific check for "Row not found" vs "DB Error"
        res.status(500).json({ error: 'Failed to process message' });
    }
};