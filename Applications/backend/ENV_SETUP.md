# Environment Setup

Create a `.env` file in the backend directory with the following:

```env
# Test User Credentials (for authentication)
TEST_EMAIL=test@example.com
TEST_UE_CODE=TEST123

# LLM API Configuration (optional - will use mock mode if not provided)
# Prefer OpenAI, fallback to Mistral AI

# OpenAI Configuration (Preferred)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Mistral AI Configuration (Fallback)
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_API_URL=https://api.mistral.ai/v1
MISTRAL_MODEL=mistral-large-latest

# Backend Configuration
PORT=9000
HOST=0.0.0.0

# Database (JSON file path)
DATABASE_PATH=mcp_agent_data.json
```

## Important Notes

- **TEST_EMAIL** and **TEST_UE_CODE** are required for device registration
- Users must match these exact credentials to register devices
- The backend will create users automatically in the JSON database
- All data is stored in `mcp_agent_data.json` (created automatically)

## Example .env File

```env
TEST_EMAIL=user@company.com
TEST_UE_CODE=EMP12345
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
PORT=9000
```
