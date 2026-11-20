/**
 * Clear all nodes and relationships in Neo4j.
 *
 * Usage (from repo root, Neo4j from docker-compose):
 *   npm run db:clear
 *
 * Env: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openNeo4jSession } from './lib/open-neo4j-session.mjs';
import { runCypherFile } from './lib/run-cypher-file.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clearPath = join(__dirname, 'cypher', 'clear.cypher');

const main = async () => {
  const { session, uri, close } = openNeo4jSession();
  try {
    const count = await runCypherFile(session, clearPath);
    console.log(`[db:clear] Executed ${count} statement(s) against ${uri}`);
    console.log('[db:clear] Database cleared (constraints preserved).');
  } finally {
    await close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
