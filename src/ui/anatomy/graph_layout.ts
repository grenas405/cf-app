/**
 * Dependency graph layout, computed (not drawn). Each module's band is its
 * depth in the import graph: entry points at the top, foundations that
 * import nothing local at the bottom. Bands wrap to fit the available width.
 *
 * @module
 */

/** The minimal facts the layout needs about a module. */
export interface GraphInput {
  readonly path: string;
  readonly layer: string;
  readonly deps: readonly string[];
}

export interface PlacedNode {
  readonly path: string;
  readonly layer: string;
  readonly x: number;
  readonly y: number;
}

export interface Layout {
  readonly nodes: readonly PlacedNode[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
  readonly width: number;
  readonly height: number;
}

export const NODE_W = 184;
export const NODE_H = 26;
const COL_GAP = 14;
const ROW_GAP = 12;
const BAND_GAP = 44;
const PAD = 20;

/** Depth of each module: 0 for leaves, 1 + deepest dependency otherwise. */
export function depths(inputs: readonly GraphInput[]): Map<string, number> {
  const known = new Map(inputs.map((input) => [input.path, input]));
  const memo = new Map<string, number>();
  const visit = (path: string, trail: ReadonlySet<string>): number => {
    const cached = memo.get(path);
    if (cached !== undefined) return cached;
    const deps = (known.get(path)?.deps ?? []).filter((d) =>
      known.has(d) && !trail.has(d)
    );
    const depth = deps.length === 0
      ? 0
      : 1 + Math.max(...deps.map((d) => visit(d, new Set([...trail, path]))));
    memo.set(path, depth);
    return depth;
  };
  inputs.forEach((input) => visit(input.path, new Set()));
  return memo;
}

/** Everything `path` pulls in, directly or indirectly. */
export function reachable(
  inputs: readonly GraphInput[],
  path: string,
): Set<string> {
  const deps = new Map(inputs.map((input) => [input.path, input.deps]));
  const seen = new Set<string>();
  const stack = [path];
  while (stack.length > 0) {
    const next = stack.pop() ?? "";
    for (const dep of deps.get(next) ?? []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      stack.push(dep);
    }
  }
  return seen;
}

/** Split a list into chunks of at most `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Place nodes in bands by depth, wrapped to `maxWidth`, centered. */
export function layoutGraph(
  inputs: readonly GraphInput[],
  layerOrder: readonly string[],
  maxWidth: number,
): Layout {
  const depth = depths(inputs);
  const maxDepth = Math.max(0, ...depth.values());
  const perRow = Math.max(
    1,
    Math.floor((maxWidth - PAD * 2 + COL_GAP) / (NODE_W + COL_GAP)),
  );
  const width = Math.max(maxWidth, PAD * 2 + NODE_W);
  const rank = (layer: string): number => layerOrder.indexOf(layer);

  const nodes: PlacedNode[] = [];
  let y = PAD;
  for (let band = 0; band <= maxDepth; band++) {
    const members = inputs
      .filter((input) => maxDepth - (depth.get(input.path) ?? 0) === band)
      .sort((a, b) =>
        rank(a.layer) - rank(b.layer) || a.path.localeCompare(b.path)
      );
    if (members.length === 0) continue;
    for (const row of chunk(members, perRow)) {
      const rowWidth = row.length * NODE_W + (row.length - 1) * COL_GAP;
      const left = (width - rowWidth) / 2;
      row.forEach((member, i) =>
        nodes.push({
          path: member.path,
          layer: member.layer,
          x: left + i * (NODE_W + COL_GAP),
          y,
        })
      );
      y += NODE_H + ROW_GAP;
    }
    y += BAND_GAP - ROW_GAP;
  }

  const shown = new Set(inputs.map((input) => input.path));
  const edges = inputs.flatMap((input) =>
    input.deps.filter((dep) => shown.has(dep)).map((dep) => ({
      from: input.path,
      to: dep,
    }))
  );
  return { nodes, edges, width, height: y - BAND_GAP + PAD };
}
