import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attachHelpFullView } from './attach-help-full-view';
import { attachHelpHeadingCopyLinks } from './attach-help-heading-copy-links';
import type { HelpFullViewContent } from './help-full-view-content';
import type { HelpMarkdownSegment } from './help-manifest.types';
import { HelpFullViewOverlay } from './HelpFullViewOverlay';
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
  const [fullView, setFullView] = useState<HelpFullViewContent | null>(null);
  const onOpenFullView = useCallback((content: HelpFullViewContent) => {
    setFullView(content);
  }, []);
  const onCloseFullView = useCallback(() => {
    setFullView(null);
  }, []);

  const renderedSegments = useMemo(
    () =>
      segments.map((segment) => {
        if (segment.kind === 'mermaid') {
          return segment;
        }
        return {
          kind: 'markdown' as const,
          html: parseHelpMarkdownHtml(segment.content, markdownFile),
        };
      }),
    [segments, markdownFile],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    let cancelled = false;
    let detachFullView = attachHelpFullView(root, onOpenFullView);
    attachHelpHeadingCopyLinks(root, slug, onCopyResult);
    void runHelpMermaid(root)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) {
          return;
        }
        detachFullView();
        detachFullView = attachHelpFullView(root, onOpenFullView);
        if (cancelled) {
          detachFullView();
          return;
        }
        const headingId = window.location.hash.replace(/^#/, '');
        if (headingId.length === 0) {
          return;
        }
        document.getElementById(headingId)?.scrollIntoView();
      });
    return () => {
      cancelled = true;
      detachFullView();
    };
  }, [renderedSegments, slug, onCopyResult, onOpenFullView]);

  return (
    <>
      <article className="help-article" ref={rootRef}>
        {renderedSegments.map((segment, index) => {
          if (segment.kind === 'mermaid') {
            return (
              <pre key={`mermaid-${index}`} className="mermaid">
                {segment.content}
              </pre>
            );
          }
          return (
            <div
              key={`markdown-${index}`}
              className="help-article__markdown"
              dangerouslySetInnerHTML={{ __html: segment.html }}
            />
          );
        })}
      </article>
      <HelpFullViewOverlay content={fullView} onClose={onCloseFullView} />
    </>
  );
};
