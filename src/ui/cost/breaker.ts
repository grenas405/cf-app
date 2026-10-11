/**
 * "Now try to break it": send hostile input to `POST /api/estimate` and show
 * exactly how the edge refuses it. Each attack maps to one step of the core's
 * input pipeline in src/core/http/json_body.ts.
 *
 * @module
 */

import { request } from "../api.ts";
import { byId, h } from "../dom.ts";
import { flashButtonState, setButtonState } from "../effects/press.ts";
import { readEstimateInput } from "./view.ts";

/** One hostile request. */
export interface Attack {
  readonly label: string;
  readonly expect: string;
  readonly init: () => RequestInit;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const ATTACKS: readonly Attack[] = [
  {
    label: "Negative traffic",
    expect: "422: numbers must be in range",
    init: () => json({ ...readEstimateInput(), monthlyVisitors: -5000 }),
  },
  {
    label: "Sneak in isAdmin",
    expect: "422: unknown keys are refused (mass assignment)",
    init: () => json({ ...readEstimateInput(), isAdmin: true }),
  },
  {
    label: "Wrong types",
    expect: "422: a string is not a number",
    init: () =>
      json({
        ...readEstimateInput(),
        monthlyVisitors: "lots",
        pagesPerVisit: null,
      }),
  },
  {
    label: "Broken JSON",
    expect: "400: parse failures are caught",
    init: () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"monthlyVisitors": 5',
    }),
  },
  {
    label: "Not JSON at all",
    expect: "415: only application/json is read",
    init: () => ({
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "visitors=5000",
    }),
  },
  {
    label: "Huge payload",
    expect: "413: bodies are capped at 2 KiB",
    init: () => json({ ...readEstimateInput(), padding: "x".repeat(8_000) }),
  },
];

/** Render a response the way a terminal would. */
export function describeResponse(
  status: number,
  statusText: string,
  contentType: string,
  body: unknown,
): string {
  return [
    `HTTP ${status} ${statusText}`,
    `content-type: ${contentType}`,
    "",
    JSON.stringify(body, null, 2),
  ].join("\n");
}

/** Wire the attack buttons. */
export function installBreaker(): void {
  const buttons = byId("breaker-buttons");
  const output = byId("breaker-output");
  if (buttons === null || output === null) return;

  buttons.replaceChildren(...ATTACKS.map((attack) => {
    const button = h("button", {
      class: "btn btn--ghost btn--sm",
      type: "button",
      title: attack.expect,
    }, [
      h("span", { class: "btn__label" }, [attack.label]),
    ]);
    button.addEventListener("click", async () => {
      setButtonState(button, "loading");
      const result = await request<unknown>("/api/estimate", attack.init());
      const statusText =
        result.body !== null && typeof result.body === "object" &&
          "title" in result.body
          ? String(result.body.title)
          : "";
      output.replaceChildren(h("code", {}, [
        `# ${attack.label}: expected ${attack.expect}\n\n`,
        describeResponse(
          result.status,
          statusText,
          result.headers.get("content-type") ?? "",
          result.body,
        ),
      ]));
      flashButtonState(
        button,
        result.status >= 400 && result.status < 500 ? "success" : "error",
      );
    });
    return button;
  }));
}
