import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchKnowledgeBase } from '@/lib/ai-agents/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, ticketId, deviceDetails, conversationHistory } = await request.json();

    // Build system prompt for powerful computer/server diagnoser
    let systemPrompt = `You are a powerful and experienced computer and server diagnoser. Your role is to help human support agents troubleshoot technical issues step-by-step.

CRITICAL GUIDELINES:
1. Provide CLEAR, STEP-BY-STEP troubleshooting guides (NOT yes/no questions)
2. Include specific commands for PowerShell (Windows), Terminal (Linux/Mac), or Command Prompt when relevant
3. Be technical but clear - you're helping agents, not end users
4. Reference device details when available
5. Search knowledge base for similar issues before providing solutions
6. Provide actionable steps that agents can follow immediately

RESPONSE FORMAT:
- Number each step clearly
- Include exact commands to run when applicable
- Explain what each step does
- Provide expected outcomes
- If a step fails, provide alternative approaches

Example format:
"Step 1: Check system logs
Run this PowerShell command:
Get-EventLog -LogName System -Newest 50 | Format-Table -AutoSize

This will show the last 50 system events. Look for any errors or warnings.

Step 2: Verify network connectivity
Run: ping 8.8.8.8
If this fails, the issue is network-related..."`;

    // Add device context if available
    if (deviceDetails?.device) {
      const device = deviceDetails.device;
      systemPrompt += `\n\nDEVICE CONTEXT:
- Device ID: ${device.device_id}
- Asset Name: ${device.asset_name || 'N/A'}
- Host Name: ${device.host_name || 'N/A'}
- Status: ${device.status || 'N/A'}
- OS: ${device.os?.name || 'N/A'}
- OS Version: ${device.os_version || 'N/A'}
- Manufacturer: ${device.manufacturer?.name || 'N/A'}
- Model: ${device.model?.name || 'N/A'}
- Device Type: ${device.device_type?.name || 'N/A'}
- Public IP: ${device.public_ip || 'N/A'}
- Last Reported: ${device.last_reported_time || 'N/A'}`;
    }

    if (deviceDetails?.ticket) {
      systemPrompt += `\n\nTICKET CONTEXT:
- Ticket ID: ${deviceDetails.ticket.ticket_id}
- Subject: ${deviceDetails.ticket.subject || 'N/A'}
- Description: ${deviceDetails.ticket.description || 'N/A'}
- Organization: ${deviceDetails.ticket.organization?.name || 'N/A'}`;
    }

    // Search knowledge base for similar issues
    let knowledgeBaseContext = '';
    if (message && message.length > 10) {
      // Extract key terms from the message for searching
      const searchTerms = message.split(' ').filter(word => word.length > 4).slice(0, 3).join(' ');
      const kbResults = await searchKnowledgeBase(searchTerms || message.substring(0, 50));
      
      if (kbResults && kbResults.length > 0) {
        knowledgeBaseContext = '\n\nSIMILAR ISSUES FOUND IN KNOWLEDGE BASE:\n';
        kbResults.slice(0, 3).forEach((article: any, idx: number) => {
          knowledgeBaseContext += `${idx + 1}. ${article.title || 'Untitled'}\n`;
          if (article.content) {
            const preview = article.content.substring(0, 200);
            knowledgeBaseContext += `   ${preview}${article.content.length > 200 ? '...' : ''}\n`;
          }
        });
        knowledgeBaseContext += '\nReference these solutions when providing troubleshooting steps.';
      }
    }

    systemPrompt += knowledgeBaseContext;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiMessage = response.choices[0].message.content || 'I apologize, but I could not generate a response.';

    return NextResponse.json({
      message: aiMessage,
      hasButtons: false,
    });
  } catch (error: any) {
    console.error('Error in chat agent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', message: 'Sorry, I encountered an error. Please try again.' },
      { status: 500 }
    );
  }
}

