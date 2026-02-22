"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let VoiceService = VoiceService_1 = class VoiceService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(VoiceService_1.name);
    }
    async createEphemeralToken() {
        const apiKey = this.configService.get('OPENAI_API_KEY');
        const model = this.configService.get('OPENAI_MODEL') || 'gpt-4o-realtime-preview-2024-12-17';
        const voice = this.configService.get('OPENAI_VOICE') || 'alloy';
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
};
exports.VoiceService = VoiceService;
exports.VoiceService = VoiceService = VoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VoiceService);
//# sourceMappingURL=voice.service.js.map