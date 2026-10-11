/**
 * The terminal player: types out a session line by line, switchable by tab,
 * starting when the terminal first scrolls into view.
 *
 * @module
 */

import { byId, h } from "../dom.ts";
import { reducedMotion, wait } from "../motion.ts";
import { type Line, SESSIONS } from "./sessions.ts";

/** Typing delay per character for a line kind (users type, tools print). */
export function charDelay(kind: Line["kind"]): number {
  if (kind === "user") return 26;
  if (kind === "claude") return 9;
  return 0;
}

async function typeLine(
  screen: HTMLElement,
  line: Line,
  signal: AbortSignal,
): Promise<void> {
  if (line.kind === "gap") {
    screen.append(h("div", { class: "t-gap" }));
    return;
  }
  const row = h("div", { class: `t-line t-${line.kind}` });
  const cursor = h("span", { class: "t-cursor" });
  screen.append(row);
  const delay = reducedMotion() ? 0 : charDelay(line.kind);
  if (delay === 0) row.textContent = line.text;
  else {
    row.append(cursor);
    for (let i = 1; i <= line.text.length && !signal.aborted; i++) {
      row.replaceChildren(line.text.slice(0, i), cursor);
      screen.scrollTop = screen.scrollHeight;
      await wait(delay);
    }
    row.textContent = line.text;
  }
  screen.scrollTop = screen.scrollHeight;
  await wait(reducedMotion() ? 0 : line.kind === "tool" ? 380 : 220);
}

/** Play the sessions in the terminal. */
export function installTerminal(): void {
  const tabs = byId("session-tabs");
  const screen = byId("terminal-screen");
  if (tabs === null || screen === null) return;
  let controller = new AbortController();

  const start = async (id: string): Promise<void> => {
    controller.abort();
    controller = new AbortController();
    const signal = controller.signal;
    for (const tab of tabs.querySelectorAll("button")) {
      tab.setAttribute("aria-selected", String(tab.dataset["session"] === id));
    }
    screen.replaceChildren();
    const session = SESSIONS.find((s) => s.id === id);
    for (const line of session?.lines ?? []) {
      if (signal.aborted) return;
      await typeLine(screen, line, signal);
    }
  };

  tabs.replaceChildren(...SESSIONS.map((session, i) => {
    const tab = h("button", {
      class: "terminal__tab",
      type: "button",
      role: "tab",
      "aria-selected": String(i === 0),
      "data-session": session.id,
    }, [session.title]);
    tab.addEventListener("click", () => void start(session.id));
    return tab;
  }));

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    observer.disconnect();
    void start(SESSIONS[0]?.id ?? "");
  }, { threshold: 0.35 });
  observer.observe(screen);
}
