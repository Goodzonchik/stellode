import { Module } from '@nestjs/common';
import { ApplicationVersionController } from './application-version.controller';
import { ApplicationVersionService } from './application-version.service';

@Module({
  controllers: [ApplicationVersionController],
  providers: [ApplicationVersionService],
  exports: [ApplicationVersionService],
})
export class ApplicationVersionModule {}
