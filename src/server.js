/**
 * Main Server - Express + WebSocket for Twilio + OpenAI Realtime Voice Agent
 * 
 * Features:
 * - Full OpenAI Realtime API integration with all client events
 * - Robust interruption handling (barge-in support)
 * - Conversation state management
 * - Audio buffer management
 * - Response cancellation and truncation
 * - VAD (Voice Activity Detection) support
 * - Tool/function calling with multi-agent handoffs
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { dashboardRouter } from './dashboard/index.js';
import { triageAgent, infoAgent, catalogAgent, admissionAgent, partyAgent, orderAgent } from './agents/index.js';
import { createCallLog, updateCallLog, endCallLog } from './metrics/call-logs.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-2025-08-28';

// Voice agent configuration
const VOICE_CONFIG = {
    voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
    vadThreshold: 0.5,
    vadPrefixPaddingMs: 300,
    vadSilenceDurationMs: 500,
    maxResponseDurationMs: 30000, // 30 seconds max response
    interruptionDebounceMs: 100, // Debounce rapid interruptions
};

if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required');
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Express App
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard routes
app.use('/dashboard', dashboardRouter);

// Twilio webhook - incoming call
app.post('/twilio/incoming', (req, res) => {
    const { CallSid, From, To } = req.body;
    console.log(`📞 Incoming call: ${CallSid} from ${From} to ${To}`);

    // Return TwiML to connect to WebSocket media stream
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const wsUrl = `wss://${host}/media-stream`;

    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="callSid" value="${CallSid}" />
      <Parameter name="fromNumber" value="${From}" />
    </Stream>
  </Connect>
</Response>`);
});

// Twilio status callback
app.post('/twilio/status', (req, res) => {
    const { CallSid, CallStatus, CallDuration } = req.body;
    console.log(`📊 Call ${CallSid} status: ${CallStatus}, duration: ${CallDuration}s`);
    res.sendStatus(200);
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Server & WebSocket
// ─────────────────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/media-stream' });

// Active sessions map
const sessions = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Voice Session Class - Manages state for each call
// ─────────────────────────────────────────────────────────────────────────────

class VoiceSession {
    constructor(twilioWs, openaiWs, callSid, fromNumber) {
        this.twilioWs = twilioWs;
        this.openaiWs = openaiWs;
        this.callSid = callSid;
        this.fromNumber = fromNumber;
        this.streamSid = null;
        this.callLogId = null;

        // Conversation state
        this.conversationItems = new Map(); // itemId -> item metadata
        this.currentResponseId = null;
        this.isResponseInProgress = false;
        this.lastAssistantItemId = null;

        // Audio tracking for interruption handling
        this.audioBytesSent = 0;
        this.audioStartTime = null;
        this.lastAudioItemId = null;
        this.markQueue = []; // Track marks for audio position
        this.responseStartTimestamp = null;
        this.latestMediaTimestamp = 0;

        // Interruption handling
        this.isInterrupting = false;
        this.interruptionDebounceTimer = null;

        // Tool/function state
        this.toolsUsed = [];
        this.pendingToolCalls = new Map(); // callId -> tool info

        // Transcripts for analytics
        this.transcripts = {
            user: [],
            assistant: []
        };

        // Current agent context
        this.currentAgent = 'triage';
    }

    // Calculate approximate audio duration from bytes (G.711 μ-law: 8kHz, 8-bit)
    getAudioDurationMs(bytes) {
        // G.711: 8000 samples/sec, 1 byte per sample = 8000 bytes/sec
        return Math.floor((bytes / 8000) * 1000);
    }

    // Track audio position for truncation
    trackAudioSent(bytes) {
        if (!this.audioStartTime) {
            this.audioStartTime = Date.now();
        }
        this.audioBytesSent += bytes;
    }

    // Reset audio tracking when response completes or is cancelled
    resetAudioTracking() {
        this.audioBytesSent = 0;
        this.audioStartTime = null;
        this.responseStartTimestamp = null;
    }

    // Get the timestamp of audio actually played
    getPlayedAudioMs() {
        if (!this.responseStartTimestamp) return 0;
        return this.latestMediaTimestamp - this.responseStartTimestamp;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Realtime API Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send session.update to configure the OpenAI session
 */
