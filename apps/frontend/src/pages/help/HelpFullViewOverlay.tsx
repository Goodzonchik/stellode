import { useEffect } from 'react';
import type { HelpFullViewContent } from './help-full-view-content';
import { HelpFullViewMermaidViewer } from './HelpFullViewMermaidViewer';
import './HelpFullViewOverlay.css';

type HelpFullViewOverlayProps = {
  readonly content: HelpFullViewContent | null;
  readonly onClose: () => void;
};

const lockBodyScroll = (): (() => void) => {
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = previous;
  };
};

const bindEscapeClose = (onClose: () => void): (() => void) => {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      onClose();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
};

export const HelpFullViewOverlay = ({ content, onClose }: HelpFullViewOverlayProps) => {
  useEffect(() => {
    if (content === null) {
      return;
    }
    const unlock = lockBodyScroll();
    const unbindEscape = bindEscapeClose(onClose);
    return () => {
      unlock();
      unbindEscape();
    };
  }, [content, onClose]);

  if (content === null) {
    return null;
  }

  const isImage = content.kind === 'image';
  const contentClassName = isImage
    ? 'help-full-view__content help-full-view__content--image'
    : 'help-full-view__content';
  const body = isImage ? (
    <img src={content.src} alt={content.alt} />
  ) : (
    <HelpFullViewMermaidViewer svgHtml={content.svgHtml} />
  );

  return (
    <div
      className="help-full-view"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр на весь экран"
      onClick={onClose}
    >
      <button
        type="button"
        className="help-full-view__close"
        aria-label="Закрыть"
        onClick={onClose}
      >
        Закрыть
      </button>
      <div className={contentClassName} onClick={(event) => event.stopPropagation()}>
        {body}
      </div>
    </div>
  );
};
