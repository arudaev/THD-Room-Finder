import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CampusMap } from './CampusMap';
import { CAMPUS_GEOJSON } from './campus-data';
import { CAMPUS_CONTEXT } from './context-data';
import type { CampusContext } from './types';

describe('CampusMap geometry', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderMap({
    interactive = false,
    context,
    selectedKey,
    showTrees = false,
  }: {
    interactive?: boolean;
    context?: CampusContext;
    selectedKey?: string;
    showTrees?: boolean;
  } = {}) {
    await act(async () => {
      root.render(
        <CampusMap
          campus={CAMPUS_GEOJSON}
          context={context}
          availability={{}}
          interactive={interactive}
          selectedKey={selectedKey}
          showTrees={showTrees}
        />,
      );
    });
  }

  it('paints overlapping campus footprints in the intended order', async () => {
    await renderMap();

    const ids = [...container.querySelectorAll<SVGGElement>('g.cm-bld')].map(
      (building) => building.dataset.id,
    );
    expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('HS'));
    expect(ids.indexOf('G')).toBeLessThan(ids.indexOf('E'));
    expect(ids.indexOf('GH')).toBeLessThan(ids.indexOf('ITC2'));
  });

  it('renders ITC² rear courtyard wall segments from polygon winding', async () => {
    await renderMap();

    const itc2 = container.querySelector<SVGGElement>('g[data-id="ITC2"]');
    expect(itc2?.querySelector('[data-wall-edge="1"]')).not.toBeNull();
    expect(itc2?.querySelector('[data-wall-edge="3"]')).not.toBeNull();
  });

  it('paints Veilchengasse trees behind the Degg satellite footprint', async () => {
    await renderMap({ context: CAMPUS_CONTEXT, selectedKey: 'DEGG', showTrees: true });

    const layers = [...container.querySelectorAll('g.cm-tree, g.cm-bld')];
    const treeBehindDegg = container.querySelector('g[data-tree-index="227"]');
    const degg = container.querySelector('g[data-id="DEGG"]');
    expect(layers.indexOf(treeBehindDegg!)).toBeLessThan(layers.indexOf(degg!));
  });

  it('prevents native text selection while dragging the interactive map', async () => {
    await renderMap({ interactive: true });

    const svg = container.querySelector('svg');
    expect(svg?.style.userSelect).toBe('none');

    const pointerDown = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    svg?.dispatchEvent(pointerDown);
    expect(pointerDown.defaultPrevented).toBe(true);
  });
});
