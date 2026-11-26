import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { DiagramModule } from '../diagram/diagram.module';
import { FeatureModule } from '../feature/feature.module';
import { TeamModule } from '../team/team.module';
import { UnitModule } from '../unit/unit.module';
import { ApplicationModule } from '../application/application.module';
import { ComponentModule } from '../component/component.module';
import { EdgeModule } from '../edge/edge.module';
import { ServiceModule } from '../service/service.module';
import { FeatureVersionModule } from '../feature-version/feature-version.module';
import { ApplicationVersionModule } from '../application-version/application-version.module';
import { ComponentVersionModule } from '../component-version/component-version.module';
import { ImpactModule } from '../impact/impact.module';
import { StatusWarningModule } from '../status-warning/status-warning.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    Neo4jModule,
    EventEmitterModule.forRoot(),
    FeatureModule,
    FeatureVersionModule,
    ApplicationVersionModule,
    ComponentVersionModule,
    TeamModule,
    ComponentModule,
    UnitModule,
    ApplicationModule,
    EdgeModule,
    ServiceModule,
    ImpactModule,
    StatusWarningModule,
    DiagramModule,
  ],
})
export class AppModule {}
