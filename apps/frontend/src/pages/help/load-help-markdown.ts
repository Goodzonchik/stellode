export const loadHelpMarkdown = async (file: string): Promise<string> => {
  const response = await fetch(`/help/${file}`);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу (${response.status})`);
  }
  return response.text();
};
