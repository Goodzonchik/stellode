import { MERMAID_TOOLS_STORAGE_KEY } from './mermaid-tools-storage-key';

export const readMermaidToolsSession = (): string => {
  try {
    return sessionStorage.getItem(MERMAID_TOOLS_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};
