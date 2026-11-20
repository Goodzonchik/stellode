import 'dotenv/config';
import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const user = process.env.NEO4J_USER ?? 'neo4j';
const password = process.env.NEO4J_PASSWORD ?? 'stellode';

/**
 * Open a Neo4j driver/session pair with a close helper.
 * @returns {{
 *   driver: import('neo4j-driver').Driver,
 *   session: import('neo4j-driver').Session,
 *   uri: string,
 *   close: () => Promise<void>
 * }}
 */
export const openNeo4jSession = () => {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  const close = async () => {
    await session.close();
    await driver.close();
  };
  return { driver, session, uri, close };
};
