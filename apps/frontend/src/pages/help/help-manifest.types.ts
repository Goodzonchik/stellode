export type HelpManifestItem = {
  readonly title: string;
  readonly file: string;
};

export type HelpPage = {
  readonly title: string;
  readonly file: string;
  readonly slug: string;
};

export type HelpMarkdownSegment =
  | { readonly kind: 'markdown'; readonly content: string }
  | { readonly kind: 'mermaid'; readonly content: string };
