/**
 * Clear Neo4j, then load CoolUnit / CoolUnit2 seed from cypher/*.cypher.
 *
 * Usage (from repo root, Neo4j from docker-compose):
 *   npm run db:reset
 *
 * Env: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openNeo4jSession } from './lib/open-neo4j-session.mjs';
import { printSeedSummary } from './lib/print-seed-summary.mjs';
import { runCypherFile } from './lib/run-cypher-file.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clearPath = join(__dirname, 'cypher', 'clear.cypher');
const seedPath = join(__dirname, 'cypher', 'seed.cypher');

const main = async () => {
  const { session, uri, close } = openNeo4jSession();
  try {
    const cleared = await runCypherFile(session, clearPath);
    console.log(`[db:reset] Cleared (${cleared} statement(s)) on ${uri}`);

    const seeded = await runCypherFile(session, seedPath);
    console.log(`[db:reset] Seeded (${seeded} statement(s)) on ${uri}`);

    await printSeedSummary(session, '[db:reset]');
    console.log('');
    console.log(`[db:reset] Reset CoolUnit / CoolUnit2 into Neo4j at ${uri}`);
  } finally {
    await close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
