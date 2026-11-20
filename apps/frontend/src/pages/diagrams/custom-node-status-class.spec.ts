import { customNodeStatusClass } from './custom-node-status-class';

describe('customNodeStatusClass', () => {
  it('keeps draft/active/current visual modifiers', () => {
    expect(customNodeStatusClass('draft', undefined)).toBe('custom-node--status-draft');
    expect(customNodeStatusClass('active', undefined)).toBe('custom-node--status-active');
    expect(customNodeStatusClass('current', undefined)).toBe('custom-node--status-current');
    expect(customNodeStatusClass(undefined, 'active')).toBe('custom-node--app-status-active');
  });

  it('omits deprecated and unactive visual modifiers', () => {
    expect(customNodeStatusClass('deprecated', undefined)).toBe('');
    expect(customNodeStatusClass('unactive', undefined)).toBe('');
    expect(customNodeStatusClass(undefined, 'deprecated')).toBe('');
    expect(customNodeStatusClass('deprecated', 'deprecated')).toBe('');
  });

  it('keeps non-muted status when app-status is muted', () => {
    expect(customNodeStatusClass('active', 'deprecated')).toBe('custom-node--status-active');
  });
});
