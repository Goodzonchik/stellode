export const readClipboardText = async (): Promise<string | null> => {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
};
