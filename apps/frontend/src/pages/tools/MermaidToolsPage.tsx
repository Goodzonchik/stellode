import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { runMermaidInContainer } from '../../common/run-mermaid-in-container';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { readClipboardText } from '../../common/read-clipboard-text';
import { readMermaidToolsSession } from './read-mermaid-tools-session';
import { writeMermaidToolsSession } from './write-mermaid-tools-session';
import './MermaidToolsPage.css';

const PREVIEW_DEBOUNCE_MS = 300;

export const MermaidToolsPage = () => {
  const { showToast } = useToast();
  const [source, setSource] = useState(() => readMermaidToolsSession());
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [previewSource, setPreviewSource] = useState(source);
  const previewRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreviewSource(source);
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    writeMermaidToolsSession(source);
  }, [source]);

  useEffect(() => {
    const root = previewRootRef.current;
    if (root === null) return;
    root.innerHTML = '';
    if (previewSource.trim().length === 0) return;
    const pre = document.createElement('pre');
    pre.className = 'mermaid';
    pre.textContent = previewSource;
    root.appendChild(pre);
    void runMermaidInContainer(root);
  }, [previewSource]);

  const handlePasteFromClipboard = async (): Promise<void> => {
    const text = await readClipboardText();
    if (text === null) {
      showToast('Не удалось вставить из буфера', ToastVariant.Error);
      return;
    }
    setSource(text);
  };

  const bodyClassName = editorCollapsed
    ? 'mermaid-tools-page__body mermaid-tools-page__body--editor-collapsed'
    : 'mermaid-tools-page__body';

  return (
    <section className="mermaid-tools-page">
      <header className="mermaid-tools-page__header">
        <h1 className="mermaid-tools-page__title">Mermaid</h1>
        <Button htmlType="button" onClick={() => void handlePasteFromClipboard()}>
          Вставить из буфера
        </Button>
        <Button htmlType="button" onClick={() => setEditorCollapsed((value) => !value)}>
          {editorCollapsed ? 'Развернуть' : 'Свернуть'}
        </Button>
      </header>
      <div className={bodyClassName}>
        {editorCollapsed ? null : (
          <div className="mermaid-tools-page__editor">
            <textarea
              className="mermaid-tools-page__textarea"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              spellCheck={false}
              aria-label="Код Mermaid"
            />
          </div>
        )}
        <div className="mermaid-tools-page__preview" ref={previewRootRef} />
      </div>
    </section>
  );
};
