import { Module } from '@nestjs/common';
import { ComponentVersionController } from './component-version.controller';
import { ComponentVersionService } from './component-version.service';
import { StatusWarningModule } from '../status-warning/status-warning.module';

@Module({
  imports: [StatusWarningModule],
  controllers: [ComponentVersionController],
  providers: [ComponentVersionService],
  exports: [ComponentVersionService],
})
export class ComponentVersionModule {}
