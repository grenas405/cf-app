/**
 * Canvas drawing primitives for the hero map. Each function paints one
 * layer of the scene; none of them keeps state.
 *
 * @module
 */

import { bezier, type Point } from "./oklahoma.ts";
import type { Scene } from "./scene.ts";

/** A moving dot with a trail, traveling along a curve. */
export interface Packet {
  readonly from: Point;
  readonly to: Point;
  readonly control: Point;
  readonly born: number;
  readonly duration: number;
  readonly color: string;
  readonly size: number;
  readonly then?: (now: number) => void;
}

/** RGB triplets used with varying alpha. */
export const SKY = "76, 195, 255";
export const GOLD = "255, 181, 71";
export const DIRT = "255, 106, 61";

/** Dashed arcs from the hub toward the wider network, drifting outward. */
export function drawBackbone(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  now: number,
): void {
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 7]);
  ctx.lineDashOffset = -now / 60;
  for (const line of scene.backbone) {
    ctx.strokeStyle = `rgba(${DIRT}, 0.22)`;
    ctx.beginPath();
    ctx.moveTo(scene.hub.x, scene.hub.y);
    ctx.quadraticCurveTo(line.control.x, line.control.y, line.to.x, line.to.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/** The dotted state, twinkling, warmer near the hub. */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  now: number,
): void {
  const t = now / 1400;
  for (const { p, phase } of scene.dots) {
    const glow = 0.18 + 0.14 * Math.sin(t + phase);
    const near = Math.max(
      0,
      1 - Math.hypot(p.x - scene.hub.x, p.y - scene.hub.y) / 160,
    );
    ctx.fillStyle = `rgba(${near > 0 ? GOLD : SKY}, ${glow + near * 0.45})`;
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  }
}

/** The glowing state outline. */
export function drawBorder(ctx: CanvasRenderingContext2D, scene: Scene): void {
  ctx.save();
  ctx.shadowColor = `rgba(${GOLD}, 0.6)`;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = `rgba(${GOLD}, 0.55)`;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  scene.border.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  );
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Town dots, labeled unless they crowd the hub. */
export function drawTowns(ctx: CanvasRenderingContext2D, scene: Scene): void {
  ctx.font = "500 10px ui-monospace, Menlo, monospace";
  for (const town of scene.towns) {
    ctx.fillStyle = `rgba(${SKY}, 0.9)`;
    ctx.beginPath();
    ctx.arc(town.p.x, town.p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (Math.hypot(town.p.x - scene.hub.x, town.p.y - scene.hub.y) < 48) {
      continue;
    }
    ctx.fillStyle = "rgba(167, 176, 196, 0.55)";
    ctx.fillText(town.name.toUpperCase(), town.p.x + 6, town.p.y - 5);
  }
}

/** The OKC data center: a bright core with expanding rings. */
export function drawHub(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  now: number,
): void {
  const { x, y } = scene.hub;
  for (let k = 0; k < 3; k++) {
    const t = ((now / 2200) + k / 3) % 1;
    ctx.strokeStyle = `rgba(${GOLD}, ${0.5 * (1 - t)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 6 + t * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = `rgba(${GOLD}, 1)`;
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#fff3d6";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = "700 11px ui-monospace, Menlo, monospace";
  ctx.fillStyle = `rgba(${GOLD}, 0.95)`;
  ctx.fillText("OKC  EDGE", x + 12, y + 18);
}

/** A packet and its fading trail at progress t (0..1). */
export function drawPacket(
  ctx: CanvasRenderingContext2D,
  packet: Packet,
  t: number,
): void {
  for (let k = 0; k < 6; k++) {
    const tt = Math.max(0, t - k * 0.025);
    const p = bezier(packet.from, packet.control, packet.to, tt);
    ctx.fillStyle = `rgba(${packet.color}, ${(1 - k / 6) * 0.9})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, packet.size * (1 - k / 8), 0, Math.PI * 2);
    ctx.fill();
  }
}
