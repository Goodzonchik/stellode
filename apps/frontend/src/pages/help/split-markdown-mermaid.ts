import type { HelpMarkdownSegment } from './help-manifest.types';

const flushChunk = (
  lines: readonly string[],
  kind: HelpMarkdownSegment['kind'],
  result: HelpMarkdownSegment[],
): void => {
  if (lines.length === 0) {
    return;
  }
  result.push({ kind, content: lines.join('\n') });
};

export const splitMarkdownMermaid = (input: string): readonly HelpMarkdownSegment[] => {
  const result: HelpMarkdownSegment[] = [];
  const lines = input.split('\n');
  let currentChunk: string[] = [];
  let inMermaid = false;

  for (const line of lines) {
    if (!inMermaid && line.startsWith('```mermaid')) {
      flushChunk(currentChunk, 'markdown', result);
      currentChunk = [];
      inMermaid = true;
      continue;
    }
    if (inMermaid && line.trim() === '```') {
      flushChunk(currentChunk, 'mermaid', result);
      currentChunk = [];
      inMermaid = false;
      continue;
    }
    currentChunk.push(line);
  }

  flushChunk(currentChunk, inMermaid ? 'mermaid' : 'markdown', result);
  return result;
};
