import type { HelpFullViewContent } from './help-full-view-content';

const MERMAID_ZOOMABLE_CLASS = 'help-article__mermaid--zoomable';

const readImageContent = (image: HTMLImageElement): HelpFullViewContent => ({
  kind: 'image',
  src: image.getAttribute('src') ?? image.src,
  alt: image.alt,
});

const readMermaidContent = (block: HTMLElement): HelpFullViewContent | null => {
  const svg = block.querySelector('svg');
  if (svg === null) {
    return null;
  }
  return { kind: 'mermaid', svgHtml: svg.outerHTML };
};

const markZoomableMermaid = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLElement>('.mermaid').forEach((block) => {
    if (block.querySelector('svg') === null) {
      block.classList.remove(MERMAID_ZOOMABLE_CLASS);
      return;
    }
    block.classList.add(MERMAID_ZOOMABLE_CLASS);
  });
};

const clearZoomableMermaid = (root: HTMLElement): void => {
  root.querySelectorAll(`.${MERMAID_ZOOMABLE_CLASS}`).forEach((block) => {
    block.classList.remove(MERMAID_ZOOMABLE_CLASS);
  });
};

const resolveClickContent = (
  root: HTMLElement,
  target: EventTarget | null,
): HelpFullViewContent | null => {
  if (!(target instanceof Element) || !root.contains(target)) {
    return null;
  }
  const image = target.closest('img');
  if (image instanceof HTMLImageElement && root.contains(image)) {
    return readImageContent(image);
  }
  const block = target.closest('.mermaid');
  if (!(block instanceof HTMLElement) || !root.contains(block)) {
    return null;
  }
  return readMermaidContent(block);
};

export const attachHelpFullView = (
  root: HTMLElement,
  onOpen: (content: HelpFullViewContent) => void,
): (() => void) => {
  markZoomableMermaid(root);
  const onClick = (event: MouseEvent): void => {
    const content = resolveClickContent(root, event.target);
    if (content !== null) {
      onOpen(content);
    }
  };
  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
    clearZoomableMermaid(root);
  };
};
