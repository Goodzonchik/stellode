/**
 * Copy canonical user help from docs/help into apps/frontend/public/help.
 *
 * Usage (from repo root):
 *   npm run help:sync
 *
 * Skips docs/help/README.md (SPA TOC comes from manifest.json).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceRoot = join(__dirname, '..', 'docs', 'help');
const targetRoot = join(__dirname, '..', 'apps', 'frontend', 'public', 'help');

const assertSourceExists = () => {
  if (existsSync(sourceRoot)) {
    return;
  }
  throw new Error(`[help:sync] Source not found: ${sourceRoot}`);
};

const clearTarget = () => {
  if (!existsSync(targetRoot)) {
    return;
  }
  rmSync(targetRoot, { recursive: true, force: true });
};

const copyHelpTree = () => {
  mkdirSync(dirname(targetRoot), { recursive: true });
  cpSync(sourceRoot, targetRoot, {
    recursive: true,
    filter: (sourcePath) => {
      const baseName = sourcePath.split(/[/\\]/).pop() ?? '';
      return baseName !== 'README.md';
    },
  });
};

const main = () => {
  assertSourceExists();
  clearTarget();
  copyHelpTree();
  console.log(`[help:sync] Copied ${sourceRoot} -> ${targetRoot}`);
};

main();
