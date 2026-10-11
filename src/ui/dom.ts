/**
 * Tiny DOM helpers. Elements are built from data with `createElement` and
 * `textContent`; there is no `innerHTML` anywhere in the browser code, which
 * is what lets the CSP enforce Trusted Types with zero policies.
 *
 * @module
 */

/** Something that can be placed inside an element. */
export type Child = Node | string | null | undefined | false;

/** Attribute values; `false` and `undefined` mean "leave it off". */
export type Attrs = Readonly<
  Record<string, string | number | boolean | undefined>
>;

function setAttrs(element: Element, attrs: Attrs): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === undefined) continue;
    element.setAttribute(name, value === true ? "" : String(value));
  }
}

function present(child: Child): child is Node | string {
  return child !== null && child !== undefined && child !== false;
}

/** Build an HTML element. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  setAttrs(element, attrs);
  element.append(...children.filter(present));
  return element;
}

/** Build an SVG element. */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: readonly Child[] = [],
): SVGElementTagNameMap[K] {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  setAttrs(element, attrs);
  element.append(...children.filter(present));
  return element;
}

/** Text with `backticked` spans rendered as <code>, like Markdown. */
export function withCode(text: string): Child[] {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? h("code", {}, [part]) : part
  );
}

/** Find an element by id, typed, or `null` when the page lacks it. */
export function byId<T extends HTMLElement = HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(id) as T | null;
}

/** All elements matching a selector, as an array. */
export function all<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return [...root.querySelectorAll<T>(selector)];
}

/** Scroll an element into view the way the user prefers. */
export function reveal(element: Element): void {
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({
    behavior: smooth ? "smooth" : "auto",
    block: "start",
  });
}
