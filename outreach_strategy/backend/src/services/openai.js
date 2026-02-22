import OpenAI from 'openai';
import { getFullGTMContext } from '../data/gtm-data.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const gtmContext = getFullGTMContext();

const systemPrompt = `You are an AI assistant specialized in CallSphere's GTM (Go-To-Market) outreach strategy. You have deep knowledge of:

1. CallSphere's product: AI-powered voice and chat agents for inbound customer communications
2. Five target industries: Healthcare & Dental, HVAC & Field Services, Logistics & Delivery, IT Support & MSPs, Real Estate & Property Management
3. Ten market segments with detailed buyer personas, pain profiles, urgency triggers, Apollo filters, and messaging strategies

Your role is to help sales and marketing teams:
- Understand target segments and their pain points
- Craft personalized outreach messages
- Identify the right buyer personas and titles
- Suggest Apollo filters for lead generation
- Provide messaging guidance (what to say and what NOT to say)
- Answer any questions about the GTM strategy

Be specific, actionable, and reference the exact data from the playbook when relevant.

Here is the complete GTM playbook data:

${gtmContext}

When answering:
- Be concise but thorough
- Reference specific segments, titles, and metrics when relevant
- If asked about a specific industry or segment, provide detailed information
- If asked to help craft messaging, follow the "Message Fit" guidelines for that segment
- Always consider the "Do NOT Say" guidance to avoid common mistakes`;

export async function getChatResponse(userMessage, chatHistory = []) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
}
