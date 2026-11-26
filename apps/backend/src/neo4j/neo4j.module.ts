import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';
import { Neo4jSchemaService } from './neo4j-schema.service';

@Global()
@Module({
  providers: [
    Neo4jService,
    Neo4jSchemaService,
    {
      provide: 'NEO4J_DRIVER',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('NEO4J_URI', 'bolt://localhost:7687');
        const user = configService.get<string>('NEO4J_USER', 'neo4j');
        const password = configService.get<string>('NEO4J_PASSWORD', 'stellode');
        return neo4j.driver(uri, neo4j.auth.basic(user, password), {
          disableLosslessIntegers: false,
        });
      },
    },
  ],
  exports: [Neo4jService],
})
export class Neo4jModule {}
