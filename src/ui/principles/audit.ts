/**
 * The live security audit. It compares the policy the API publishes with the
 * headers the browser actually received on two different paths: an API
 * response (stamped by the core) and this page (stamped by Cloudflare from
 * the generated `_headers`, or by the core when running on Deno).
 *
 * @module
 */

import type { Discovery } from "../../core/features/discovery.ts";
import type { HeaderRule } from "../../core/security/policy.ts";
import { bodyOf, getJson, request } from "../api.ts";
import { byId, h } from "../dom.ts";
import { flashButtonState, setButtonState } from "../effects/press.ts";

/** One row of the audit. */
export interface AuditRow {
  readonly rule: HeaderRule;
  readonly api: boolean;
  readonly page: boolean;
}

/** Compare expected rules with two sets of received headers. Pure. */
export function audit(
  rules: readonly HeaderRule[],
  api: Headers,
  page: Headers,
): AuditRow[] {
  const matches = (headers: Headers, rule: HeaderRule): boolean =>
    (headers.get(rule.name) ?? "").trim() === rule.value;
  return rules.map((rule) => ({
    rule,
    api: matches(api, rule),
    page: matches(page, rule),
  }));
}

function cell(pass: boolean): HTMLElement {
  return h("td", { class: pass ? "is-pass" : "is-fail" }, [
    pass ? "✓ match" : "✗ missing",
  ]);
}

function table(rows: readonly AuditRow[]): HTMLElement {
  return h("table", {}, [
    h("thead", {}, [
      h(
        "tr",
        {},
        ["Header", "API response", "This page", "Why it matters"].map((t) =>
          h("th", {}, [t])
        ),
      ),
    ]),
    h(
      "tbody",
      {},
      rows.map((row, i) => {
        const tr = h("tr", {}, [
          h("td", { title: row.rule.value }, [row.rule.name]),
          cell(row.api),
          cell(row.page),
          h("td", {}, [row.rule.why]),
        ]);
        tr.style.setProperty("--i", String(i));
        return tr;
      }),
    ),
  ]);
}

/** Wire the audit button. */
export function installAudit(): void {
  const run = byId<HTMLButtonElement>("audit-run");
  const out = byId("audit-table");
  const badge = byId("audit-badge");
  if (run === null || out === null || badge === null) return;

  run.addEventListener("click", async () => {
    setButtonState(run, "loading");
    const [discovery, page] = await Promise.all([
      getJson<Discovery>("/api"),
      request<unknown>("/", { method: "HEAD" }),
    ]);
    const doc = bodyOf(discovery);
    if (doc === null) {
      badge.textContent = "unreachable";
      flashButtonState(run, "error");
      return;
    }
    const rows = audit(doc.security, discovery.headers, page.headers);
    const passed = rows.filter((row) => row.api && row.page).length;
    badge.textContent = `${passed}/${rows.length} pass`;
    badge.classList.toggle("badge--ok", passed === rows.length);
    badge.classList.toggle("badge--warn", passed !== rows.length);
    out.replaceChildren(table(rows));
    flashButtonState(run, passed === rows.length ? "success" : "error");
  });
}
