/**
 * Copy-to-clipboard for `[data-copy]` (literal text) and `[data-copy-from]`
 * (the text of another element), with success feedback on the button.
 *
 * @module
 */

import { flashButtonState } from "./effects/press.ts";

/** The text a copy button should place on the clipboard. */
export function copyText(button: HTMLElement): string {
  const literal = button.dataset["copy"];
  if (literal !== undefined) return literal;
  const source = document.getElementById(button.dataset["copyFrom"] ?? "");
  return source?.textContent ?? "";
}

/** Wire every current and future copy button. */
export function installCopy(root: Document): void {
  root.addEventListener("click", async (event) => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-copy], [data-copy-from]")
      : null;
    if (button === null) return;
    try {
      await navigator.clipboard.writeText(copyText(button));
      flashButtonState(button, "success", 1200);
    } catch {
      flashButtonState(button, "error", 1200);
    }
  });
}
