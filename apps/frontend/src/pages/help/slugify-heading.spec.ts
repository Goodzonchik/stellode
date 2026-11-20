import { slugifyHeading } from './slugify-heading';

describe('slugifyHeading', () => {
  it('slugifies russian and latin headings', () => {
    expect(slugifyHeading('О продукте')).toBe('о-продукте');
    expect(slugifyHeading('What is Stellode?')).toBe('what-is-stellode');
  });
});
