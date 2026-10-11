/**
 * Lay the hero map out for a canvas size: project the border, towns and
 * backbone, and sample the dotted lattice. Pure geometry, no drawing.
 *
 * @module
 */

import {
  arcControl,
  fitProjection,
  lattice,
  type LonLat,
  OKC,
  OKLAHOMA_BORDER,
  type Point,
  TOWNS,
} from "./oklahoma.ts";

/** Everything the renderer needs, in screen coordinates. */
export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly border: readonly Point[];
  readonly dots: readonly { readonly p: Point; readonly phase: number }[];
  readonly hub: Point;
  readonly towns: readonly { readonly name: string; readonly p: Point }[];
  readonly backbone: readonly { readonly to: Point; readonly control: Point }[];
  readonly visitor: Point;
}

/** Far-away network cities the backbone reaches toward. */
const BACKBONE: readonly LonLat[] = [
  [-96.8, 32.78],
  [-94.58, 39.1],
  [-104.99, 39.74],
  [-87.63, 41.88],
  [-112.07, 33.45],
  [-84.39, 33.75],
];

/** Lay the map out for a canvas size. Pure. */
export function layoutScene(width: number, height: number): Scene {
  const narrow = width < 720;
  const box = narrow
    ? {
      left: width * 0.05,
      top: height * 0.08,
      w: width * 0.9,
      h: height * 0.36,
    }
    : {
      left: width * 0.42,
      top: height * 0.16,
      w: width * 0.54,
      h: height * 0.68,
    };
  const project = fitProjection(
    OKLAHOMA_BORDER,
    box.left,
    box.top,
    box.w,
    box.h,
  );
  const border = OKLAHOMA_BORDER.map(project);
  const step = Math.max(8, Math.round(box.w / 72));
  const hub = project(OKC);
  return {
    width,
    height,
    border,
    dots: lattice(border, step).map((p, i) => ({
      p,
      phase: (i * 2.399) % 6.283,
    })),
    hub,
    towns: TOWNS.map((town) => ({ name: town.name, p: project(town.at) })),
    backbone: BACKBONE.map(project).map((to) => ({
      to,
      control: arcControl(hub, to, 0.18),
    })),
    visitor: narrow
      ? { x: width * 0.5, y: height * 0.98 }
      : { x: width * 0.3, y: height * 0.94 },
  };
}
