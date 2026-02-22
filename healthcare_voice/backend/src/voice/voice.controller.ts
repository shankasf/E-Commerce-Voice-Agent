import { Controller, Post, Get, HttpException, HttpStatus } from '@nestjs/common';
import { VoiceService } from './voice.service';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('token')
  async getEphemeralToken() {
    try {
      const session = await this.voiceService.createEphemeralToken();
      return {
        token: session.client_secret.value,
        expires_at: session.client_secret.expires_at,
        model: session.model,
        voice: session.voice,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create voice session',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'voice' };
  }
}
