import { Module } from '@nestjs/common';
import { MewsService } from './mews.service';
import { MewsController } from './mews.controller';
@Module({
  providers: [MewsService],
  controllers: [MewsController],
  exports: [MewsService],
})
export class MewsModule {}
