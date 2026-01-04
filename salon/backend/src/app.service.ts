import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'healthy',
      service: 'GlamBook Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
