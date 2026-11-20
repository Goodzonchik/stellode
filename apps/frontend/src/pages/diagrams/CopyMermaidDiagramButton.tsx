import { Button, Tooltip } from 'antd';
import type { ViewEdge, ViewNode } from '@stellode/models';
import { ToastVariant, useToast } from '../../hooks/useToast';
import type { LayoutDirection } from './layout-direction';
import { MermaidIcon } from './MermaidIcon';
import { viewDiagramToMermaid } from './view-diagram-to-mermaid';
import { writeClipboardText } from './write-clipboard-text';
import './CopyMermaidDiagramButton.css';

type CopyMermaidDiagramButtonProps = {
  readonly nodes: readonly ViewNode[];
  readonly edges: readonly ViewEdge[];
  readonly getDirection: () => LayoutDirection;
};

export const CopyMermaidDiagramButton = ({
  nodes,
  edges,
  getDirection,
}: CopyMermaidDiagramButtonProps) => {
  const { showToast } = useToast();

  const handleClick = async (): Promise<void> => {
    const text = viewDiagramToMermaid(nodes, edges, getDirection());
    const ok = await writeClipboardText(text);
    if (ok) {
      showToast('Mermaid-диаграмма скопирована', ToastVariant.Success);
      return;
    }
    showToast('Не удалось скопировать mermaid-диаграмму', ToastVariant.Error);
  };

  return (
    <Tooltip title="Скопировать Mermaid">
      <Button
        htmlType="button"
        className="copy-mermaid-diagram-button"
        aria-label="Скопировать Mermaid"
        icon={<MermaidIcon className="copy-mermaid-diagram-button__icon" />}
        onClick={() => void handleClick()}
      />
    </Tooltip>
  );
};
