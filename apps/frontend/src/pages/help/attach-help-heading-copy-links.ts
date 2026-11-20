const copyButtonLabel = 'Копировать ссылку';

const buildSectionUrl = (slug: string, headingId: string): string =>
  `${window.location.origin}/help/${slug}#${headingId}`;

const createCopyButton = (
  slug: string,
  headingId: string,
  onCopied: (ok: boolean) => void,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-article__copy-link';
  button.setAttribute('aria-label', copyButtonLabel);
  button.title = copyButtonLabel;
  button.textContent = '#';
  button.addEventListener('click', () => {
    void navigator.clipboard
      .writeText(buildSectionUrl(slug, headingId))
      .then(() => onCopied(true))
      .catch(() => onCopied(false));
  });
  return button;
};

export const attachHelpHeadingCopyLinks = (
  root: HTMLElement,
  slug: string,
  onCopied: (ok: boolean) => void,
): void => {
  const headings = root.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
  headings.forEach((heading) => {
    if (heading.querySelector('.help-article__copy-link')) {
      return;
    }
    const headingId = heading.id;
    if (headingId.length === 0) {
      return;
    }
    heading.appendChild(createCopyButton(slug, headingId, onCopied));
  });
};
