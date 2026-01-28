import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { LogStreamService } from './log-stream.service';

@Module({
  providers: [EventsGateway, LogStreamService],
  exports: [EventsGateway, LogStreamService],
})
export class EventsModule {}
