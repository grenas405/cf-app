/**
 * The hero's living map: a dotted Oklahoma, the OKC data center pulsing at
 * its heart, requests (blue) flowing in from towns and responses (gold)
 * flowing back, and backbone arcs reaching out to the rest of the network.
 *
 * This module owns only the animation loop and its state; layout lives in
 * ./scene.ts and painting in ./draw.ts.
 *
 * @module
 */

import { reducedMotion } from "../motion.ts";
import {
  DIRT,
  drawBackbone,
  drawBorder,
  drawDots,
  drawHub,
  drawPacket,
  drawTowns,
  GOLD,
  type Packet,
  SKY,
} from "./draw.ts";
import { arcControl, type Point } from "./oklahoma.ts";
import { layoutScene } from "./scene.ts";

/** What the page can ask of the map. */
export interface HeroMap {
  /** Animate a real round trip from the visitor to the edge. */
  readonly probe: (rttMs: number) => void;
}

/** Start the animation on a canvas and return its controls. */
export function startHeroMap(canvas: HTMLCanvasElement): HeroMap {
  const context = canvas.getContext("2d");
  if (context === null) return { probe: () => {} };
  const ctx = context;
  let scene = layoutScene(1, 1);
  let packets: Packet[] = [];
  let labels: { text: string; at: Point; born: number }[] = [];
  let running = false;
  let visible = true;
  let lastSpawn = 0;
  let spawned = 0;
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  const launch = (
    from: Point,
    to: Point,
    color: string,
    size: number,
    duration: number,
    now: number,
    then?: (now: number) => void,
  ): void => {
    packets.push({
      from,
      to,
      control: arcControl(from, to, 0.3),
      born: now,
      duration,
      color,
      size,
      ...(then ? { then } : {}),
    });
  };

  const ambient = (now: number): void => {
    if (now - lastSpawn < 480 || scene.towns.length === 0) return;
    lastSpawn = now;
    const town = scene.towns[(spawned++ * 5) % scene.towns.length];
    if (town === undefined) return;
    launch(
      town.p,
      scene.hub,
      SKY,
      2.2,
      1500,
      now,
      (t) => launch(scene.hub, town.p, GOLD, 2.2, 1500, t),
    );
  };

  const render = (now: number): void => {
    parallax.x += (parallax.tx - parallax.x) * 0.05;
    parallax.y += (parallax.ty - parallax.y) * 0.05;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, scene.width, scene.height);
    ctx.translate(parallax.x, parallax.y);
    drawBackbone(ctx, scene, now);
    drawDots(ctx, scene, now);
    drawBorder(ctx, scene);
    drawTowns(ctx, scene);
    const current = packets;
    packets = [];
    for (const packet of current) {
      const t = (now - packet.born) / packet.duration;
      if (t >= 1) {
        packet.then?.(now);
        continue;
      }
      if (t >= 0) drawPacket(ctx, packet, t);
      packets.push(packet);
    }
    drawHub(ctx, scene, now);
    labels = labels.filter((label) => now - label.born < 2600);
    for (const label of labels) {
      ctx.font = "700 14px ui-monospace, Menlo, monospace";
      ctx.fillStyle = `rgba(255, 243, 214, ${1 - (now - label.born) / 2600})`;
      ctx.fillText(
        label.text,
        label.at.x + 14,
        label.at.y - 16 - (now - label.born) / 90,
      );
    }
  };

  const loop = (now: number): void => {
    if (!running) return;
    ambient(now);
    render(now);
    requestAnimationFrame(loop);
  };

  const setRunning = (): void => {
    const should = visible && !document.hidden && !reducedMotion();
    if (should && !running) {
      running = true;
      requestAnimationFrame(loop);
    } else if (!should) running = false;
  };

  const resize = (): void => {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    scene = layoutScene(box.width, box.height);
    packets = [];
    render(performance.now());
  };

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    setRunning();
  }).observe(canvas);
  document.addEventListener("visibilitychange", setRunning);
  addEventListener("pointermove", (event) => {
    parallax.tx = (event.clientX / innerWidth - 0.5) * -18;
    parallax.ty = (event.clientY / innerHeight - 0.5) * -12;
  }, { passive: true });
  resize();
  setRunning();

  return {
    probe: (rttMs) => {
      const now = performance.now();
      const half = Math.min(900, Math.max(450, rttMs * 4));
      launch(scene.visitor, scene.hub, DIRT, 4, half, now, (t) => {
        labels.push({
          text: `${Math.round(rttMs)} ms round trip`,
          at: scene.hub,
          born: t,
        });
        launch(scene.hub, scene.visitor, GOLD, 4, half, t);
      });
      if (!running) render(now);
    },
  };
}
