import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';
import { Writable, PassThrough } from 'stream';

interface StreamOptions {
  streamId: string;
  namespace: string;
  podName: string;
  container?: string;
  onLine: (line: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

interface ActiveStream {
  passThrough: PassThrough;
  abortController: AbortController | null;
  options: StreamOptions;
}

@Injectable()
export class LogStreamService {
  private readonly logger = new Logger(LogStreamService.name);
  private kc: k8s.KubeConfig;
  private coreApi: k8s.CoreV1Api;
  private activeStreams: Map<string, ActiveStream> = new Map();

  constructor(private configService: ConfigService) {
    this.kc = new k8s.KubeConfig();

    const kubeconfigPath = this.configService.get<string>('KUBECONFIG_PATH');
    if (kubeconfigPath) {
      this.kc.loadFromFile(kubeconfigPath);
    } else {
      try {
        this.kc.loadFromCluster();
      } catch {
        this.kc.loadFromDefault();
      }
    }

    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async startStream(options: StreamOptions): Promise<void> {
    const { streamId, namespace, podName, container, onLine, onError, onEnd } = options;

    // Stop existing stream if any
    if (this.activeStreams.has(streamId)) {
      this.stopStream(streamId);
    }

    const passThrough = new PassThrough();

    this.activeStreams.set(streamId, {
      passThrough,
      abortController: null,
      options,
    });

    try {
      // First get historical logs
      try {
        const logOptions: {
          namespace: string;
          name: string;
          container?: string;
          tailLines: number;
        } = {
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
      } catch (err) {
        this.logger.warn(`Failed to get historical logs: ${err}`);
      }

      // Set up stream handling
      let buffer = '';

      passThrough.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            onLine(line);
          }
        }
      });

      passThrough.on('error', (err: Error) => {
        this.logger.error(`Stream error for ${streamId}: ${err.message}`);
        onError(err.message);
        this.cleanupStream(streamId);
      });

      passThrough.on('end', () => {
        // Process any remaining buffer
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

      // Start log stream using the Log class
      const logClient = new k8s.Log(this.kc);
      const containerName = container || '';

      const abortController = await logClient.log(
        namespace,
        podName,
        containerName,
        passThrough as Writable,
        {
          follow: true,
          tailLines: 0,
          timestamps: true,
        },
      );

      const activeStream = this.activeStreams.get(streamId);
      if (activeStream) {
        activeStream.abortController = abortController;
      }

    } catch (error) {
      this.logger.error(`Failed to start stream for ${streamId}: ${error}`);
      onError(String(error));
      this.cleanupStream(streamId);
      throw error;
    }
  }

  stopStream(streamId: string): void {
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

  private cleanupStream(streamId: string): void {
    this.activeStreams.delete(streamId);
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }
}
