import { ConfigService } from '@nestjs/config';
interface StreamOptions {
    streamId: string;
    namespace: string;
    podName: string;
    container?: string;
    onLine: (line: string) => void;
    onError: (error: string) => void;
    onEnd: () => void;
}
export declare class LogStreamService {
    private configService;
    private readonly logger;
    private kc;
    private coreApi;
    private activeStreams;
    constructor(configService: ConfigService);
    startStream(options: StreamOptions): Promise<void>;
    stopStream(streamId: string): void;
    private cleanupStream;
    getActiveStreamCount(): number;
}
export {};
