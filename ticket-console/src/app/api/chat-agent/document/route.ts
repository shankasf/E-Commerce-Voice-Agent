import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { ticketId, conversationHistory, deviceDetails } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Generate summary document using AI
    const summaryPrompt = `Based on the following conversation history and device details, create a comprehensive resolution document that includes:

1. Problem Summary
2. Root Cause Analysis
3. Step-by-Step Resolution Steps
4. Commands/Code Used (if any)
5. Verification Steps
6. Prevention/Recommendations

CONVERSATION HISTORY:
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

${deviceDetails?.device ? `\nDEVICE DETAILS:\n${JSON.stringify(deviceDetails.device, null, 2)}` : ''}

Create a well-structured markdown document:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a technical documentation expert. Create clear, professional resolution documents.',
        },
        { role: 'user', content: summaryPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const documentContent = response.choices[0].message.content || '';

    // Save document to database (assuming we have a documents table or we'll store in knowledge_articles)
    // For now, we'll store it in a way that can be referenced
    const documentTitle = `Resolution for Ticket #${ticketId} - ${new Date().toLocaleDateString()}`;

    // Try to insert into knowledge_articles if table exists, otherwise create a simple storage
    const { data: knowledgeArticle, error: kbError } = await supabase
      .from('knowledge_articles')
      .insert({
        title: documentTitle,
        content: documentContent,
        category: 'Resolution Documentation',
        tags: [`ticket-${ticketId}`, 'resolution', 'troubleshooting'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // If knowledge_articles doesn't exist, we'll create a simple reference
    let documentId = knowledgeArticle?.article_id || null;

    if (kbError) {
      console.log('Knowledge articles table may not exist, storing reference differently');
      // Store document reference in ticket notes or create a simple document record
      // For now, we'll return the document content and let the frontend handle storage
      documentId = `doc-${ticketId}-${Date.now()}`;
    }

    // Also add a reference to the ticket (if we have a way to link documents to tickets)
    // This could be done via ticket_messages with a special type, or a separate table

    return NextResponse.json({
      documentId,
      title: documentTitle,
      content: documentContent,
      ticketId,
      success: true,
    });
  } catch (error: any) {
    console.error('Error documenting resolution:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

