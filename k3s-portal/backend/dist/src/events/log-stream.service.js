"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LogStreamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogStreamService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const k8s = __importStar(require("@kubernetes/client-node"));
const stream_1 = require("stream");
let LogStreamService = LogStreamService_1 = class LogStreamService {
    configService;
    logger = new common_1.Logger(LogStreamService_1.name);
    kc;
    coreApi;
    activeStreams = new Map();
    constructor(configService) {
        this.configService = configService;
        this.kc = new k8s.KubeConfig();
        const kubeconfigPath = this.configService.get('KUBECONFIG_PATH');
        if (kubeconfigPath) {
            this.kc.loadFromFile(kubeconfigPath);
        }
        else {
            try {
                this.kc.loadFromCluster();
            }
            catch {
                this.kc.loadFromDefault();
            }
        }
        this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    }
    async startStream(options) {
        const { streamId, namespace, podName, container, onLine, onError, onEnd } = options;
        if (this.activeStreams.has(streamId)) {
            this.stopStream(streamId);
        }
        const passThrough = new stream_1.PassThrough();
        this.activeStreams.set(streamId, {
            passThrough,
            abortController: null,
            options,
        });
        try {
            try {
                const logOptions = {
                    namespace,
                    name: podName,
                    tailLines: 100,
                };
                if (container) {
                    logOptions.container = container;
                }
                const historicalLogs = await this.coreApi.readNamespacedPodLog(logOptions);
                if (historicalLogs) {
                    const lines = historicalLogs.split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            onLine(line);
                        }
                    }
                }
            }
            catch (err) {
                this.logger.warn(`Failed to get historical logs: ${err}`);
            }
            let buffer = '';
            passThrough.on('data', (chunk) => {
                buffer += chunk.toString('utf-8');
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        onLine(line);
                    }
                }
            });
            passThrough.on('error', (err) => {
                this.logger.error(`Stream error for ${streamId}: ${err.message}`);
                onError(err.message);
                this.cleanupStream(streamId);
            });
            passThrough.on('end', () => {
                if (buffer.trim()) {
                    onLine(buffer);
                }
                this.logger.log(`Stream ended for ${streamId}`);
                onEnd();
                this.cleanupStream(streamId);
            });
            passThrough.on('close', () => {
                this.logger.log(`Stream closed for ${streamId}`);
                this.cleanupStream(streamId);
            });
            const logClient = new k8s.Log(this.kc);
            const containerName = container || '';
            const abortController = await logClient.log(namespace, podName, containerName, passThrough, {
                follow: true,
                tailLines: 0,
                timestamps: true,
            });
            const activeStream = this.activeStreams.get(streamId);
            if (activeStream) {
                activeStream.abortController = abortController;
            }
        }
        catch (error) {
            this.logger.error(`Failed to start stream for ${streamId}: ${error}`);
            onError(String(error));
            this.cleanupStream(streamId);
            throw error;
        }
    }
    stopStream(streamId) {
        const activeStream = this.activeStreams.get(streamId);
        if (activeStream) {
            this.logger.log(`Stopping stream: ${streamId}`);
            if (activeStream.abortController) {
                activeStream.abortController.abort();
            }
            if (activeStream.passThrough) {
                activeStream.passThrough.destroy();
            }
            this.activeStreams.delete(streamId);
        }
    }
    cleanupStream(streamId) {
        this.activeStreams.delete(streamId);
    }
    getActiveStreamCount() {
        return this.activeStreams.size;
    }
};
exports.LogStreamService = LogStreamService;
exports.LogStreamService = LogStreamService = LogStreamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LogStreamService);
//# sourceMappingURL=log-stream.service.js.map