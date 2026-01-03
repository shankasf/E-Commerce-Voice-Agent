# Installation Troubleshooting

## Rust Compilation Error

If you encounter errors about Rust/Cargo during installation, try these solutions:

### Solution 1: Use Simplified Requirements

```bash
pip install -r requirements-simple.txt
```

This installs the latest compatible versions without strict version pinning.

### Solution 2: Install Without Email Validation

If email validation is causing issues, you can temporarily remove it:

1. Edit `main.py` and change:
   ```python
   from pydantic import BaseModel, EmailStr
   ```
   to:
   ```python
   from pydantic import BaseModel
   ```

2. Change the model:
   ```python
   email: EmailStr
   ```
   to:
   ```python
   email: str
   ```

3. Install without email-validator:
   ```bash
   pip install fastapi uvicorn[standard] websockets openai python-dotenv pydantic aiohttp python-multipart
   ```

### Solution 3: Use Pre-built Wheels

Try installing packages individually to identify the problematic one:

```bash
pip install fastapi
pip install uvicorn[standard]
pip install websockets
pip install openai
pip install python-dotenv
pip install pydantic
pip install email-validator
pip install aiohttp
pip install python-multipart
```

### Solution 4: Use Python 3.10 or 3.11

Some packages have better wheel support for Python 3.10-3.11. Consider using a virtual environment with one of these versions.

### Solution 5: Install Rust (if needed)

If you want to compile from source:

1. Install Rust: https://rustup.rs/
2. Add Rust to PATH
3. Retry installation

## Common Issues

### Issue: "Microsoft Visual C++ 14.0 or greater is required"

Install Visual Studio Build Tools:
- Download: https://visualstudio.microsoft.com/downloads/
- Install "Desktop development with C++" workload

### Issue: "pip version too old"

```bash
python -m pip install --upgrade pip
```

### Issue: "Package not found"

Make sure you're using the correct Python version:
```bash
python --version  # Should be 3.8+
```

## Minimal Installation (No LLM)

If you just want to test without LLM:

```bash
pip install fastapi uvicorn[standard] websockets python-dotenv pydantic email-validator aiohttp python-multipart
```

The backend will run in mock mode without OpenAI.