function sendSessionUpdate(ws, session, config) {
    const tools = config.tools || [];

    ws.send(JSON.stringify({
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: config.instructions || '',
            voice: VOICE_CONFIG.voice,
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
                type: 'server_vad',
                threshold: VOICE_CONFIG.vadThreshold,
                prefix_padding_ms: VOICE_CONFIG.vadPrefixPaddingMs,
                silence_duration_ms: VOICE_CONFIG.vadSilenceDurationMs
            },
            tools: tools.map(t => ({
                type: 'function',
                name: t.name,
                description: t.description,
                parameters: t.parameters || { type: 'object', properties: {} }
            })),
            tool_choice: 'auto'
        }
    }));
}

/**
 * Send response.create to trigger a model response
 */
function sendResponseCreate(ws, options = {}) {
    const event = {
        type: 'response.create',
    };

    if (Object.keys(options).length > 0) {
        event.response = {};

        if (options.instructions) {
            event.response.instructions = options.instructions;
        }
        if (options.modalities) {
            event.response.modalities = options.modalities;
        }
        if (options.conversation) {
            event.response.conversation = options.conversation;
        }
        if (options.metadata) {
            event.response.metadata = options.metadata;
        }
        if (options.input) {
            event.response.input = options.input;
        }
    }

    ws.send(JSON.stringify(event));
}

/**
 * Send response.cancel to stop current response generation
 */
function sendResponseCancel(ws, responseId = null) {
    const event = { type: 'response.cancel' };
    if (responseId) {
        event.response_id = responseId;
    }
    ws.send(JSON.stringify(event));
}

/**
 * Send conversation.item.create to add item to conversation
 */
function sendConversationItemCreate(ws, item, previousItemId = null) {
    const event = {
        type: 'conversation.item.create',
        item
    };
    if (previousItemId) {
        event.previous_item_id = previousItemId;
    }
    ws.send(JSON.stringify(event));
}

/**
 * Send conversation.item.truncate to truncate assistant audio
 */
function sendConversationItemTruncate(ws, itemId, contentIndex, audioEndMs) {
    ws.send(JSON.stringify({
        type: 'conversation.item.truncate',
        item_id: itemId,
        content_index: contentIndex,
        audio_end_ms: audioEndMs
    }));
}

/**
 * Send conversation.item.delete to remove item from conversation
 */
function sendConversationItemDelete(ws, itemId) {
    ws.send(JSON.stringify({
        type: 'conversation.item.delete',
        item_id: itemId
    }));
}

/**
 * Send input_audio_buffer.append to add audio
 */
function sendInputAudioAppend(ws, audioBase64) {
    ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audioBase64
    }));
}

/**
 * Send input_audio_buffer.commit to commit the buffer
 */
function sendInputAudioCommit(ws) {
    ws.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
    }));
}

/**
 * Send input_audio_buffer.clear to discard buffer contents
 */
