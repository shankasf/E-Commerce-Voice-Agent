import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EphemeralTokenResponse {
  id: string;
  object: string;
  model: string;
  modalities: string[];
  voice: string;
  client_secret: {
    value: string;
    expires_at: number;
  };
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(private configService: ConfigService) {}

  async createEphemeralToken(): Promise<EphemeralTokenResponse> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-realtime-preview-2024-12-17';
    const voice = this.configService.get<string>('OPENAI_VOICE') || 'alloy';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        modalities: ['audio', 'text'],
        instructions: `You are a friendly and professional healthcare voice assistant for Sunrise Family Healthcare.
Your role is to help patients with:
- Scheduling, rescheduling, or canceling appointments
- Looking up their upcoming appointments
- Finding available appointment times with specific doctors
- Getting information about our providers and services
- Answering questions about office hours and location

Always be warm, helpful, and reassuring. When a patient calls, greet them and ask how you can help.
If you need to look up patient information, ask for their name and date of birth.
Keep responses concise for voice - avoid long lists or complex explanations.
If you cannot help with something, offer to transfer to a staff member.`,
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`OpenAI API error: ${error}`);
      throw new Error(`Failed to create ephemeral token: ${response.status}`);
    }

    const data = await response.json();
    this.logger.log(`Created ephemeral token for model: ${data.model}`);
    return data;
  }
}
