import { useCallback, useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { findHelpPageBySlug } from './find-help-page-by-slug';
import type { HelpMarkdownSegment, HelpPage } from './help-manifest.types';
import { HelpArticle } from './HelpArticle';
import { HelpToc } from './HelpToc';
import { loadHelpManifest } from './load-help-manifest';
import { loadHelpMarkdown } from './load-help-markdown';
import { splitMarkdownMermaid } from './split-markdown-mermaid';
import './Help.css';

export const Help = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [pages, setPages] = useState<readonly HelpPage[]>([]);
  const [segments, setSegments] = useState<readonly HelpMarkdownSegment[]>([]);
  const [isManifestLoading, setIsManifestLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsManifestLoading(true);
    void loadHelpManifest()
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        setPages(loaded);
        setManifestError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Не удалось загрузить оглавление';
        setManifestError(message);
        showToast(message, ToastVariant.Error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsManifestLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const selectedPage = slug ? findHelpPageBySlug(pages, slug) : undefined;
  const selectedFile = selectedPage?.file;

  useEffect(() => {
    if (!slug || pages.length === 0) {
      return;
    }
    if (!selectedFile) {
      setSegments([]);
      setPageError('Страница справки не найдена');
      return;
    }
    let cancelled = false;
    setIsPageLoading(true);
    setPageError(null);
    void loadHelpMarkdown(selectedFile)
      .then((markdown) => {
        if (cancelled) {
          return;
        }
        setSegments(splitMarkdownMermaid(markdown));
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Не удалось загрузить страницу';
        setPageError(message);
        showToast(message, ToastVariant.Error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsPageLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, pages, selectedFile, showToast]);

  const onSelectSlug = useCallback(
    (nextSlug: string) => {
      navigate(`/help/${nextSlug}`);
    },
    [navigate],
  );

  const onCopyResult = useCallback(
    (ok: boolean) => {
      if (ok) {
        showToast('Ссылка скопирована', ToastVariant.Success);
        return;
      }
      showToast('Не удалось скопировать ссылку', ToastVariant.Error);
    },
    [showToast],
  );

  if (isManifestLoading) {
    return (
      <div className="help-page help-page--loading">
        <Spin size="large" />
      </div>
    );
  }

  if (manifestError !== null) {
    return (
      <section className="help-page">
        <Alert type="error" showIcon title={manifestError} />
      </section>
    );
  }

  return (
    <section className="help-page">
      <HelpToc pages={pages} selectedSlug={slug} onSelectSlug={onSelectSlug} />
      <div className="help-page__content">
        {pageError !== null ? <Alert type="warning" showIcon title={pageError} /> : null}
        {isPageLoading ? (
          <div className="help-page__spinner">
            <Spin />
          </div>
        ) : null}
        {!isPageLoading && selectedPage && pageError === null ? (
          <HelpArticle
            key={selectedPage.slug}
            segments={segments}
            markdownFile={selectedPage.file}
            slug={selectedPage.slug}
            onCopyResult={onCopyResult}
          />
        ) : null}
      </div>
    </section>
  );
};
