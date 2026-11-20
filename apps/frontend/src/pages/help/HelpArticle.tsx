import { useEffect, useRef } from 'react';
import { attachHelpHeadingCopyLinks } from './attach-help-heading-copy-links';
import type { HelpMarkdownSegment } from './help-manifest.types';
import { parseHelpMarkdownHtml } from './parse-help-markdown-html';
import { runHelpMermaid } from './run-help-mermaid';

type HelpArticleProps = {
  readonly segments: readonly HelpMarkdownSegment[];
  readonly markdownFile: string;
  readonly slug: string;
  readonly onCopyResult: (ok: boolean) => void;
};

export const HelpArticle = ({
  segments,
  markdownFile,
  slug,
  onCopyResult,
}: HelpArticleProps) => {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    attachHelpHeadingCopyLinks(root, slug, onCopyResult);
    void runHelpMermaid(root)
      .catch(() => undefined)
      .finally(() => {
        const headingId = window.location.hash.replace(/^#/, '');
        if (headingId.length === 0) {
          return;
        }
        document.getElementById(headingId)?.scrollIntoView();
      });
  }, [segments, slug, onCopyResult]);

  return (
    <article className="help-article" ref={rootRef}>
      {segments.map((segment, index) => {
        if (segment.kind === 'mermaid') {
          return (
            <pre key={`mermaid-${index}`} className="mermaid">
              {segment.content}
            </pre>
          );
        }
        const html = parseHelpMarkdownHtml(segment.content, markdownFile);
        return (
          <div
            key={`markdown-${index}`}
            className="help-article__markdown"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </article>
  );
};
