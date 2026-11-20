import mermaid from 'mermaid';
import { ensureMermaidInitialized } from './ensure-mermaid-initialized';

export const runMermaidInContainer = async (container: HTMLElement): Promise<void> => {
  ensureMermaidInitialized();
  const nodes = container.querySelectorAll<HTMLElement>('.mermaid');
  if (nodes.length === 0) return;
  await mermaid.run({ nodes: Array.from(nodes) });
};
