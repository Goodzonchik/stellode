export const escapeMermaidLabel = (text: string): string =>
  text.replace(/"/g, '#quot;');
