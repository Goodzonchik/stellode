export const readHelpFullViewSvgSize = (
  svg: SVGSVGElement,
): { readonly width: number; readonly height: number } | null => {
  try {
    const box = svg.getBBox();
    if (box.width > 0 && box.height > 0) {
      return { width: box.width, height: box.height };
    }
  } catch {
    return null;
  }
  const width = Number(svg.getAttribute('width')) || svg.clientWidth;
  const height = Number(svg.getAttribute('height')) || svg.clientHeight;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
};
