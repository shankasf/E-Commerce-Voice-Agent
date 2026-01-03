```markdown
# Backend — Launch & Webapp URL

This file describes how to start the Python FastAPI backend used by the MCP agents and the URL to open the web UI (when the backend serves a webapp).

Prerequisites
- Python 3.8+
- pip
- (Optional) virtualenv or venv
- Ensure `.env` contains required keys (OPENAI_API_KEY, TEST_EMAIL, TEST_UE_CODE, etc.)

Install
```bash
cd Applications/backend
python -m venv .venv
source .venv/bin/activate    # on Windows use: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run (development)
```bash
# simple run (if main.py exists)
python main.py

# or use uvicorn if the app exposes an ASGI app
uvicorn main:app --host 0.0.0.0 --port 9000
```

Open the web app
- Backend default API URL: `http://localhost:9000`
- If the repository includes a web UI served by the backend, open `http://localhost:9000` in your browser. If the web UI is in a separate frontend project, run that frontend and open its configured URL (commonly `http://localhost:3000`).

Health check
```bash
curl http://localhost:9000/api/health
```

Notes
- Use `.env.example` to create `.env` and set secrets.
- On Windows, adapt venv activation to PowerShell: `.venv\Scripts\Activate.ps1`.

Remove this file when no longer needed.
```
