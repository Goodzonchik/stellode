import { readFile } from 'fs/promises';

/**
 * Strip full-line `//` comments.
 * @param {string} source
 * @returns {string}
 */
const stripLineComments = (source) =>
  source
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      return trimmed.startsWith('//') ? '' : line;
    })
    .join('\n');

/**
 * Split Cypher source into statements on `;` outside single-quoted strings.
 * @param {string} source
 * @returns {string[]}
 */
const splitCypherStatements = (source) => {
  const statements = [];
  let current = '';
  let inString = false;
  let escaped = false;

  for (const char of source) {
    if (inString) {
      current += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === "'") {
        inString = false;
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }

    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing.length > 0) {
    statements.push(trailing);
  }

  return statements;
};

/**
 * Read a `.cypher` file and run each statement on the given Neo4j session.
 * @param {{ run: (query: string) => Promise<unknown> }} session
 * @param {string} filePath
 * @returns {Promise<number>} number of statements executed
 */
export const runCypherFile = async (session, filePath) => {
  const raw = await readFile(filePath, 'utf8');
  const statements = splitCypherStatements(stripLineComments(raw));
  for (const statement of statements) {
    await session.run(statement);
  }
  return statements.length;
};