function sendInputAudioClear(ws) {
    ws.send(JSON.stringify({
        type: 'input_audio_buffer.clear'
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Interruption Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle user interruption (barge-in)
 * This is called when VAD detects user speech while assistant is speaking
 */
async function handleInterruption(session) {
    if (session.isInterrupting) return; // Already handling interruption

    // Debounce rapid interruptions
    if (session.interruptionDebounceTimer) {
        clearTimeout(session.interruptionDebounceTimer);
    }

    session.isInterrupting = true;

    session.interruptionDebounceTimer = setTimeout(async () => {
        console.log('🛑 Handling user interruption (barge-in)');

        const openaiWs = session.openaiWs;
        const twilioWs = session.twilioWs;

        // 1. Cancel any in-progress response
        if (session.isResponseInProgress && session.currentResponseId) {
            sendResponseCancel(openaiWs, session.currentResponseId);
        }

        // 2. Clear Twilio's audio queue by sending a clear message
        if (session.streamSid) {
            twilioWs.send(JSON.stringify({
                event: 'clear',
                streamSid: session.streamSid
            }));
        }

        // 3. Truncate the last assistant audio to what was actually played
        if (session.lastAssistantItemId) {
            const playedMs = session.getPlayedAudioMs();
            if (playedMs > 0) {
                console.log(`✂️ Truncating audio at ${playedMs}ms`);
                sendConversationItemTruncate(
                    openaiWs,
                    session.lastAssistantItemId,
                    0, // content_index
                    playedMs
                );
            }
        }

        // 4. Reset audio tracking
        session.resetAudioTracking();
        session.isResponseInProgress = false;
        session.isInterrupting = false;

    }, VOICE_CONFIG.interruptionDebounceMs);
}

wss.on('connection', async (twilioWs, req) => {
    console.log('🔗 Twilio WebSocket connected');

    let session = null;
    let openaiWs = null;

    // Connect to OpenAI Realtime API
    try {
        openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });
    } catch (error) {
        console.error('❌ Failed to connect to OpenAI:', error);
        twilioWs.close();
        return;
    }

    // Build tools array from all agents
    const allTools = [
        ...Object.values(triageAgent.tools || {}),
        ...Object.values(infoAgent.tools || {}),
        ...Object.values(catalogAgent.tools || {}),
        ...Object.values(admissionAgent.tools || {}),
        ...Object.values(partyAgent.tools || {}),
        ...Object.values(orderAgent.tools || {})
    ].filter(Boolean);

    // Tool name -> execute function map
    const toolMap = {};
    allTools.forEach(tool => {
        if (tool.name && tool.execute) {
            toolMap[tool.name] = tool.execute;
        }
    });

    // OpenAI WebSocket handlers
    openaiWs.on('open', () => {
        console.log('🤖 OpenAI Realtime connected');

        // Configure session with all tools and instructions
        sendSessionUpdate(openaiWs, null, {
            instructions: triageAgent.instructions,
            tools: allTools
        });
    });

    openaiWs.on('message', async (data) => {
        try {
            const event = JSON.parse(data.toString());

            switch (event.type) {
                // ─────────────────────────────────────────────────────────────
                // Session Events
                // ─────────────────────────────────────────────────────────────

                case 'session.created':
                    console.log('✅ OpenAI session created:', event.session?.id);
                    break;

                case 'session.updated':
                    console.log('✅ OpenAI session configured');
                    // Send initial greeting after session is configured
                    sendResponseCreate(openaiWs, {
                        instructions: `Greet the caller warmly. You are the voice agent for Playfunia (Kids4Fun), 
                        a fun indoor play center for kids. Ask how you can help them today with:
                        - Admission tickets and pricing
                        - Party bookings and packages
                        - Product inquiries
                        - Store hours and location info
                        Keep your greeting brief and friendly.`
                    });
                    break;

                // ─────────────────────────────────────────────────────────────
                // Input Audio Buffer Events
                // ─────────────────────────────────────────────────────────────

                case 'input_audio_buffer.committed':
                    console.log('🎤 Audio buffer committed:', event.item_id);
                    if (session) {
                        session.conversationItems.set(event.item_id, {
                            type: 'user_audio',
                            createdAt: Date.now()
                        });
                    }
                    break;

                case 'input_audio_buffer.cleared':
                    console.log('🗑️ Audio buffer cleared');
                    break;

                case 'input_audio_buffer.speech_started':
                    console.log('🎙️ User started speaking');
                    // User started speaking - potential interruption
                    if (session?.isResponseInProgress) {
                        await handleInterruption(session);
                    }
                    break;

                case 'input_audio_buffer.speech_stopped':
                    console.log('🔇 User stopped speaking');
                    break;

                // ─────────────────────────────────────────────────────────────
                // Conversation Item Events
                // ─────────────────────────────────────────────────────────────

                case 'conversation.item.created':
                    console.log(`📝 Item created: ${event.item?.id} (${event.item?.type})`);
                    if (session && event.item) {
                        session.conversationItems.set(event.item.id, {
                            type: event.item.type,
                            role: event.item.role,
                            createdAt: Date.now()
                        });

                        // Track assistant items for truncation
                        if (event.item.role === 'assistant') {
                            session.lastAssistantItemId = event.item.id;
                        }
                    }
                    break;

                case 'conversation.item.truncated':
                    console.log(`✂️ Item truncated: ${event.item_id} at ${event.audio_end_ms}ms`);
                    break;

                case 'conversation.item.deleted':
                    console.log(`🗑️ Item deleted: ${event.item_id}`);
                    if (session) {
                        session.conversationItems.delete(event.item_id);
                    }
                    break;

                case 'conversation.item.input_audio_transcription.completed':
                    console.log(`👤 User: ${event.transcript}`);
                    if (session) {
                        session.transcripts.user.push({
                            text: event.transcript,
                            timestamp: Date.now()
                        });
                    }
                    break;

                case 'conversation.item.input_audio_transcription.failed':
                    console.warn('⚠️ User audio transcription failed:', event.error);
                    break;

                // ─────────────────────────────────────────────────────────────
                // Response Events
                // ─────────────────────────────────────────────────────────────

                case 'response.created':
                    console.log('🚀 Response started:', event.response?.id);
                    if (session) {
                        session.currentResponseId = event.response?.id;
                        session.isResponseInProgress = true;
                        session.responseStartTimestamp = session.latestMediaTimestamp;
                    }
                    break;

                case 'response.done':
                    const status = event.response?.status;
                    console.log(`✅ Response done: ${event.response?.id} (${status})`);
                    if (session) {
                        session.isResponseInProgress = false;
                        session.currentResponseId = null;
                        session.resetAudioTracking();
                    }

                    if (status === 'cancelled') {
                        console.log('🚫 Response was cancelled (likely due to interruption)');
                    } else if (status === 'failed') {
                        console.error('❌ Response failed:', event.response?.status_details);
                    }
                    break;

                case 'response.output_item.added':
                    console.log(`📤 Output item added: ${event.item?.id} (${event.item?.type})`);
                    if (session && event.item?.role === 'assistant') {
                        session.lastAssistantItemId = event.item.id;
                        session.lastAudioItemId = event.item.id;
                    }
                    break;

                case 'response.output_item.done':
                    console.log(`📤 Output item done: ${event.item?.id}`);
                    break;

                case 'response.content_part.added':
                    // Content part started (text or audio)
                    break;

                case 'response.content_part.done':
                    // Content part completed
                    break;

                // ─────────────────────────────────────────────────────────────
                // Audio Output Events
                // ─────────────────────────────────────────────────────────────

                case 'response.audio.delta':
                    // Forward audio to Twilio
                    if (event.delta && session?.streamSid) {
                        // Track audio for interruption handling
                        const audioBytes = Buffer.from(event.delta, 'base64').length;
                        session.trackAudioSent(audioBytes);

                        // Send to Twilio
                        twilioWs.send(JSON.stringify({
                            event: 'media',
                            streamSid: session.streamSid,
                            media: { payload: event.delta }
                        }));

                        // Send mark for tracking audio position
                        const markLabel = `audio_${Date.now()}`;
                        twilioWs.send(JSON.stringify({
                            event: 'mark',
                            streamSid: session.streamSid,
                            mark: { name: markLabel }
                        }));
                        session.markQueue.push({
                            label: markLabel,
                            bytesSent: session.audioBytesSent,
                            timestamp: Date.now()
                        });
                    }
                    break;

                case 'response.audio.done':
                    console.log('🔊 Audio output complete');
                    break;

                case 'response.audio_transcript.delta':
                    // Partial transcript of assistant speech
                    break;

                case 'response.audio_transcript.done':
                    console.log(`🤖 Agent: ${event.transcript}`);
                    if (session) {
                        session.transcripts.assistant.push({
                            text: event.transcript,
                            timestamp: Date.now()
                        });
                    }
                    break;

                // ─────────────────────────────────────────────────────────────
                // Text Output Events
                // ─────────────────────────────────────────────────────────────

                case 'response.text.delta':
                    // Partial text output (for text-only responses)
                    break;

                case 'response.text.done':
                    console.log(`📝 Text output: ${event.text}`);
                    break;

                // ─────────────────────────────────────────────────────────────
                // Function Call Events
                // ─────────────────────────────────────────────────────────────

                case 'response.function_call_arguments.delta':
                    // Partial function arguments (streaming)
                    break;

                case 'response.function_call_arguments.done':
                    // Execute tool
                    const toolName = event.name;
                    const toolArgs = JSON.parse(event.arguments || '{}');
                    const callId = event.call_id;

                    console.log(`🛠️ Tool call: ${toolName}`, toolArgs);
                    if (session) {
                        session.toolsUsed.push(toolName);
                    }

                    try {
                        const toolFn = toolMap[toolName];
                        if (toolFn) {
                            const result = await toolFn(toolArgs);

                            // Send result back to OpenAI
                            sendConversationItemCreate(openaiWs, {
                                type: 'function_call_output',
                                call_id: callId,
                                output: JSON.stringify(result)
                            });

                            // Trigger continuation of response
                            sendResponseCreate(openaiWs);
                        } else {
                            console.warn(`⚠️ Unknown tool: ${toolName}`);
                            sendConversationItemCreate(openaiWs, {
                                type: 'function_call_output',
                                call_id: callId,
                                output: JSON.stringify({ error: `Unknown tool: ${toolName}` })
                            });
                            sendResponseCreate(openaiWs);
                        }
                    } catch (toolError) {
                        console.error(`❌ Tool error:`, toolError);
                        sendConversationItemCreate(openaiWs, {
                            type: 'function_call_output',
                            call_id: callId,
                            output: JSON.stringify({ error: toolError.message })
                        });
                        sendResponseCreate(openaiWs);
                    }
                    break;

                // ─────────────────────────────────────────────────────────────
                // Rate Limit Events
                // ─────────────────────────────────────────────────────────────

                case 'rate_limits.updated':
                    // Rate limit info - useful for monitoring
                    console.log('📊 Rate limits:', event.rate_limits);
                    break;

                // ─────────────────────────────────────────────────────────────
                // Error Events
                // ─────────────────────────────────────────────────────────────

                case 'error':
                    console.error('❌ OpenAI error:', event.error);

                    // Handle specific errors
                    if (event.error?.code === 'session_expired') {
                        console.log('🔄 Session expired, closing connection');
                        twilioWs.close();
                    } else if (event.error?.code === 'rate_limit_exceeded') {
                        console.log('⏳ Rate limited, waiting...');
                    }
                    break;

                default:
                    // Log unhandled events for debugging
                    if (event.type) {
                        console.log(`📨 Event: ${event.type}`);
                    }
            }
        } catch (error) {
            console.error('❌ Error processing OpenAI message:', error);
        }
    });

    openaiWs.on('close', (code, reason) => {
        console.log(`🔌 OpenAI WebSocket closed (code: ${code})`);
        if (session) {
            session.isResponseInProgress = false;
        }
    });

    openaiWs.on('error', (error) => {
        console.error('❌ OpenAI WebSocket error:', error);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Twilio WebSocket handlers
    // ─────────────────────────────────────────────────────────────────────────

    twilioWs.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());

            switch (message.event) {
                case 'connected':
                    console.log('📱 Twilio connected');
                    break;

                case 'start':
                    const { streamSid, callSid: sid, customParameters } = message.start;
                    const callSid = customParameters?.callSid || sid;
                    const fromNumber = customParameters?.fromNumber || 'unknown';

                    // Create session
                    session = new VoiceSession(twilioWs, openaiWs, callSid, fromNumber);
                    session.streamSid = streamSid;

                    console.log(`🎙️ Media stream started: ${streamSid}`);
                    console.log(`📞 Call SID: ${callSid}, From: ${fromNumber}`);

                    // Create call log
                    session.callLogId = await createCallLog({
                        callSid,
                        fromNumber,
                        startTime: new Date()
                    });

                    sessions.set(callSid, session);
                    break;

                case 'media':
                    // Update latest media timestamp for interruption handling
                    if (session && message.media?.timestamp) {
                        session.latestMediaTimestamp = parseInt(message.media.timestamp, 10);
                    }

                    // Forward audio to OpenAI
                    if (openaiWs?.readyState === WebSocket.OPEN && message.media?.payload) {
                        sendInputAudioAppend(openaiWs, message.media.payload);
                    }
                    break;

                case 'mark':
                    // Mark received - audio at this position was played
                    if (session && message.mark?.name) {
                        const markIndex = session.markQueue.findIndex(
                            m => m.label === message.mark.name
                        );
                        if (markIndex !== -1) {
                            // Remove all marks up to and including this one
                            session.markQueue.splice(0, markIndex + 1);
                        }
                    }
                    break;

                case 'stop':
                    console.log('🛑 Media stream stopped');

                    // End call log with analytics
                    if (session?.callLogId) {
                        // Compute basic sentiment from transcripts
                        const sentiment = computeBasicSentiment(session.transcripts);
                        const leadScore = computeLeadScore(session);

                        await endCallLog(session.callLogId, {
                            toolsUsed: session.toolsUsed,
                            sentiment,
                            leadScore,
                            transcripts: session.transcripts
                        });
                    }

                    if (openaiWs?.readyState === WebSocket.OPEN) {
                        openaiWs.close();
                    }

                    if (session?.callSid) {
                        sessions.delete(session.callSid);
                    }
                    session = null;
                    break;
            }
        } catch (error) {
            console.error('❌ Error processing Twilio message:', error);
        }
    });

    twilioWs.on('close', () => {
        console.log('🔌 Twilio WebSocket closed');
        if (openaiWs?.readyState === WebSocket.OPEN) {
            openaiWs.close();
        }
        if (session?.callSid) {
            sessions.delete(session.callSid);
        }
        session = null;
    });

    twilioWs.on('error', (error) => {
        console.error('❌ Twilio WebSocket error:', error);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute basic sentiment from transcripts using simple keyword analysis
 */
function computeBasicSentiment(transcripts) {
    const positiveWords = ['great', 'awesome', 'perfect', 'thanks', 'thank', 'love', 'excellent', 'wonderful', 'amazing', 'happy', 'yes', 'please'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'problem', 'issue', 'wrong', 'no', 'cancel', 'refund', 'complaint'];

    const allText = [
        ...transcripts.user.map(t => t.text),
        ...transcripts.assistant.map(t => t.text)
    ].join(' ').toLowerCase();

    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
        const matches = allText.match(new RegExp(`\\b${word}\\b`, 'g'));
        if (matches) positiveScore += matches.length;
    });

    negativeWords.forEach(word => {
        const matches = allText.match(new RegExp(`\\b${word}\\b`, 'g'));
        if (matches) negativeScore += matches.length;
    });

    if (positiveScore > negativeScore + 2) return 'positive';
    if (negativeScore > positiveScore + 2) return 'negative';
    return 'neutral';
}

/**
 * Compute lead score based on session activity
 */
function computeLeadScore(session) {
    let score = 50; // Base score

    // Increase score for tool usage (indicates interest)
    score += session.toolsUsed.length * 5;

    // High-value tools
    const highValueTools = ['createPartyBooking', 'createAdmission', 'createOrder', 'getTicketPricing', 'listPartyPackages'];
    session.toolsUsed.forEach(tool => {
        if (highValueTools.includes(tool)) {
            score += 10;
        }
    });

    // Conversation length (more engagement = higher score)
    const totalMessages = session.transcripts.user.length + session.transcripts.assistant.length;
    score += Math.min(totalMessages * 2, 20);

    // Cap at 100
    return Math.min(score, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Management API Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// Get active sessions
app.get('/api/sessions', (req, res) => {
    const activeSessions = [];
    sessions.forEach((session, callSid) => {
        activeSessions.push({
            callSid,
            fromNumber: session.fromNumber,
            streamSid: session.streamSid,
            isResponseInProgress: session.isResponseInProgress,
            currentAgent: session.currentAgent,
            toolsUsed: session.toolsUsed.length,
            conversationItems: session.conversationItems.size
        });
    });
    res.json({ count: activeSessions.length, sessions: activeSessions });
});

// Get session details
app.get('/api/sessions/:callSid', (req, res) => {
    const session = sessions.get(req.params.callSid);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({
        callSid: session.callSid,
        fromNumber: session.fromNumber,
        streamSid: session.streamSid,
        isResponseInProgress: session.isResponseInProgress,
        currentAgent: session.currentAgent,
        toolsUsed: session.toolsUsed,
        transcripts: session.transcripts
    });
});

// Force cancel response for a session (for testing/admin)
app.post('/api/sessions/:callSid/cancel', (req, res) => {
    const session = sessions.get(req.params.callSid);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (session.openaiWs?.readyState === WebSocket.OPEN) {
        sendResponseCancel(session.openaiWs);
        res.json({ success: true, message: 'Response cancelled' });
    } else {
        res.status(400).json({ error: 'OpenAI WebSocket not connected' });
    }
});

// Inject a message into a session (for testing/admin)
app.post('/api/sessions/:callSid/inject', (req, res) => {
    const session = sessions.get(req.params.callSid);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const { text, triggerResponse = true } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    if (session.openaiWs?.readyState === WebSocket.OPEN) {
        // Add user message to conversation
        sendConversationItemCreate(session.openaiWs, {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text }]
        });

        // Optionally trigger response
        if (triggerResponse) {
            sendResponseCreate(session.openaiWs);
        }

        res.json({ success: true, message: 'Message injected' });
    } else {
        res.status(400).json({ error: 'OpenAI WebSocket not connected' });
    }
});

// Update session configuration (for testing/admin)
app.post('/api/sessions/:callSid/update', (req, res) => {
    const session = sessions.get(req.params.callSid);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const { instructions, tools } = req.body;

    if (session.openaiWs?.readyState === WebSocket.OPEN) {
        const config = {};
        if (instructions) config.instructions = instructions;
        if (tools) config.tools = tools;

        sendSessionUpdate(session.openaiWs, session, config);
        res.json({ success: true, message: 'Session updated' });
    } else {
        res.status(400).json({ error: 'OpenAI WebSocket not connected' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     🎈 Playfunia Voice Agent Server Running                 ║
║                                                            ║
║     Port:       ${PORT}                                      ║
║     Dashboard:  http://localhost:${PORT}/dashboard            ║
║     Health:     http://localhost:${PORT}/health               ║
║     Twilio WS:  ws://localhost:${PORT}/media-stream           ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { app, server };
