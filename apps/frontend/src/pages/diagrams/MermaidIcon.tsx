import mermaidIconUrl from './mermaid-icon.png';

type MermaidIconProps = {
  readonly className?: string;
};

export const MermaidIcon = ({ className }: MermaidIconProps) => (
  <img
    className={className}
    src={mermaidIconUrl}
    width={16}
    height={16}
    alt=""
    aria-hidden
  />
);
