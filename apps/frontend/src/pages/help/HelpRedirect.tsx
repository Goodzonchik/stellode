import { useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { loadHelpManifest } from './load-help-manifest';
import './Help.css';

export const HelpRedirect = () => {
  const { showToast } = useToast();
  const [firstSlug, setFirstSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHelpManifest()
      .then((pages) => {
        if (cancelled) {
          return;
        }
        const slug = pages[0]?.slug;
        if (!slug) {
          setError('В справке нет страниц');
          return;
        }
        setFirstSlug(slug);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Не удалось загрузить оглавление';
        setError(message);
        showToast(message, ToastVariant.Error);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  if (error !== null) {
    return (
      <section className="help-page">
        <Alert type="error" showIcon title={error} />
      </section>
    );
  }

  if (firstSlug === null) {
    return (
      <div className="help-page help-page--loading">
        <Spin size="large" />
      </div>
    );
  }

  return <Navigate to={`/help/${firstSlug}`} replace />;
};
