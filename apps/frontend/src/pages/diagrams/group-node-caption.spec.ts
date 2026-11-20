import { groupNodeCaption } from './group-node-caption';

describe('groupNodeCaption', () => {
  it('returns only label for Unit', () => {
    expect(
      groupNodeCaption({
        label: 'CRM-Unit',
        type: 'unit',
        actualVersion: '9',
      }),
    ).toBe('CRM-Unit');
  });

  it('keeps name · version for Application', () => {
    expect(
      groupNodeCaption({
        label: 'FrontApp',
        type: 'app',
        actualVersion: '1.0.0',
      }),
    ).toBe('FrontApp · 1.0.0');
  });

  it('returns only label for Application without pinned or current version', () => {
    expect(
      groupNodeCaption({
        label: 'FrontApp',
        type: 'app',
      }),
    ).toBe('FrontApp');
  });
});
