import { Module } from '@nestjs/common';
import { ComponentVersionModule } from '../component-version/component-version.module';
import { FeatureVersionController } from './feature-version.controller';
import { FeatureVersionService } from './feature-version.service';

@Module({
  imports: [ComponentVersionModule],
  controllers: [FeatureVersionController],
  providers: [FeatureVersionService],
  exports: [FeatureVersionService],
})
export class FeatureVersionModule {}
