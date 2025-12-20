import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, issueDescription, ticketId } = await request.json();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Generate a short, descriptive title (max 50 characters) for this support conversation based on the user\'s issue. Make it clear and specific. Examples: "WiFi Connection Issue", "Password Reset Help", "Email Setup Problem". Return ONLY the title, no quotes or extra text.',
        },
        {
          role: 'user',
          content: `Based on this conversation, generate a title:\n\n${messages}\n\nIssue: ${issueDescription}\n${ticketId ? `Ticket ID: ${ticketId}` : ''}\n\nTitle:`,
        },
      ],
      max_tokens: 30,
      temperature: 0.7,
    });

    let title = response.choices[0].message.content?.trim() || '';
    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '');
    // Limit to 50 characters
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    return NextResponse.json({ title: title || 'New Conversation' });
  } catch (error: any) {
    console.error('Error generating title:', error);
    return NextResponse.json({ title: 'New Conversation' }, { status: 500 });
  }
}

