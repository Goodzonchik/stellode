import type { ViewEdge, ViewNode } from '@stellode/models';
import { getLayoutedElements } from './layout-diagram';

const viewNode = (id: string, overrides: Partial<ViewNode> = {}): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: 'Service' },
  ...overrides,
});

const edge = (id: string, source: string, target: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType: 'LINK',
});

const isFinitePosition = (node: ViewNode): boolean =>
  Number.isFinite(node.position.x) && Number.isFinite(node.position.y);

describe('getLayoutedElements', () => {
  it('does not retain nodes from a prior layout run', async () => {
    const layoutCd = (): ReturnType<typeof getLayoutedElements> =>
      getLayoutedElements(
        [viewNode('cccc'), viewNode('dddd')],
        [edge('e2', 'cccc', 'dddd')],
        'LR',
      );
    const expectedCd = await layoutCd();
    await getLayoutedElements([viewNode('aaaa'), viewNode('bbbb')], [edge('e1', 'aaaa', 'bbbb')], 'LR');
    const cdAfterOtherGraph = await layoutCd();
    expect(cdAfterOtherGraph.nodes.map((n) => n.position)).toEqual(
      expectedCd.nodes.map((n) => n.position),
    );
  });

  it('assigns positions for every input node and keeps order', async () => {
    const nodes = [viewNode('n1'), viewNode('n2'), viewNode('n3')];
    const { nodes: laid, edges } = await getLayoutedElements(nodes, [edge('e', 'n1', 'n2')], 'TB');
    expect(laid.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    laid.forEach((n) => expect(isFinitePosition(n)).toBe(true));
    expect(edges).toHaveLength(1);
  });

  it('lays out LR with target on the left and source on the right', async () => {
    const { nodes: laid } = await getLayoutedElements(
      [viewNode('a'), viewNode('b')],
      [edge('e', 'a', 'b')],
      'LR',
    );
    const a = laid.find((n) => n.id === 'a');
    const b = laid.find((n) => n.id === 'b');
    expect(String(a?.sourcePosition)).toBe('right');
    expect(String(a?.targetPosition)).toBe('left');
    expect((b?.position.x ?? 0) > (a?.position.x ?? 0)).toBe(true);
  });

  it('sizes a group container and keeps child positions relative and inside', async () => {
    const nodes = [
      viewNode('app', { type: 'group', data: { label: 'App', type: 'app' } }),
      viewNode('app::c1', { parentId: 'app', extent: 'parent' }),
      viewNode('app::c2', { parentId: 'app', extent: 'parent' }),
    ];
    const { nodes: laid } = await getLayoutedElements(nodes, [edge('e', 'app::c1', 'app::c2')], 'LR');
    const app = laid.find((n) => n.id === 'app');
    const c1 = laid.find((n) => n.id === 'app::c1');
    const c2 = laid.find((n) => n.id === 'app::c2');
    expect(app?.style?.width).toBeGreaterThan(0);
    expect(app?.style?.height).toBeGreaterThan(0);
    expect(c1?.parentId).toBe('app');
    expect(c1?.position.x).toBeGreaterThanOrEqual(0);
    expect(c1?.position.y).toBeGreaterThanOrEqual(0);
    expect((c2?.position.x ?? 0) + 128).toBeLessThanOrEqual(app?.style?.width ?? 0);
    expect(laid.findIndex((n) => n.id === 'app')).toBeLessThan(laid.findIndex((n) => n.id === 'app::c1'));
  });

  it('handles an edge that crosses a container boundary', async () => {
    const nodes = [
      viewNode('f'),
      viewNode('app', { type: 'group', data: { label: 'App', type: 'app' } }),
      viewNode('app::c', { parentId: 'app', extent: 'parent' }),
    ];
    const { nodes: laid, edges } = await getLayoutedElements(nodes, [edge('e', 'f', 'app::c')], 'LR');
    expect(edges).toHaveLength(1);
    laid.forEach((n) => expect(isFinitePosition(n)).toBe(true));
    const f = laid.find((n) => n.id === 'f');
    const app = laid.find((n) => n.id === 'app');
    expect((app?.position.x ?? 0) > (f?.position.x ?? 0)).toBe(true);
  });

  it('does not mutate input nodes', async () => {
    const nodes = [viewNode('a'), viewNode('b')];
    const snapshot = JSON.stringify(nodes);
    await getLayoutedElements(nodes, [edge('e', 'a', 'b')], 'TB');
    expect(JSON.stringify(nodes)).toBe(snapshot);
  });
});
