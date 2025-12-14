# Playfunia Voice Agent

A production-ready multi-agent voice system for Kids4Fun (Playfunia) built with **OpenAI Realtime API** and **Twilio** for real-time voice interactions with **robust interruption handling** and **barge-in support**.

## ✨ Key Features

- **🎙️ Real-time Voice Conversations** - Sub-second latency using OpenAI Realtime WebSocket API
- **🛑 Interruption Handling (Barge-in)** - Users can interrupt the agent mid-speech
- **🤖 Multi-Agent System** - Triage agent routes to 5 specialist agents
- **🛠️ 47 Database Tools** - Full CRUD operations via Supabase
- **📊 Analytics Dashboard** - Call metrics, sentiment analysis, lead scoring
- **🔊 Server VAD** - Voice Activity Detection for natural turn-taking
- **📝 Transcript Capture** - Full conversation logging for analytics
- **⚡ Audio Truncation** - Aligns server state with what user actually heard

## 🏗️ Architecture

```
                         ┌──────────────────┐
                         │   Phone Call     │
                         │   (User)         │
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │     Twilio       │
                         │  Media Streams   │
                         └────────┬─────────┘
                                  │ WebSocket (G.711 μ-law)
                                  │
┌─────────────────────────────────▼─────────────────────────────────┐
│                     Express + WebSocket Server                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    VoiceSession Manager                      │  │
│  │  • Audio position tracking    • Interruption debouncing     │  │
│  │  • Mark queue management      • Transcript collection       │  │
│  │  • Response state tracking    • Sentiment analysis          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ WebSocket
                         ┌────────▼─────────┐
                         │  OpenAI Realtime │
                         │       API        │
                         │  (gpt-4o-realtime│
                         │   -2025-08-28)   │
                         └────────┬─────────┘
                                  │
              ┌───────────────────▼───────────────────┐
              │           TRIAGE AGENT                │
              │  Routes conversations by user intent  │
              └───────────────────┬───────────────────┘
                                  │
     ┌───────────┬────────────────┼────────────────┬───────────┐
     ▼           ▼                ▼                ▼           ▼
┌─────────┐ ┌─────────┐    ┌───────────┐    ┌─────────┐ ┌─────────┐
│  INFO   │ │ CATALOG │    │ ADMISSION │    │  PARTY  │ │  ORDER  │
│  AGENT  │ │  AGENT  │    │   AGENT   │    │  AGENT  │ │  AGENT  │
│ 7 tools │ │ 5 tools │    │  6 tools  │    │10 tools │ │13 tools │
└────┬────┘ └────┬────┘    └─────┬─────┘    └────┬────┘ └────┬────┘
     │           │               │               │           │
     └───────────┴───────────────┼───────────────┴───────────┘
                                 │
                        ┌────────▼─────────┐
                        │     Supabase     │
                        │   (PostgreSQL)   │
                        │   25+ tables     │
                        └──────────────────┘
```

## 📁 Project Structure

```
src/
├── server.js               # Main Express + WebSocket server
│                           # - VoiceSession class for state management
│                           # - Interruption handling logic
│                           # - OpenAI Realtime event handlers
│                           # - Twilio media stream handlers
│                           # - Admin API endpoints
├── agents/                 # Multi-agent system
│   ├── index.js            # Agent exports
│   ├── triage.agent.js     # Main router agent with handoffs
│   ├── info.agent.js       # FAQ, policies, locations, staff
│   ├── catalog.agent.js    # Products, inventory management
│   ├── admission.agent.js  # Tickets, waivers, check-ins
│   ├── party.agent.js      # Party bookings, packages, guests
│   └── order.agent.js      # Orders, payments, refunds
├── tools/                  # Supabase-backed tools (47 total)
│   ├── index.js            # Tool exports
│   ├── info.tools.js       # 7 info tools
│   ├── catalog.tools.js    # 5 catalog tools
│   ├── admission.tools.js  # 6 admission tools
│   ├── party.tools.js      # 10 party tools
│   ├── order.tools.js      # 13 order tools
│   └── customer.tools.js   # 6 customer tools
├── db/
│   └── supabase.js         # Supabase client wrapper
├── metrics/
│   └── call-logs.js        # Call logging & metrics computation
└── dashboard/
    ├── index.js            # Dashboard exports
    └── routes.js           # Dashboard UI (Chart.js) & API
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 22.0.0
- **OpenAI API key** with Realtime API access
- **Supabase** project with the Playfunia schema
- **Twilio** account (for phone calls)
- **ngrok** or similar (for local development)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server (with auto-reload)
npm run dev

# Or start production server
npm start
```

### Twilio Setup

1. Create a TwiML App in Twilio Console
2. Set the **Voice Request URL** to: `https://your-domain.com/twilio/incoming`
3. Set the **Status Callback URL** to: `https://your-domain.com/twilio/status`
4. Point your Twilio phone number to this TwiML App

### Local Development with ngrok

