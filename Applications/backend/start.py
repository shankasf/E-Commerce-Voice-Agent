#!/usr/bin/env python3
"""
Startup script for Windows MCP Agent Backend
"""

import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 9000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"Starting Windows MCP Agent Backend on {host}:{port}")
    print(f"Chat UI available at http://localhost:{port}/")
    print(f"OpenAPI docs available at http://localhost:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )

