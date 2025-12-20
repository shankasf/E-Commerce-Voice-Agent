// OpenAI Responses API Client

import { ResponseParams, ResponseResult } from './types';

const openaiApiKey = process.env.OPENAI_API_KEY || '';

// OpenAI Responses API helper
export async function createResponse(params: ResponseParams): Promise<ResponseResult> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      input: params.input,
      instructions: params.instructions,
      temperature: params.temperature ?? 1,
      max_output_tokens: params.max_output_tokens,
      text: params.text,
      previous_response_id: params.previous_response_id,
      store: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  
  // Extract text from output
  let outputText = '';
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.type === 'output_text') {
            outputText += content.text;
          }
        }
      }
    }
  }

  return { output_text: outputText, id: data.id };
}

// Default model for AI agents
export const DEFAULT_MODEL = 'gpt-5.2';
