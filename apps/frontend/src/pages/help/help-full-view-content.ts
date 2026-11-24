export type HelpFullViewContent =
  | { readonly kind: 'image'; readonly src: string; readonly alt: string }
  | { readonly kind: 'mermaid'; readonly svgHtml: string };
