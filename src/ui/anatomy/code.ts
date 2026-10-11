/**
 * Render source code as DOM: one row per line, real line numbers, optional
 * highlighted range. Text goes in through `textContent` only.
 *
 * @module
 */

import { h } from "../dom.ts";
import { isCode, type Token, tokenize, toLines } from "./highlight.ts";

/** Which lines to show and which to light up (1-based, inclusive). */
export interface CodeView {
  readonly from?: number;
  readonly to?: number;
  readonly lit?: readonly [number, number];
}

function plainLines(source: string): Token[][] {
  return source.split("\n").map((text) =>
    text === "" ? [] : [{ kind: "plain", text }]
  );
}

/** Build the rows for a file. */
export function codeRows(
  path: string,
  source: string,
  view: CodeView = {},
): HTMLElement[] {
  const lines = isCode(path) ? toLines(tokenize(source)) : plainLines(source);
  const from = Math.max(1, view.from ?? 1);
  const to = Math.min(lines.length, view.to ?? lines.length);
  const rows: HTMLElement[] = [];
  for (let n = from; n <= to; n++) {
    const tokens = lines[n - 1] ?? [];
    const lit = view.lit !== undefined && n >= view.lit[0] && n <= view.lit[1];
    rows.push(
      h("div", { class: lit ? "code-line is-lit" : "code-line", "data-n": n }, [
        h(
          "span",
          {},
          tokens.map((token) =>
            token.kind === "plain"
              ? token.text
              : h("span", { class: `tok-${token.kind}` }, [token.text])
          ),
        ),
      ]),
    );
  }
  return rows;
}

/** Scroll a code container so line `n` sits near its top. */
export function scrollToLine(container: HTMLElement, n: number): void {
  const row = container.querySelector<HTMLElement>(`[data-n="${n}"]`);
  if (row === null) return;
  container.scrollTo({
    top: Math.max(0, row.offsetTop - 48),
    behavior: "smooth",
  });
}
