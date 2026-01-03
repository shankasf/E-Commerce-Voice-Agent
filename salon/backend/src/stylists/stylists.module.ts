import { Module } from '@nestjs/common';
import { StylistsService } from './stylists.service';
import { StylistsController } from './stylists.controller';

@Module({
  providers: [StylistsService],
  controllers: [StylistsController],
  exports: [StylistsService],
})
export class StylistsModule {}
