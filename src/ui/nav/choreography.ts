/**
 * The menu's choreography as pure geometry and timing: where the curtain
 * circle starts, how big it must grow, and when each letter moves. Kept free
 * of the DOM so every number can be tested.
 *
 * @module
 */

/** A circle that starts at the toggle and grows to cover the screen. */
export interface Curtain {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** The smallest circle centered at (x, y) that covers a w x h viewport. */
export function curtainFrom(
  x: number,
  y: number,
  width: number,
  height: number,
): Curtain {
  const dx = Math.max(x, width - x);
  const dy = Math.max(y, height - y);
  return { x, y, radius: Math.ceil(Math.hypot(dx, dy)) };
}

/** `clip-path` value for a curtain at a given radius. */
export function circleClip(curtain: Curtain, radius: number): string {
  return `circle(${radius}px at ${curtain.x}px ${curtain.y}px)`;
}

/** Entrance delay for letter `char` of link `link`, in ms. */
export function letterDelay(link: number, char: number): number {
  return 360 + link * 55 + char * 14;
}

/** Exit delay: quicker and tighter than the entrance. */
export function letterExitDelay(link: number, char: number): number {
  return link * 22 + char * 5;
}

/** Split a label into characters, keeping spaces as their own slots. */
export function splitLabel(label: string): string[] {
  return [...label];
}
