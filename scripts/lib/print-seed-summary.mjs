/**
 * Print CoolUnit / CoolUnit2 verification hints from the live graph.
 * @param {import('neo4j-driver').Session} session
 * @param {string} logPrefix
 * @returns {Promise<void>}
 */
export const printSeedSummary = async (session, logPrefix) => {
  const unitsResult = await session.run(
    `MATCH (t:Unit) RETURN t.id AS id, t.name AS name, t.description AS description ORDER BY t.name`,
  );
  const crossUnitResult = await session.run(
    `
    MATCH (from:ComponentVersion)-[:DEPENDS_ON]->(to:ComponentVersion)
    WHERE from.unitId <> to.unitId
    OPTIONAL MATCH (fromComp:Component)-[:HAS_VERSION|HAS_DRAFT]->(from)
    OPTIONAL MATCH (toComp:Component)-[:HAS_VERSION|HAS_DRAFT]->(to)
    RETURN coalesce(from.name, fromComp.name, from.id) AS fromName, from.id AS fromId,
           coalesce(to.name, toComp.name, to.id) AS toName, to.id AS toId
    ORDER BY fromName, toName
    `,
  );
  const sendEmailVersions = await session.run(
    `
    MATCH (u:Unit {name: 'CoolUnit'})-[:STAKEHOLDER]->(f:Feature {name: 'SendEmail'})
    MATCH (f)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)
    RETURN fv.id AS id, fv.versionNumber AS versionNumber, fv.version AS version, fv.status AS status
    ORDER BY fv.versionNumber
    `,
  );

  console.log('');
  console.log(`${logPrefix} Seed units:`);
  for (const record of unitsResult.records) {
    const description = record.get('description');
    console.log(`  Unit: ${record.get('name')} (${record.get('id')})`);
    if (description) {
      console.log(`    ${description}`);
    }
  }
  console.log('');
  console.log('  Island map:');
  console.log('    CoolUnit — Notifications (SendEmail + SendNotificationInApp)');
  console.log('    CoolUnit2 — SendEmail provider (cross-unit DEPENDS_ON)');
  console.log('');

  if (crossUnitResult.records.length > 0) {
    console.log(`${logPrefix} Cross-unit DEPENDS_ON:`);
    for (const record of crossUnitResult.records) {
      console.log(
        `  ${record.get('fromName')} (${record.get('fromId')}) → ${record.get('toName')} (${record.get('toId')})`,
      );
    }
    console.log('');
  }

  console.log(`${logPrefix} CoolUnit SendEmail FeatureVersions:`);
  if (sendEmailVersions.records.length === 0) {
    console.log('  (none)');
  }
  for (const record of sendEmailVersions.records) {
    console.log(
      `  vn=${record.get('versionNumber')} version=${record.get('version')} status=${record.get('status')} id=${record.get('id')}`,
    );
  }
  const hasV1 = sendEmailVersions.records.some((record) => {
    const versionNumber = record.get('versionNumber');
    const asNumber =
      typeof versionNumber?.toNumber === 'function'
        ? versionNumber.toNumber()
        : Number(versionNumber);
    return asNumber === 1;
  });
  if (hasV1) {
    console.log('  WARNING: SendEmail still has FeatureVersion with versionNumber = 1');
  } else {
    console.log('  OK: no FeatureVersion with versionNumber = 1');
  }
  console.log('');
};
