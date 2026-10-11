/**
 * Oklahoma as data: a simplified state border, a few towns, and the pure
 * geometry to project them onto a canvas. No drawing happens here.
 *
 * @module
 */

/** Longitude, latitude in degrees. */
export type LonLat = readonly [number, number];

/** A point on screen. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Simplified border, clockwise from the panhandle's northwest corner. */
export const OKLAHOMA_BORDER: readonly LonLat[] = [
  [-103.0, 37.0],
  [-94.62, 37.0],
  [-94.62, 36.5],
  [-94.43, 35.4],
  [-94.48, 33.64],
  [-95.15, 33.94],
  [-95.55, 33.88],
  [-95.94, 33.86],
  [-96.37, 33.7],
  [-96.63, 33.85],
  [-96.93, 33.95],
  [-97.17, 33.73],
  [-97.45, 33.83],
  [-97.7, 33.98],
  [-97.95, 33.88],
  [-98.1, 34.13],
  [-98.48, 34.07],
  [-98.75, 34.13],
  [-99.0, 34.21],
  [-99.2, 34.33],
  [-99.4, 34.38],
  [-99.6, 34.37],
  [-99.85, 34.53],
  [-100.0, 34.56],
  [-100.0, 36.5],
  [-103.0, 36.5],
];

/** Oklahoma City: where the edge lives in this story. */
export const OKC: LonLat = [-97.52, 35.47];

/** Towns that send traffic toward the OKC data center. */
export const TOWNS: readonly { readonly name: string; readonly at: LonLat }[] =
  [
    { name: "Tulsa", at: [-95.99, 36.15] },
    { name: "Norman", at: [-97.44, 35.22] },
    { name: "Edmond", at: [-97.48, 35.65] },
    { name: "Stillwater", at: [-97.06, 36.12] },
    { name: "Lawton", at: [-98.39, 34.6] },
    { name: "Enid", at: [-97.88, 36.4] },
    { name: "Ardmore", at: [-97.13, 34.17] },
    { name: "Muskogee", at: [-95.37, 35.75] },
    { name: "Woodward", at: [-99.39, 36.43] },
    { name: "Guymon", at: [-101.48, 36.68] },
    { name: "Shawnee", at: [-96.93, 35.33] },
    { name: "Durant", at: [-96.37, 33.99] },
  ];

/** Bounding box of a set of coordinates. */
export function boundsOf(points: readonly LonLat[]): {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
} {
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

/**
 * An equirectangular projection (longitude shrunk by cos(latitude)) that fits
 * `points` inside the box at (left, top) with the given size.
 */
export function fitProjection(
  points: readonly LonLat[],
  left: number,
  top: number,
  width: number,
  height: number,
): (p: LonLat) => Point {
  const b = boundsOf(points);
  const squeeze = Math.cos(((b.minLat + b.maxLat) / 2) * Math.PI / 180);
  const spanX = (b.maxLon - b.minLon) * squeeze;
  const spanY = b.maxLat - b.minLat;
  const scale = Math.min(width / spanX, height / spanY);
  const offsetX = left + (width - spanX * scale) / 2;
  const offsetY = top + (height - spanY * scale) / 2;
  return ([lon, lat]) => ({
    x: offsetX + (lon - b.minLon) * squeeze * scale,
    y: offsetY + (b.maxLat - lat) * scale,
  });
}

/** Ray-casting point-in-polygon test. */
export function inside(point: Point, polygon: readonly Point[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a === undefined || b === undefined) continue;
    const crosses = (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) hit = !hit;
  }
  return hit;
}

/** Grid points spaced `step` apart that fall inside the polygon. */
export function lattice(polygon: readonly Point[], step: number): Point[] {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const points: Point[] = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) {
      if (inside({ x, y }, polygon)) points.push({ x, y });
    }
  }
  return points;
}

/** A point along a quadratic Bezier curve at t in 0..1. */
export function bezier(a: Point, control: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
  };
}

/** A control point that bows the path between a and b upward. */
export function arcControl(a: Point, b: Point, lift = 0.25): Point {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - distance * lift };
}
