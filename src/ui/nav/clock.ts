/**
 * The Oklahoma City clock in the menu: Central Time, always.
 *
 * @module
 */

const CENTRAL = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
});

/** Format an instant as Oklahoma City wall-clock time, e.g. `4:05 PM`. */
export function okcTime(date: Date): string {
  return CENTRAL.format(date);
}

/** Keep an element showing the current OKC time. */
export function startClock(element: HTMLElement): void {
  const tick = (): void => {
    element.textContent = okcTime(new Date());
  };
  tick();
  setInterval(tick, 15_000);
}
