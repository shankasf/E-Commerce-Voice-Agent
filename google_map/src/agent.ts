/*
LEGACY IMPLEMENTATION (kept temporarily for reference)
This file previously used Chat Completions directly.
The active implementation is below and uses the OpenAI Agents SDK + Responses API.
 

import OpenAI from 'openai';
import { config } from './config';

// OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Message types for chat history
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallResult[];
}

export interface ToolCallResult {
  toolName: string;
  input: Record<string, any>;
  output: any;
}

// Google Maps MCP Tools definitions
const GOOGLE_MAPS_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_places',
      description: 'Search for places on Google Maps. Returns information about places including names, addresses, ratings, reviews, photos, and more.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query for places (e.g., "restaurants in New York", "hotels near Times Square", "coffee shops in San Francisco")',
          },
          location: {
            type: 'string',
            description: 'Optional location to center the search (e.g., "New York, NY", "37.7749,-122.4194")',
          },
          radius: {
            type: 'number',
            description: 'Optional search radius in meters (max 50000)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_weather',
      description: 'Get current weather conditions and forecasts for a location.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for (e.g., "New York, NY", "Paris, France")',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compute_routes',
      description: 'Calculate driving or walking routes between two locations. Returns distance and duration information.',
      parameters: {
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: 'The starting location (e.g., "New York, NY", "123 Main St, Boston")',
          },
          destination: {
            type: 'string',
            description: 'The destination location',
          },
          mode: {
            type: 'string',
            enum: ['driving', 'walking'],
            description: 'The travel mode (default: driving)',
          },
        },
        required: ['origin', 'destination'],
      },
    },
  },
];

// System prompt for the agent
const SYSTEM_PROMPT = `You are a helpful AI assistant specializing in Google Maps and location-based queries. You can help users:

1. **Search Places**: Find restaurants, hotels, attractions, businesses, and any type of place on Google Maps
2. **Get Weather**: Look up current weather conditions and forecasts for any location
3. **Calculate Routes**: Get driving or walking directions between locations with distance and duration

When users ask about places, locations, directions, or weather, use the appropriate tool to get accurate information.

Be conversational, helpful, and provide detailed responses based on the tool results. Format your responses nicely with relevant details like:
- Place names, addresses, ratings, and reviews
- Weather conditions, temperatures, and forecasts  
- Route distances, durations, and travel modes

If a user's request is unclear, ask clarifying questions to better understand what they're looking for.`;

// Call Google Maps MCP server via HTTP
async function callMCPTool(toolName: string, args: Record<string, any>): Promise<any> {
  const mcpEndpoint = 'https://mapstools.googleapis.com/mcp';
  
  try {
    // For now, we'll use the existing Places API as fallback
    // The MCP server requires OAuth or API key setup
    const response = await fetch(mcpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googleMapsApiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP call failed: ${response.status}`);
    }

    const result = await response.json() as any;
    return result.result || result;
  } catch (error) {
    console.error('MCP tool call error:', error);
    // Fallback to our local Places API implementation
    return await fallbackToolCall(toolName, args);
  }
}

// Fallback to local Places API when MCP is unavailable
async function fallbackToolCall(toolName: string, args: Record<string, any>): Promise<any> {
  const placesApiBase = 'https://places.googleapis.com/v1';
  
  switch (toolName) {
    case 'search_places': {
      const response = await fetch(`${placesApiBase}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.googleMapsApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types,places.websiteUri,places.internationalPhoneNumber,places.regularOpeningHours,places.photos,places.reviews,places.googleMapsUri',
        },
        body: JSON.stringify({
          textQuery: args.query,
          locationBias: args.location ? {
            circle: {
              center: parseLocation(args.location),
              radius: args.radius || 5000,
            },
          } : undefined,
          maxResultCount: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`Places API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return formatPlacesResult(data.places || []);
    }

    case 'lookup_weather': {
      // Weather data would require a weather API
      return {
        location: args.location,
        message: 'Weather lookup requires additional API integration. For now, please check weather.com or a similar service.',
        suggestion: 'I can help you find places in this location instead!',
      };
    }

    case 'compute_routes': {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.googleMapsApiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs',
        },
        body: JSON.stringify({
          origin: { address: args.origin },
          destination: { address: args.destination },
          travelMode: args.mode?.toUpperCase() || 'DRIVE',
        }),
      });

      if (!response.ok) {
        throw new Error(`Routes API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return formatRoutesResult(data.routes || [], args);
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// Parse location string to coordinates if needed
function parseLocation(location: string): { latitude: number; longitude: number } | undefined {
  const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return {
      latitude: parseFloat(coordMatch[1]),
      longitude: parseFloat(coordMatch[2]),
    };
  }
  return undefined;
}

// Format places result for better readability
function formatPlacesResult(places: any[]): any {
  return {
    count: places.length,
    places: places.map((place, index) => ({
      rank: index + 1,
      name: place.displayName?.text || 'Unknown',
      address: place.formattedAddress || 'N/A',
      rating: place.rating ? `${place.rating}/5 (${place.userRatingCount || 0} reviews)` : 'No rating',
      priceLevel: place.priceLevel || 'N/A',
      phone: place.internationalPhoneNumber || 'N/A',
      website: place.websiteUri || 'N/A',
      googleMapsUrl: place.googleMapsUri || 'N/A',
      types: place.types?.slice(0, 3) || [],
      openNow: place.regularOpeningHours?.openNow ? 'Open' : 'Closed',
      topReview: place.reviews?.[0]?.text?.text?.substring(0, 200) || null,
    })),
  };
}

// Format routes result
function formatRoutesResult(routes: any[], args: Record<string, any>): any {
  if (!routes.length) {
    return { error: 'No routes found' };
  }

  const route = routes[0];
  const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');
  const distanceKm = (route.distanceMeters || 0) / 1000;
  const distanceMiles = distanceKm * 0.621371;

  return {
    origin: args.origin,
    destination: args.destination,
    mode: args.mode || 'driving',
    distance: {
      kilometers: distanceKm.toFixed(1),
      miles: distanceMiles.toFixed(1),
    },
    duration: {
      minutes: Math.round(durationSeconds / 60),
      formatted: formatDuration(durationSeconds),
    },
  };
}

// Format duration in human readable format
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

// Session storage for chat history
const sessions: Map<string, ChatMessage[]> = new Map();

// Get or create session
export function getSession(sessionId: string): ChatMessage[] {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId)!;
}

// Clear session
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Main chat function
export async function chat(sessionId: string, userMessage: string): Promise<ChatMessage> {
  const history = getSession(sessionId);
  
  // Add user message to history
  const userMsg: ChatMessage = {
    role: 'user',
    content: userMessage,
    timestamp: new Date(),
  };
  history.push(userMsg);

  // Build messages for OpenAI
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  ];

  try {
    // Call OpenAI with tools
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Using gpt-4o as gpt-5.2 may not exist yet
      messages,
      tools: GOOGLE_MAPS_TOOLS,
      tool_choice: 'auto',
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    let assistantContent = choice.message.content || '';
    const toolCalls: ToolCallResult[] = [];

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      // Add assistant message with tool calls
      toolResults.push({
        role: 'assistant',
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
      } as any);

      // Execute each tool call
      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        
        const toolOutput = await callMCPTool(toolName, toolArgs);
        
        toolCalls.push({
          toolName,
          input: toolArgs,
          output: toolOutput,
        });

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolOutput, null, 2),
        } as any);
      }

      // Get final response with tool results
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [...messages, ...toolResults],
        max_tokens: 4096,
      });

      assistantContent = finalResponse.choices[0].message.content || '';
    }

    // Create assistant message
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
    
    history.push(assistantMsg);
    return assistantMsg;

  } catch (error: any) {
    console.error('Chat error:', error);
    
    const errorMsg: ChatMessage = {
      role: 'assistant',
      content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
      timestamp: new Date(),
    };
    
    history.push(errorMsg);
    return errorMsg;
  }
}

// Get full chat history for a session
export function getChatHistory(sessionId: string): ChatMessage[] {
  return getSession(sessionId);
}

*/

