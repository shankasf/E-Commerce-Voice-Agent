# Playfunia Voice Agent (Kids4Fun)

Production voice assistant for Kids4Fun at Poughkeepsie Galleria Mall. Twilio voice calls are proxied through Node (port 4001) to a Python FastAPI SIP integration (port 8080) that drives an OpenAI Realtime multi-agent stack. All business data (products, tickets, parties, orders, payments, refunds, staff, testimonials, promos, waivers, FAQs) is read/written via Supabase REST. Calls are managed by PM2 under the name `callsphere-webhook` and fronted by nginx at `https://webhook.callsphere.tech`.

## High-level flow
- **Ingress:** Twilio webhook hits Node `server.js` (port 4001). Node upgrades media WebSocket and proxies to Python on 8080.
- **Python SIP Integration:** `sip_integration/webhook_server.py` exposes `/twilio` (TwiML) and `/media-stream/{session}` (WebSocket). `media_stream.py` pipes audio to OpenAI Realtime and relays function calls to the ToyShopAgentAdapter.
- **Agent adapter:** `sip_integration/agent_adapter.py` registers 25+ tools backed by Supabase (reads+writes). It lazily loads specialist agents from `app_agents/` and supplies tool schemas to the OpenAI session.
- **Data layer:** `db/queries_supabase.py` implements all tools via Supabase REST with optional upsert and conflict checks. `db/database.py` wraps HTTP calls and logs response bodies on errors. `db/playfunia_schema.sql` documents the schema.
- **Multi-agent brain:** `app_agents/*` defines specialized agents (triage, info, catalog, admission, party, order). The triage agent greets callers with the Kids4Fun address and routes to the right specialist.
- **Voice memory:** `memory/` handles lightweight conversation state; `conversations.db` is the local SQLite store for sessions (when used).

## Greeting and behavior
- Initial greeting (triage): “Welcome to kids for fun Poughkeepsie Galleria Mall: 2001 South Rd Unit A108, Poughkeepsie, NY. How can I help? I can share store info, toy catalog, admissions/policies, party planning, orders/status, payments, and refunds.”
- The party and order agents must collect all required customer/contact fields before any DB write. If Supabase rejects an input (e.g., bad datetime), `_format_request_error` returns a user-facing prompt so the voice agent re-asks for the correct format instead of silently failing.

## Key tools (Supabase-backed)
- **Customer:** `create_customer_profile`, `list_customer_orders`
- **Party:** `list_party_packages`, `get_party_availability`, `create_party_booking`, `update_party_booking`
- **Orders:** `create_order_with_item`, `add_order_item`, `update_order_status`, `get_order_details`, `record_payment`, `create_refund`
- **Catalog & info:** `search_products`, `get_product_details`, `get_ticket_pricing`, `get_store_policies`, `list_faqs`, `list_staff`, `list_testimonials`, `list_promotions`, `list_waivers`, `list_payments`, `list_refunds`, `get_locations`, `get_knowledge_base_article`

## Input validation highlights
- Datetimes accept `YYYY-MM-DDTHH:MM:SS` with optional `Z`; all conflict/availability checks URL-encode `+00:00` to avoid Supabase parsing errors.
- Party/Order creation blocks until full customer/contact fields are present when no `customer_id` is given.
- Error bodies from Supabase are surfaced to callers so the agent can re-ask with corrected format.

## Running locally (voice stack only)
```bash
cd /root/webhook/playfunia_agentic_chatbot2
python3 -m venv .venv && source .venv/bin/activate
pip install -r sip_integration/requirements.txt  # if present, or install listed deps manually
python main.py  # starts FastAPI on :8080

# In another shell, start the Node proxy
node /root/webhook/server.js  # expects python at 127.0.0.1:8080
```

## PM2 (production host)
- Process: `callsphere-webhook` (Node + Python managed together via `server.js`)
- Restart: `pm2 restart callsphere-webhook`
- Logs: `pm2 logs callsphere-webhook --lines 200`

## Environment (expected)
```
OPENAI_API_KEY=...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
WEBHOOK_BASE_URL=https://webhook.callsphere.tech
TWILIO_AUTH_TOKEN= (blank when bypassing signature in dev)
```

## Repository map (voice stack)
```
playfunia_agentic_chatbot2/
├─ main.py                      # Starts FastAPI SIP server
├─ server.js (root)             # Node proxy on :4001 → Python :8080
├─ sip_integration/
│  ├─ webhook_server.py         # FastAPI routes for Twilio + WS
│  ├─ media_stream.py           # WebSocket audio bridge to OpenAI Realtime
│  ├─ agent_adapter.py          # Registers tools and agents
│  └─ openai_realtime.py        # Realtime client wrapper
├─ app_agents/                  # Specialized agents (triage/info/catalog/admission/party/order)
├─ db/
│  ├─ queries_supabase.py       # All Supabase tool functions
│  ├─ database.py               # Supabase REST wrapper with logging
│  └─ playfunia_schema.sql      # Schema reference
├─ memory/                      # Session/memory utilities
├─ agents.py                    # Agent base & tool decorator
├─ voice.py                     # Legacy/aux voice helpers
└─ README.md                    # This file
```

## Operational notes
- Greeting and capability prompt are enforced in `app_agents/triage_agent.py`.
- Booking/order tools guard required inputs and surface Supabase errors so the agent can re-ask users.
- All timestamps are ISO8601; conflict checks are URL-encoded to avoid `+` → space issues in Supabase filters.
- Latest fixes: removed nonexistent `notes` column from party bookings; added error-body logging; added `_parse_datetime` for `Z`; added `_format_request_error` to drive voice re-prompts.

## Support commands
- Tail logs: `pm2 logs callsphere-webhook --lines 200 --nostream`
- Check schema quickly: `python - <<'PY'
from db import queries_supabase as q
print(q.db._make_request('GET','resources')[:2])
print(q.db._make_request('GET','party_packages')[:2])
PY`

## Contact & location
- Venue: Kids4Fun, Poughkeepsie Galleria Mall, 2001 South Rd Unit A108, Poughkeepsie, NY.
- Voice entrypoint: https://webhook.callsphere.tech (proxied to Twilio number configured in console).
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🔮 Roadmap

### Upcoming Features
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] AI-powered product recommendations
- [ ] Integration with payment gateways
- [ ] Voice biometric authentication
- [ ] Inventory management automation
- [ ] Customer sentiment analysis

### Version History
- **v1.0.0**: Initial release with basic voice agent functionality
- **v1.1.0**: Added dashboard and real-time updates
- **v1.2.0**: Enhanced memory and conversation management
- **v2.0.0**: Full MERN stack integration (Planned)

## 📊 Project Statistics

- **Total Commits**: 150+
- **Contributors**: 5
- **Languages**: Python, JavaScript, SQL
- **Lines of Code**: 10,000+
- **Test Coverage**: 85%

---

**Built with ❤️ for e-commerce innovation**
