import { Injectable, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';

const UNIQUE_ID_LABELS: readonly string[] = [
  'Unit',
  'Team',
  'Application',
  'ApplicationVersion',
  'Service',
  'Feature',
  'FeatureVersion',
  'Component',
  'ComponentVersion',
];

const constraintName = (label: string): string => `${label.toLowerCase()}_id_unique`;

@Injectable()
export class Neo4jSchemaService implements OnModuleInit {
  constructor(private readonly neo4jService: Neo4jService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureConstraints();
  }

  private async ensureConstraints(): Promise<void> {
    for (const label of UNIQUE_ID_LABELS) {
      await this.neo4jService.write(
        `CREATE CONSTRAINT ${constraintName(label)} IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`,
      );
    }
  }
}