// -----------------------------------------------------------------------------
// OpenAI Agents SDK (TypeScript) + Responses API (gpt-5.2)
// -----------------------------------------------------------------------------

import { Agent, MemorySession, run, tool } from '@openai/agents';
import { z } from 'zod';
import { AsyncLocalStorage } from 'node:async_hooks';
import { config } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallResult[];
}

export interface ToolCallResult {
  toolName: string;
  input: Record<string, any>;
  output: any;
}

type SessionState = {
  session: MemorySession;
  history: ChatMessage[];
};

const sessions: Map<string, SessionState> = new Map();

// Ensure Agents SDK can read the API key via standard env var.
if (!process.env.OPENAI_API_KEY && config.openaiApiKey) {
  process.env.OPENAI_API_KEY = config.openaiApiKey;
}

// Capture tool calls per chat request (used by UI badges + exports).
const toolCallStore = new AsyncLocalStorage<ToolCallResult[]>();

function recordToolCall(toolName: string, input: Record<string, any>, output: any) {
  const store = toolCallStore.getStore();
  if (store) {
    store.push({ toolName, input, output });
  }
}

// System prompt for the agent
const SYSTEM_PROMPT = `You are a helpful AI assistant specializing in Google Maps and location-based queries. You can help users:

1. **Search Places**: Find restaurants, hotels, attractions, businesses, and any type of place on Google Maps
2. **Get Weather**: Look up current weather conditions and forecasts for any location
3. **Calculate Routes**: Get driving or walking routes between locations with distance and duration

When users ask about places, locations, directions, or weather, use the appropriate tool to get accurate information.

When you use Google Maps grounding results, prefer returning a short list with key details (name, address, rating) and include any Google Maps links returned by the tool.

If a user's request is unclear, ask 1-2 clarifying questions.`;