```bash
# Start server
npm run dev

# In another terminal, expose with ngrok
ngrok http 3000

# Use the ngrok HTTPS URL for Twilio webhooks
```

## 🎙️ OpenAI Realtime API Integration

### Client Events Sent

| Event | Purpose |
|-------|---------|
| `session.update` | Configure voice, VAD, tools, instructions |
| `input_audio_buffer.append` | Stream audio from Twilio to OpenAI |
| `input_audio_buffer.commit` | Commit audio buffer (manual mode) |
| `input_audio_buffer.clear` | Discard buffered audio |
| `conversation.item.create` | Add messages/tool results to conversation |
| `conversation.item.truncate` | Truncate assistant audio on interruption |
| `conversation.item.delete` | Remove items from conversation |
| `response.create` | Trigger model response |
| `response.cancel` | Cancel in-progress response |

### Server Events Handled

| Event | Handler Action |
|-------|----------------|
| `session.created` | Log session ID |
| `session.updated` | Send initial greeting |
| `input_audio_buffer.committed` | Track user audio item |
| `input_audio_buffer.speech_started` | **Trigger interruption handler** |
| `input_audio_buffer.speech_stopped` | Log speech end |
| `conversation.item.created` | Track conversation items |
| `conversation.item.truncated` | Log truncation |
| `conversation.item.input_audio_transcription.completed` | Capture user transcript |
| `response.created` | Mark response in progress |
| `response.done` | Reset response state, handle cancelled/failed |
| `response.audio.delta` | Forward audio to Twilio, track position |
| `response.audio_transcript.done` | Capture assistant transcript |
| `response.function_call_arguments.done` | Execute tool, send result |
| `rate_limits.updated` | Log rate limit info |
| `error` | Handle session_expired, rate_limit_exceeded |

## 🛑 Interruption Handling (Barge-in)

When a user starts speaking while the agent is talking:

```
1. VAD detects speech → input_audio_buffer.speech_started
                              ↓
2. handleInterruption() called (debounced 100ms)
                              ↓
3. Send response.cancel to stop generation
                              ↓
4. Send Twilio "clear" event to stop playback
                              ↓
5. Calculate played audio duration from marks
                              ↓
6. Send conversation.item.truncate to align state
                              ↓
7. Reset audio tracking, ready for user input
```

### Configuration

```javascript
const VOICE_CONFIG = {
    voice: 'alloy',              // alloy, echo, fable, onyx, nova, shimmer
    vadThreshold: 0.5,           // Speech detection sensitivity (0-1)
    vadPrefixPaddingMs: 300,     // Audio to keep before speech start
    vadSilenceDurationMs: 500,   // Silence duration to end turn
    interruptionDebounceMs: 100, // Prevent rapid interruption triggers
};
```

## 📊 Dashboard

Access at `http://localhost:3000/dashboard`

**Default credentials:** `admin` / `kids4fun123`

### Metrics Displayed

| Metric | Description |
|--------|-------------|
| Total Calls | Number of calls in selected range |
| Avg Duration | Average call length |
| Avg Lead Score | 0-100 based on engagement |
| Conversion Rate | Percentage of successful conversions |
| Follow-up Rate | Calls requiring follow-up |
| Escalation Rate | Calls escalated to human |
| Sentiment Breakdown | Positive/Neutral/Negative pie chart |
| Lead Score Bands | Hot (70+) / Warm (40-69) / Cold (<40) |
| Hourly Distribution | Call volume by hour |
| Daily Volume | Call trend over time |
| Tool Usage | Most used tools bar chart |
| Top Callers | Frequent caller numbers |
| Recent Calls | Latest call details |

### Time Filters

- Today
- 7 Days
- 30 Days
- 90 Days
- All Time

## 📝 API Endpoints

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check with timestamp |
| POST | `/twilio/incoming` | Twilio incoming call webhook (returns TwiML) |
| POST | `/twilio/status` | Twilio call status callback |
| WS | `/media-stream` | Twilio media stream WebSocket |

### Dashboard Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Metrics dashboard UI |
| GET | `/dashboard/api/metrics?range=7d` | Metrics JSON API |
| GET | `/dashboard/export/json?range=7d` | Export logs as JSON |
| GET | `/dashboard/export/csv?range=7d` | Export logs as CSV |

### Session Management API (Admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | List all active call sessions |
| GET | `/api/sessions/:callSid` | Get session details + transcripts |
| POST | `/api/sessions/:callSid/cancel` | Force cancel current response |
| POST | `/api/sessions/:callSid/inject` | Inject text message into conversation |
| POST | `/api/sessions/:callSid/update` | Update session config (instructions/tools) |

#### Example: Inject Message

```bash
curl -X POST http://localhost:3000/api/sessions/CA123.../inject \
  -H "Content-Type: application/json" \
  -d '{"text": "What are your party packages?", "triggerResponse": true}'
```

## 🛠️ Tools (47 Total)

