/**
 * Load CoolUnit / CoolUnit2 seed graph into Neo4j from cypher/seed.cypher.
 *
 * Usage (from repo root, Neo4j from docker-compose):
 *   npm run db:seed
 *
 * Prefer `npm run db:reset` when the DB already has data (unique id constraints).
 *
 * Env: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openNeo4jSession } from './lib/open-neo4j-session.mjs';
import { printSeedSummary } from './lib/print-seed-summary.mjs';
import { runCypherFile } from './lib/run-cypher-file.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, 'cypher', 'seed.cypher');

const main = async () => {
  const { session, uri, close } = openNeo4jSession();
  try {
    const count = await runCypherFile(session, seedPath);
    console.log(`[db:seed] Executed ${count} statement(s) against ${uri}`);
    await printSeedSummary(session, '[db:seed]');
    console.log('');
    console.log(`[db:seed] Seeded CoolUnit / CoolUnit2 into Neo4j at ${uri}`);
  } finally {
    await close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
