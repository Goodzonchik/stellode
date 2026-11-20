import { splitMarkdownMermaid } from './split-markdown-mermaid';

describe('splitMarkdownMermaid', () => {
  it('keeps plain markdown as one segment', () => {
    expect(splitMarkdownMermaid('# Title\n\nText')).toEqual([
      { kind: 'markdown', content: '# Title\n\nText' },
    ]);
  });

  it('extracts mermaid blocks separately', () => {
    const input = ['Intro', '```mermaid', 'flowchart LR', 'A --> B', '```', 'Outro'].join(
      '\n',
    );
    expect(splitMarkdownMermaid(input)).toEqual([
      { kind: 'markdown', content: 'Intro' },
      { kind: 'mermaid', content: 'flowchart LR\nA --> B' },
      { kind: 'markdown', content: 'Outro' },
    ]);
  });
});
