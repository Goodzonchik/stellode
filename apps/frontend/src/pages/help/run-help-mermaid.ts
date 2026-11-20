import { runMermaidInContainer } from '../../common/run-mermaid-in-container';

export const runHelpMermaid = async (container: HTMLElement): Promise<void> => {
  await runMermaidInContainer(container);
};
