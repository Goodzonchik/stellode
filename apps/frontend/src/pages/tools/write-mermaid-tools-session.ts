import { MERMAID_TOOLS_STORAGE_KEY } from './mermaid-tools-storage-key';

export const writeMermaidToolsSession = (text: string): void => {
  try {
    sessionStorage.setItem(MERMAID_TOOLS_STORAGE_KEY, text);
  } catch {
    // ignore quota / private mode
  }
};
