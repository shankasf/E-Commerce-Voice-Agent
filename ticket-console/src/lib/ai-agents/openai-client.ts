// OpenAI Chat Completions API Client

import { ResponseParams, ResponseResult } from './types';

const openaiApiKey = process.env.OPENAI_API_KEY || '';

// OpenAI Chat Completions API helper
export async function createResponse(params: ResponseParams): Promise<ResponseResult> {
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key to .env.local');
  }

  console.log('[OpenAI] Making API request with model:', params.model);
  console.log('[OpenAI] Input type:', typeof params.input === 'string' ? 'string' : 'array');
  console.log('[OpenAI] Instructions length:', params.instructions?.length || 0);

  try {
    // Convert to Chat Completions format
    const messages: Array<{ role: string; content: string }> = [];
    
    // Add system message if instructions are provided
    if (params.instructions) {
      messages.push({
        role: 'system',
        content: params.instructions
      });
    }
    
    // Add user message(s)
    if (typeof params.input === 'string') {
      messages.push({
        role: 'user',
        content: params.input
      });
    } else if (Array.isArray(params.input)) {
      messages.push(...params.input.map(msg => ({
        role: msg.role || 'user',
        content: msg.content || ''
      })));
    }

    const requestBody: any = {
      model: params.model,
      messages: messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_output_tokens || 500,
    };

    // Add response format if specified
    if (params.text?.format?.type === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    console.log('[OpenAI] Request body:', JSON.stringify({ ...requestBody, messages: messages.length }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[OpenAI] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('[OpenAI] API Error:', errorMessage, errorData);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('[OpenAI] Response received:', {
      id: data.id,
      model: data.model,
      choices: data.choices?.length || 0
    });
    
    // Extract text from Chat Completions response
    const outputText = data.choices?.[0]?.message?.content || '';

    if (!outputText) {
      console.warn('[OpenAI] No output text found in response:', data);
      throw new Error('No output text in OpenAI API response');
    }

    console.log('[OpenAI] Extracted text length:', outputText.length);

    return { output_text: outputText, id: data.id || 'unknown' };
  } catch (error: any) {
    console.error('[OpenAI] Request failed:', error);
    console.error('[OpenAI] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

// Default model for AI agents (can be overridden via env var)
export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
