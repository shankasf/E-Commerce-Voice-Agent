import path from "node:path";
import { config } from "dotenv";

// Load .env from frontend directory (same level as package.json)
const ENV_PATH = path.resolve(process.cwd(), ".env");

if (!process.env.__CALLSPHERE_ENV_LOADED) {
  config({ path: ENV_PATH });
  process.env.__CALLSPHERE_ENV_LOADED = "true";
}

export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_VOICE_MODEL: process.env.OPENAI_VOICE_MODEL ?? "gpt-4o-mini",
  OPENAI_REALTIME_MODEL: process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview-2024-12-17",
};
