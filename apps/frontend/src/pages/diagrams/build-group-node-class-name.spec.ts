import { buildGroupNodeClassName } from './build-group-node-class-name';

describe('buildGroupNodeClassName', () => {
  it('marks unit group without discrete accent classes', () => {
    const className = buildGroupNodeClassName({
      label: 'CRM',
      type: 'unit',
      unitId: 'unit-crm',
    });
    expect(className).toContain('group-node--unit');
    expect(className).not.toMatch(/group-node--accent-\d/);
    expect(className).not.toContain('group-node--with-dependency');
  });

  it('keeps application classes without unit accent', () => {
    const className = buildGroupNodeClassName({
      label: 'App',
      type: 'app',
      containsDependency: true,
    });
    expect(className).toContain('group-node--with-dependency');
    expect(className).not.toContain('group-node--unit');
    expect(className).not.toMatch(/group-node--accent-\d/);
  });
});
