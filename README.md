# Playfunia Voice Agent (Kids4Fun)

Production voice assistant for Kids4Fun at Poughkeepsie Galleria Mall. Twilio calls hit a Node gateway on port 4001, which proxies media to a Python FastAPI SIP server on port 8080 that drives an OpenAI Realtime multi-agent stack. All business data (catalog, tickets, parties, orders, payments, refunds, staff, promos, waivers, FAQs) is served from Supabase. A full analytics dashboard is served from the same Node process and managed by PM2 as `callsphere-webhook` behind nginx at `https://webhook.callsphere.tech`.

## Tech stack
- Node.js (Express) gateway + analytics dashboard (Chart.js)
- Python FastAPI SIP integration (Twilio Webhook + media WebSocket)
- OpenAI Realtime API (`gpt-4o-realtime-preview-2024-12-17`, voice `alloy`, server VAD)
- Supabase (PostgreSQL + REST) for all business data and call logs
- PM2 for process supervision; nginx for TLS/frontend

## End-to-end call flow
1) **Twilio → Node**: Twilio webhook hits `server.js` on port 4001; Node upgrades to media WebSocket and proxies to Python on 8080.
2) **Node → Python**: Media is forwarded to `sip_integration/webhook_server.py` (`/media-stream/{session}`); TwiML is served from `/twilio`.
3) **Python → OpenAI**: `media_stream.py` streams audio to OpenAI Realtime; function calls are relayed to the agent adapter.
4) **Agent adapter**: `sip_integration/agent_adapter.py` registers 25+ Supabase-backed tools and lazy-loads specialist agents from `app_agents/` (triage/info/catalog/admission/party/order).
5) **Data layer**: `db/queries_supabase.py` and `db/database.py` perform Supabase REST calls with logging and error surfacing.
6) **Voice memory**: `memory/` holds lightweight session state (with optional local SQLite).
7) **Persistence + analytics**: `server.js` records call logs to Supabase, derives 50+ metrics, and renders the dashboard with time-range filters and export endpoints.

## Greeting and behavior
- Initial greeting (triage): “Welcome to kids for fun Poughkeepsie Galleria Mall: 2001 South Rd Unit A108, Poughkeepsie, NY. How can I help? I can share store info, toy catalog, admissions/policies, party planning, orders/status, payments, and refunds.”
- Party and order agents must collect all required customer/contact fields before any write. Supabase errors are surfaced so the agent re-asks with corrected formats.

## Key tools (Supabase-backed)
- **Customer:** `create_customer_profile`, `list_customer_orders`
- **Party:** `list_party_packages`, `get_party_availability`, `create_party_booking`, `update_party_booking`
- **Orders:** `create_order_with_item`, `add_order_item`, `update_order_status`, `get_order_details`, `record_payment`, `create_refund`
- **Catalog & info:** `search_products`, `get_product_details`, `get_ticket_pricing`, `get_store_policies`, `list_faqs`, `list_staff`, `list_testimonials`, `list_promotions`, `list_waivers`, `list_payments`, `list_refunds`, `get_locations`, `get_knowledge_base_article`

## Dashboard highlights (Node `/dashboard`)
- 50+ derived KPIs: volume, sentiment, lead quality, conversions, tool usage, follow-ups, escalations, silence/talk ratios, repeat callers, new vs returning, and more.
- Charts: volume trend, funnel, sentiment pulse, lead score trend, intent mix, hourly load, lead grade bands.
- Heatmap of engagement, insights panel, recent calls, top callers, follow-up queue, quality alerts.
- Time-range filters: `?range=today|7d|30d|90d|all` with UI buttons.
- Exports: `/dashboard/export/json` and `/dashboard/export/csv` (honors `?range=`). API JSON: `/dashboard/api/metrics`.

## Environment (required)
```
OPENAI_API_KEY=...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
WEBHOOK_BASE_URL=https://webhook.callsphere.tech
TWILIO_AUTH_TOKEN=  # blank in dev if bypassing signature
```

## Local run (voice + dashboard)
```bash
cd /root/webhook/playfunia_agentic_chatbot2
python3 -m venv .venv && source .venv/bin/activate
pip install -r sip_integration/requirements.txt
python main.py  # FastAPI SIP server on :8080

# In another shell (root of repo)
node server.js  # Node gateway + dashboard on :4001

# Open dashboard
curl -u admin:kids4fun123 http://localhost:4001/dashboard
```

## PM2 (production)
- Process: `callsphere-webhook`
- Restart: `pm2 restart callsphere-webhook --update-env`
- Logs: `pm2 logs callsphere-webhook --lines 200`

## Repository map (voice + gateway)
```
playfunia_agentic_chatbot2/
├─ main.py                      # Starts FastAPI SIP server
├─ server.js (root)             # Node proxy on :4001 → Python :8080 + dashboard
├─ sip_integration/
│  ├─ webhook_server.py         # FastAPI routes for Twilio + WS
│  ├─ media_stream.py           # WS audio bridge to OpenAI Realtime
│  ├─ agent_adapter.py          # Registers tools/agents
│  ├─ session_manager.py        # Persists call log + tool calls + conversions
│  └─ openai_realtime.py        # Realtime client wrapper
├─ app_agents/                  # Specialized agents (triage/info/catalog/admission/party/order)
├─ db/
│  ├─ queries_supabase.py       # Supabase tool functions
│  ├─ database.py               # REST wrapper with logging
│  ├─ playfunia_schema.sql      # Schema reference
│  ├─ queries.py / queries_supabase.py
│  └─ schema.py                 # Supabase models
├─ memory/                      # Session/memory utilities
├─ agents.py                    # Agent base & tool decorator
├─ voice.py                     # Legacy/aux voice helpers
└─ README.md                    # This file
```

## Operational notes
- Greeting/capability prompt enforced in `app_agents/triage_agent.py`.
- Datetimes accept `YYYY-MM-DDTHH:MM:SS` with optional `Z`; conflict checks URL-encode `+00:00`.
- Call logs include tool calls and conversion flags; indexes added on conversion and tools_used.
- Dashboard uses Basic Auth (`admin` / `kids4fun123`).

## Quick checks
- Tail logs: `pm2 logs callsphere-webhook --lines 200 --nostream`
- Hit metrics API: `curl -u admin:kids4fun123 http://localhost:4001/dashboard/api/metrics`
- Export CSV: `curl -u admin:kids4fun123 "http://localhost:4001/dashboard/export/csv?range=7d" -o metrics.csv`

## License

MIT License - see [LICENSE](LICENSE).

## Support

- Open an issue in this repo
- Contact the dev team

