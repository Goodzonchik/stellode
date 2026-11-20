import { Module } from '@nestjs/common';
import { StatusWarningService } from './status-warning.service';

@Module({
  providers: [StatusWarningService],
  exports: [StatusWarningService],
})
export class StatusWarningModule {}
