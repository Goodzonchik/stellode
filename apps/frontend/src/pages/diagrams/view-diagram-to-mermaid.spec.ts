import type { ViewEdge, ViewNode } from '@stellode/models';
import { viewDiagramToMermaid } from './view-diagram-to-mermaid';

const customNode = (
  id: string,
  label: string,
  extras?: Partial<ViewNode> & { data?: Partial<ViewNode['data']> },
): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...extras,
  data: {
    label,
    type: 'component',
    ...extras?.data,
  },
});

const groupNode = (
  id: string,
  label: string,
  extras?: Partial<ViewNode> & { data?: Partial<ViewNode['data']> },
): ViewNode => ({
  id,
  type: 'group',
  draggable: false,
  position: { x: 0, y: 0 },
  ...extras,
  data: {
    label,
    type: 'application',
    actualVersion: extras?.data?.actualVersion,
    ...extras?.data,
  },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('viewDiagramToMermaid', () => {
  it('returns flowchart stub when no visible nodes', () => {
    expect(viewDiagramToMermaid([], [], 'TB')).toBe('flowchart TB');
    expect(viewDiagramToMermaid([], [], 'LR')).toBe('flowchart LR');
  });

  it('ignores hidden nodes and edges', () => {
    const nodes: ViewNode[] = [
      customNode('a', 'A'),
      { ...customNode('b', 'B'), hidden: true },
    ];
    const edges: ViewEdge[] = [
      edge('e1', 'a', 'b', 'DEPENDS_ON'),
      { ...edge('e2', 'a', 'a', 'USES'), hidden: true },
    ];
    const text = viewDiagramToMermaid(nodes, edges, 'TB');
    expect(text).toContain('flowchart TB');
    expect(text).toContain('a["A"]');
    expect(text).not.toContain('b["B"]');
    expect(text).not.toContain('DEPENDS_ON');
    expect(text).not.toContain('USES');
  });

  it('emits application subgraph with components and labeled edge', () => {
    const nodes: ViewNode[] = [
      groupNode('app1', 'AppA', { data: { label: 'AppA', type: 'application', actualVersion: '1.0' } }),
      customNode('c1', 'Comp1', {
        parentId: 'app1',
        data: { label: 'Comp1', type: 'component', actualVersion: '2' },
      }),
      customNode('c2', 'Comp2', {
        parentId: 'app1',
        data: { label: 'Comp2', type: 'component', actualVersion: '3' },
      }),
    ];
    const edges: ViewEdge[] = [edge('e1', 'c1', 'c2', 'DEPENDS_ON')];
    const text = viewDiagramToMermaid(nodes, edges, 'LR');
    expect(text).toBe(
      [
        'flowchart LR',
        '  subgraph app1["AppA · 1.0"]',
        '    c1["Comp1 · 2"]',
        '    c2["Comp2 · 3"]',
        '  end',
        '  c1 -->|DEPENDS_ON| c2',
      ].join('\n'),
    );
  });

  it('nests group inside group by parentId', () => {
    const nodes: ViewNode[] = [
      groupNode('unit1', 'UnitA', { data: { label: 'UnitA', type: 'unit' } }),
      groupNode('app1', 'AppA', {
        parentId: 'unit1',
        data: { label: 'AppA', type: 'application', actualVersion: '1' },
      }),
      customNode('c1', 'Comp1', {
        parentId: 'app1',
        data: { label: 'Comp1', type: 'component' },
      }),
    ];
    const text = viewDiagramToMermaid(nodes, [], 'TB');
    expect(text).toBe(
      [
        'flowchart TB',
        '  subgraph unit1["UnitA"]',
        '    subgraph app1["AppA · 1"]',
        '      c1["Comp1"]',
        '    end',
        '  end',
      ].join('\n'),
    );
  });

  it('sanitizes ids with special characters', () => {
    const nodes: ViewNode[] = [
      customNode('app::cv-1', 'X', { data: { label: 'X', type: 'component' } }),
    ];
    const text = viewDiagramToMermaid(nodes, [], 'TB');
    expect(text).toContain('app__cv_1["X"]');
  });
});
