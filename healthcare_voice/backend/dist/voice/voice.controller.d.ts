import { VoiceService } from './voice.service';
export declare class VoiceController {
    private readonly voiceService;
    constructor(voiceService: VoiceService);
    getEphemeralToken(): Promise<{
        token: string;
        expires_at: number;
        model: string;
        voice: string;
    }>;
    healthCheck(): {
        status: string;
        service: string;
    };
}
