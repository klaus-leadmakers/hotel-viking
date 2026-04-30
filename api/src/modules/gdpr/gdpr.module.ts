import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { User } from '../users/entities/user.entity';
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [GdprController],
  providers: [GdprService],
})
export class GdprModule {}
