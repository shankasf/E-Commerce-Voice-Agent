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
export declare class VoiceService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    createEphemeralToken(): Promise<EphemeralTokenResponse>;
}
export {};
