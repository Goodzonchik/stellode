export const helpSlugFromFile = (file: string): string => {
  const segments = file.split('/');
  const baseName = segments[segments.length - 1] ?? file;
  return baseName.replace(/\.md$/i, '');
};
