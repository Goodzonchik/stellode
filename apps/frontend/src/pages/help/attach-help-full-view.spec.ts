/**
 * @jest-environment jsdom
 */
import { attachHelpFullView } from './attach-help-full-view';
import type { HelpFullViewContent } from './help-full-view-content';

const createRoot = (html: string): HTMLElement => {
  const root = document.createElement('article');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

describe('attachHelpFullView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens image full-view on img click', () => {
    const root = createRoot('<img src="/help/a.png" alt="diagram">');
    const opened: HelpFullViewContent[] = [];
    attachHelpFullView(root, (content) => opened.push(content));
    root.querySelector('img')?.click();
    expect(opened).toEqual([{ kind: 'image', src: '/help/a.png', alt: 'diagram' }]);
  });

  it('opens image again after DOM replace', () => {
    const root = createRoot('<img src="/help/a.png" alt="diagram">');
    const opened: HelpFullViewContent[] = [];
    attachHelpFullView(root, (content) => opened.push(content));
    root.querySelector('img')?.click();
    root.innerHTML = '<img src="/help/a.png" alt="diagram">';
    root.querySelector('img')?.click();
    expect(opened).toHaveLength(2);
  });

  it('opens mermaid full-view on diagram click', () => {
    const root = createRoot('<pre class="mermaid"><svg><rect /></svg></pre>');
    const opened: HelpFullViewContent[] = [];
    attachHelpFullView(root, (content) => opened.push(content));
    const block = root.querySelector('.mermaid');
    expect(block?.classList.contains('help-article__mermaid--zoomable')).toBe(true);
    (block as HTMLElement).click();
    expect(opened).toHaveLength(1);
    expect(opened[0]?.kind).toBe('mermaid');
  });

  it('cleanup removes delegated click handler', () => {
    const root = createRoot(
      '<img src="/help/a.png" alt="x"><pre class="mermaid"><svg></svg></pre>',
    );
    const opened: HelpFullViewContent[] = [];
    const cleanup = attachHelpFullView(root, (content) => opened.push(content));
    cleanup();
    root.querySelector('img')?.click();
    (root.querySelector('.mermaid') as HTMLElement).click();
    expect(opened).toEqual([]);
    expect(
      root.querySelector('.mermaid')?.classList.contains('help-article__mermaid--zoomable'),
    ).toBe(false);
  });

  it('skips mermaid blocks without svg', () => {
    const root = createRoot('<pre class="mermaid">flowchart LR</pre>');
    const opened: HelpFullViewContent[] = [];
    attachHelpFullView(root, (content) => opened.push(content));
    (root.querySelector('.mermaid') as HTMLElement).click();
    expect(opened).toEqual([]);
  });
});