### Info Tools (7)
| Tool | Description |
|------|-------------|
| `listFaqs` | Get frequently asked questions |
| `getStorePolicies` | Retrieve store policies |
| `listStoreLocations` | Get location details |
| `listStaff` | Get staff directory |
| `listTestimonials` | Get customer testimonials |
| `getCompanyInfo` | Get company details |
| `listResources` | Get resources/assets |

### Catalog Tools (5)
| Tool | Description |
|------|-------------|
| `searchProducts` | Search product catalog |
| `getProductDetails` | Get product by ID |
| `checkInventory` | Check stock levels |
| `getInventoryMovements` | Get inventory history |
| `recordInventoryMovement` | Record stock change |

### Admission Tools (6)
| Tool | Description |
|------|-------------|
| `getTicketPricing` | Get ticket types/prices |
| `listWaivers` | List customer waivers |
| `createWaiver` | Create liability waiver |
| `createAdmission` | Create admission entry |
| `checkInAdmission` | Check in visitor |
| `listAdmissions` | List admissions |

### Party Tools (10)
| Tool | Description |
|------|-------------|
| `listPartyPackages` | Get party packages |
| `getPackageInclusions` | Get package details |
| `getPartyAvailability` | Check date availability |
| `createPartyBooking` | Book a party |
| `updatePartyBooking` | Update booking |
| `getBookingDetails` | Get booking info |
| `rescheduleParty` | Reschedule party |
| `addPartyGuest` | Add guest to party |
| `listPartyGuests` | List party guests |
| `addPartyAddon` | Add party addon |

### Order Tools (13)
| Tool | Description |
|------|-------------|
| `createOrder` | Create new order |
| `getOrderDetails` | Get order by ID |
| `searchOrders` | Search orders |
| `updateOrderStatus` | Update order status |
| `addOrderItem` | Add item to order |
| `listOrderItems` | List order items |
| `recordPayment` | Record payment |
| `listPayments` | List payments |
| `createRefund` | Create refund |
| `updateRefundStatus` | Update refund status |
| `listRefunds` | List refunds |
| `listPromotions` | Get active promotions |
| `applyPromotion` | Apply promo to order |

### Customer Tools (6)
| Tool | Description |
|------|-------------|
| `createCustomerProfile` | Create customer |
| `searchCustomers` | Search customers |
| `getCustomerDetails` | Get customer by ID |
| `updateCustomerProfile` | Update customer |
| `listCustomerOrders` | Get customer orders |
| `listCustomerBookings` | Get customer bookings |

## 🔄 Agent Handoffs

The **Triage Agent** analyzes user intent and routes to specialists:

| User Intent | Routed To | Example Phrases |
|-------------|-----------|-----------------|
| FAQ, hours, locations | Info Agent | "What are your hours?", "Where are you located?" |
| Products, prices, inventory | Catalog Agent | "What do you sell?", "Do you have toys?" |
| Tickets, admission, waivers | Admission Agent | "How much is admission?", "I need to sign a waiver" |
| Party bookings, packages | Party Agent | "I want to book a birthday party", "What packages do you have?" |
| Orders, payments, refunds | Order Agent | "I want to check my order", "I need a refund" |

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key with Realtime access |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `TWILIO_ACCOUNT_SID` | ❌ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ❌ | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | ❌ | Twilio phone number |
| `PORT` | ❌ | Server port (default: 3000) |
| `DASH_USER` | ❌ | Dashboard username (default: admin) |
| `DASH_PASS` | ❌ | Dashboard password (default: kids4fun123) |

## 📈 Analytics & Metrics

### Sentiment Analysis

Simple keyword-based sentiment detection:
- **Positive:** great, awesome, perfect, thanks, love, excellent, wonderful, amazing
- **Negative:** bad, terrible, awful, hate, angry, frustrated, problem, complaint

### Lead Scoring (0-100)

| Factor | Points |
|--------|--------|
| Base score | 50 |
| Each tool used | +5 |
| High-value tool used | +10 |
| Conversation messages | +2 each (max +20) |

**High-value tools:** `createPartyBooking`, `createAdmission`, `createOrder`, `getTicketPricing`, `listPartyPackages`

### Lead Bands

| Band | Score Range | Color |
|------|-------------|-------|
| 🔥 Hot | 70-100 | Red |
| 🌡️ Warm | 40-69 | Yellow |
| ❄️ Cold | 0-39 | Blue |

## 🧪 Development

```bash
# Run development server with auto-reload
npm run dev

# Run production server
npm start

# Test Supabase connection
node -e "import('./src/db/supabase.js').then(m => m.default.query('company').then(console.log))"
```

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.0.0 | HTTP server |
| `ws` | ^8.18.3 | WebSocket client/server |
| `@supabase/supabase-js` | ^2.45.0 | Supabase client |
| `dotenv` | ^16.6.1 | Environment variables |
| `twilio` | ^5.10.7 | Twilio SDK (optional) |
| `zod` | ^3.23.0 | Schema validation |

## 📜 License

MIT

