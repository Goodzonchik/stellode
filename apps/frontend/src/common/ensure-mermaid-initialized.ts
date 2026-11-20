import mermaid from 'mermaid';

let isInitialized = false;

export const ensureMermaidInitialized = (): void => {
  if (isInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
  });
  isInitialized = true;
};
