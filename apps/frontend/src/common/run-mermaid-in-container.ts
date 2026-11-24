import mermaid from 'mermaid';
import { ensureMermaidInitialized } from './ensure-mermaid-initialized';

const runMermaidNode = async (node: HTMLElement): Promise<void> => {
  await mermaid.run({ nodes: [node] });
};

export const runMermaidInContainer = async (container: HTMLElement): Promise<void> => {
  ensureMermaidInitialized();
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('.mermaid'));
  if (nodes.length === 0) {
    return;
  }
  await Promise.all(
    nodes.map((node) => runMermaidNode(node).catch(() => undefined)),
  );
};