// --- Tool implementations (MCP first, fallback to direct Maps APIs) ---

async function callMapsGroundingLiteMcp(toolName: string, args: Record<string, any>): Promise<any> {
  const mcpEndpoint = 'https://mapstools.googleapis.com/mcp';

  const response = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.googleMapsApiKey,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Maps MCP call failed: ${response.status}`);
  }

  const result = (await response.json()) as any;
  if (result?.error) {
    throw new Error(result.error?.message || 'Maps MCP tool error');
  }

  return result?.result ?? result;
}

function parseLocation(location: string): { latitude: number; longitude: number } | undefined {
  const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return {
      latitude: parseFloat(coordMatch[1]),
      longitude: parseFloat(coordMatch[2]),
    };
  }
  return undefined;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

function formatPlacesResult(places: any[]): any {
  return {
    count: places.length,
    places: places.map((place, index) => ({
      rank: index + 1,
      name: place.displayName?.text || place.name || 'Unknown',
      address: place.formattedAddress || 'N/A',
      rating: place.rating ? `${place.rating}/5 (${place.userRatingCount || 0} reviews)` : 'No rating',
      phone: place.internationalPhoneNumber || 'N/A',
      website: place.websiteUri || 'N/A',
      googleMapsUrl: place.googleMapsUri || place.googleMapsLinks?.placeUrl || 'N/A',
      types: place.types?.slice(0, 3) || [],
      openNow: place.regularOpeningHours?.openNow === true ? 'Open' : (place.regularOpeningHours?.openNow === false ? 'Closed' : 'Unknown'),
    })),
  };
}

function formatRoutesResult(routes: any[], args: Record<string, any>): any {
  if (!routes.length) {
    return { error: 'No routes found' };
  }

  const route = routes[0];
  const durationSeconds = parseInt(route.duration?.replace('s', '') || '0', 10);
  const distanceKm = (route.distanceMeters || 0) / 1000;
  const distanceMiles = distanceKm * 0.621371;

  return {
    origin: args.origin,
    destination: args.destination,
    mode: args.mode || 'driving',
    distance: {
      kilometers: distanceKm.toFixed(1),
      miles: distanceMiles.toFixed(1),
    },
    duration: {
      minutes: Math.round(durationSeconds / 60),
      formatted: formatDuration(durationSeconds),
    },
  };
}

async function fallbackToolCall(toolName: string, args: Record<string, any>): Promise<any> {
  const placesApiBase = 'https://places.googleapis.com/v1';

  switch (toolName) {
    case 'search_places': {
      const response = await fetch(`${placesApiBase}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.googleMapsApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.internationalPhoneNumber,places.regularOpeningHours,places.googleMapsUri',
        },
        body: JSON.stringify({
          textQuery: args.query,
          locationBias: args.location
            ? {
                circle: {
                  center: parseLocation(args.location),
                  radius: args.radius || 5000,
                },
              }
            : undefined,
          maxResultCount: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`Places API error: ${response.status}`);
      }

      const data = (await response.json()) as any;
      return formatPlacesResult(data.places || []);
    }

    case 'lookup_weather': {
      return {
        location: args.location,
        message:
          'Weather lookup requires additional API integration. If you want, I can add Open-Meteo or another weather API next.',
      };
    }

    case 'compute_routes': {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.googleMapsApiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: { address: args.origin },
          destination: { address: args.destination },
          travelMode: (args.mode || 'driving').toUpperCase(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Routes API error: ${response.status}`);
      }

      const data = (await response.json()) as any;
      return formatRoutesResult(data.routes || [], args);
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function callTool(toolName: string, args: Record<string, any>): Promise<any> {
  try {
    return await callMapsGroundingLiteMcp(toolName, args);
  } catch (err) {
    return await fallbackToolCall(toolName, args);
  }
}

const searchPlacesTool = tool({
  name: 'search_places',
  description: 'Search for places and return a summary plus Google Maps source links when available.',
  parameters: z.object({
    query: z.string(),
    // NOTE: The Responses API "strict" tool schema requires every property to be listed in `required`.
    // To keep parameters effectively optional, we make them required-but-nullable.
    location: z.string().nullable(),
    radius: z.number().int().positive().nullable(),
  }),
  execute: async (input) => {
    const normalized: Record<string, any> = {
      query: input.query,
      ...(input.location == null ? {} : { location: input.location }),
      ...(input.radius == null ? {} : { radius: input.radius }),
    };

    const output = await callTool('search_places', normalized);
    recordToolCall('search_places', input, output);
    return output;
  },
});

const lookupWeatherTool = tool({
  name: 'lookup_weather',
  description: 'Look up weather for a location.',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async (input) => {
    const output = await callTool('lookup_weather', input);
    recordToolCall('lookup_weather', input, output);
    return output;
  },
});

const computeRoutesTool = tool({
  name: 'compute_routes',
  description: 'Compute driving or walking route distance and duration between two locations.',
  parameters: z.object({
    origin: z.string(),
    destination: z.string(),
    // Same strict-schema constraint as above.
    mode: z.enum(['driving', 'walking']).nullable(),
  }),
  execute: async (input) => {
    const normalized: Record<string, any> = {
      origin: input.origin,
      destination: input.destination,
      ...(input.mode == null ? {} : { mode: input.mode }),
    };

    const output = await callTool('compute_routes', normalized);
    recordToolCall('compute_routes', input, output);
    return output;
  },
});

const mapsAgent = new Agent({
  name: 'Google Maps Agent',
  instructions: SYSTEM_PROMPT,
  model: 'gpt-5.2',
  tools: [searchPlacesTool, lookupWeatherTool, computeRoutesTool],
});

function getOrCreateState(sessionId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const state: SessionState = {
    session: new MemorySession(),
    history: [],
  };
  sessions.set(sessionId, state);
  return state;
}

export function getSession(sessionId: string): ChatMessage[] {
  return getOrCreateState(sessionId).history;
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export async function chat(sessionId: string, userMessage: string): Promise<ChatMessage> {
  const state = getOrCreateState(sessionId);

  const userMsg: ChatMessage = {
    role: 'user',
    content: userMessage,
    timestamp: new Date(),
  };
  state.history.push(userMsg);

  try {
    const assistantMsg = await toolCallStore.run([], async () => {
      const result: any = await run(mapsAgent, userMessage, {
        session: state.session,
      });

      const toolCalls = toolCallStore.getStore() ?? [];

      const msg: ChatMessage = {
        role: 'assistant',
        content: result?.finalOutput ?? '',
        timestamp: new Date(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
      return msg;
    });

    state.history.push(assistantMsg);
    return assistantMsg;
  } catch (error: any) {
    const errorMsg: ChatMessage = {
      role: 'assistant',
      content: `I ran into an error while calling the model: ${error?.message || 'Unknown error'}`,
      timestamp: new Date(),
    };
    state.history.push(errorMsg);
    return errorMsg;
  }
}

export async function chatStream(
  sessionId: string,
  userMessage: string,
  onDelta: (delta: string) => void | Promise<void>,
  signal?: AbortSignal,
): Promise<ChatMessage> {
  const state = getOrCreateState(sessionId);

  const userMsg: ChatMessage = {
    role: 'user',
    content: userMessage,
    timestamp: new Date(),
  };
  state.history.push(userMsg);

  try {
    const assistantMsg = await toolCallStore.run([], async () => {
      const streamed: any = await run(mapsAgent, userMessage, {
        session: state.session,
        stream: true,
        signal,
      });

      let content = '';
      try {
        // Consume the streamed run events directly to ensure the run actually executes.
        for await (const event of streamed as AsyncIterable<any>) {
          if (event?.type === 'raw_model_stream_event' && event?.data?.type === 'output_text_delta') {
            const delta = event.data.delta;
            if (!delta) continue;
            content += delta;
            await onDelta(delta);
          }
        }
      } catch {
        // If streaming consumption fails, we'll fall back to finalOutput below.
      }

      await streamed.completed;
      const finalOutput = streamed?.finalOutput;
      if (typeof finalOutput === 'string' && finalOutput && finalOutput.length >= content.length) {
        content = finalOutput;
      }
      const toolCalls = toolCallStore.getStore() ?? [];

      const msg: ChatMessage = {
        role: 'assistant',
        content,
        timestamp: new Date(),
        toolCalls,
      };

      state.history.push(msg);
      return msg;
    });

    return assistantMsg;
  } catch (error) {
    console.error('Chat stream error:', error);
    const errMsg: ChatMessage = {
      role: 'assistant',
      content: error instanceof Error ? `Error: ${error.message}` : 'Error: chat failed',
      timestamp: new Date(),
    };
    state.history.push(errMsg);
    return errMsg;
  }
}

export function getChatHistory(sessionId: string): ChatMessage[] {
  return getSession(sessionId);
}
