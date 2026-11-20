/**
 * Export named Unit subgraphs from Neo4j into scripts/cypher/seed.cypher.
 *
 * Usage (from repo root):
 *   node scripts/db-export-units-seed.mjs CoolUnit CoolUnit2
 *
 * Backs up existing seed.cypher to seed.cypher.bak before overwrite.
 */
import { copyFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import neo4j from 'neo4j-driver';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, 'cypher', 'seed.cypher');
const backupPath = join(__dirname, 'cypher', 'seed.cypher.bak');

const uri = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const user = process.env.NEO4J_USER ?? 'neo4j';
const password = process.env.NEO4J_PASSWORD ?? 'stellode';

const unitNames = process.argv.slice(2);
if (unitNames.length === 0) {
  console.error('Usage: node scripts/db-export-units-seed.mjs <UnitName> [UnitName...]');
  process.exitCode = 1;
  process.exit();
}

const toPlain = (value) => {
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toPlain(entry)]),
    );
  }
  return value;
};

const escapeCypherString = (text) =>
  String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const formatCypherValue = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'string') return `'${escapeCypherString(value)}'`;
  if (typeof value === 'object') {
    return `'${escapeCypherString(JSON.stringify(value))}'`;
  }
  return `'${escapeCypherString(String(value))}'`;
};

const formatProps = (props) =>
  Object.entries(props)
    .map(([key, value]) => `${key}: ${formatCypherValue(value)}`)
    .join(', ');

const labelOrder = {
  Unit: 0,
  Team: 1,
  Service: 2,
  Feature: 3,
  Application: 4,
  Component: 5,
  FeatureVersion: 6,
  ApplicationVersion: 7,
  ComponentVersion: 8,
};

const sortNodes = (nodes) =>
  [...nodes].sort((left, right) => {
    const leftOrder = labelOrder[left.labels[0]] ?? 50;
    const rightOrder = labelOrder[right.labels[0]] ?? 50;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left.props.id).localeCompare(String(right.props.id));
  });

const collectSubgraph = async (session, names) => {
  const result = await session.run(
    `
    MATCH (u:Unit)
    WHERE u.name IN $names
    WITH collect(u.id) AS unitIds
    MATCH (owned)
    WHERE owned.unitId IN unitIds OR (owned:Unit AND owned.id IN unitIds)
    OPTIONAL MATCH (owned)-[:HAS_VERSION|HAS_DRAFT|MAINTAINS]->(child)
    OPTIONAL MATCH (child)-[:HAS_VERSION|HAS_DRAFT]->(grandchild)
    WITH unitIds,
         collect(DISTINCT owned) + collect(DISTINCT child) + collect(DISTINCT grandchild) AS bag
    UNWIND bag AS n
    WITH unitIds, collect(DISTINCT n) AS nodes
    UNWIND nodes AS a
    OPTIONAL MATCH (a)-[r]->(b)
    WHERE b IN nodes
    WITH unitIds, nodes, collect(DISTINCT CASE WHEN r IS NULL THEN NULL ELSE {
      type: type(r),
      props: properties(r),
      fromId: a.id,
      toId: b.id,
      fromLabel: labels(a)[0],
      toLabel: labels(b)[0]
    } END) AS relBags
    RETURN [n IN nodes | {labels: labels(n), props: properties(n)}] AS nodes,
           [r IN relBags WHERE r IS NOT NULL] AS rels,
           unitIds
    `,
    { names },
  );
  if (result.records.length === 0) {
    throw new Error(`No subgraph found for units: ${names.join(', ')}`);
  }
  const record = result.records[0];
  return {
    nodes: toPlain(record.get('nodes')),
    rels: toPlain(record.get('rels')),
    unitIds: toPlain(record.get('unitIds')),
  };
};

const buildSeedSource = (names, nodes, rels) => {
  const lines = [];
  lines.push(
    `// Seed exported from live Neo4j: units ${names.join(', ')}.`,
  );
  lines.push('// IDs are stable and must not change after commit.');
  lines.push('// Run via: npm run db:seed  or  npm run db:reset');
  lines.push('// Note: CoolUnit Feature SendEmail has no FeatureVersion v1 (pruned before export).');
  lines.push('');

  for (const node of sortNodes(nodes)) {
    const label = node.labels[0];
    const props = formatProps(node.props);
    lines.push(`CREATE (n:${label} {${props}});`);
  }

  lines.push('');
  lines.push('// Relationships');
  for (const rel of rels) {
    const props = formatProps(rel.props ?? {});
    const relBody = props.length > 0 ? ` {${props}}` : '';
    lines.push(
      `MATCH (a:${rel.fromLabel} {id: ${formatCypherValue(rel.fromId)}})`,
    );
    lines.push(
      `MATCH (b:${rel.toLabel} {id: ${formatCypherValue(rel.toId)}})`,
    );
    lines.push(`CREATE (a)-[:${rel.type}${relBody}]->(b);`);
  }

  lines.push('');
  return lines.join('\n');
};

const main = async () => {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  try {
    const existing = await session.run(
      `MATCH (u:Unit) WHERE u.name IN $names RETURN u.name AS name ORDER BY u.name`,
      { names: unitNames },
    );
    const foundNames = existing.records.map((r) => r.get('name'));
    const missing = unitNames.filter((name) => !foundNames.includes(name));
    if (missing.length > 0) {
      throw new Error(`Units not found: ${missing.join(', ')}`);
    }

    const { nodes, rels, unitIds } = await collectSubgraph(session, unitNames);
    console.log(
      `[export] units=${foundNames.join(', ')} ids=${unitIds.join(', ')} nodes=${nodes.length} rels=${rels.length}`,
    );

    await copyFile(seedPath, backupPath);
    console.log(`[export] Backup written: ${backupPath}`);

    const source = buildSeedSource(unitNames, nodes, rels);
    await writeFile(seedPath, source, 'utf8');
    console.log(`[export] Seed written: ${seedPath}`);
  } finally {
    await session.close();
    await driver.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
