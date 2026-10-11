/**
 * "Follow one request through the code": a step-by-step tour of
 * `POST /api/estimate`, each step showing the real source of the function
 * that runs, finishing with a real request.
 *
 * @module
 */

import type { Estimate } from "../../core/features/estimate/estimate.ts";
import { postJson } from "../api.ts";
import { byId, h } from "../dom.ts";
import { readEstimateInput } from "../cost/view.ts";
import { type Catalog, shortName, symbolRange } from "./catalog.ts";
import { codeRows } from "./code.ts";

/** One stop on the tour. */
export interface Stop {
  readonly path: string;
  readonly symbol: string;
  readonly title: string;
  readonly text: string;
}

export const STOPS: readonly Stop[] = [
  {
    path: "src/adapters/cloudflare/worker.ts",
    symbol: "portsFrom",
    title: "The adapter wakes up",
    text:
      "The nearest Cloudflare data center receives the request. Because it matches /api/*, the Worker runs and fills the core's ports with Cloudflare bindings.",
  },
  {
    path: "src/adapters/cloudflare/edge.ts",
    symbol: "readEdgeInfo",
    title: "Platform facts, parsed",
    text:
      "Even Cloudflare's own request.cf data goes through zod. Only the fields the app needs are read; coordinates and ISP details are ignored.",
  },
  {
    path: "src/core/app.ts",
    symbol: "respond",
    title: "Into the core",
    text:
      "From here on nothing knows it is running on Cloudflare. respond() wraps the work in an error boundary and stamps security headers on whatever comes out.",
  },
  {
    path: "src/core/app.ts",
    symbol: "dispatch",
    title: "Who answers?",
    text:
      "API paths go to the route table; everything else goes out through the static-file port.",
  },
  {
    path: "src/core/http/router.ts",
    symbol: "matchRoute",
    title: "A lookup, not a framework",
    text:
      "Routing is a filter over plain data. A wrong method earns a 405 with an Allow header.",
  },
  {
    path: "src/core/http/json_body.ts",
    symbol: "readJsonBody",
    title: "Guards first",
    text:
      "Same-origin check (CSRF), content type, declared size, a bounded read, JSON parsing. The first failure ends the request with a precise problem response.",
  },
  {
    path: "src/core/features/estimate/schema.ts",
    symbol: "EstimateInput",
    title: "The contract",
    text:
      "A strict zod schema: known keys only, numbers in range. The same schema sets the sliders' ranges via GET /api.",
  },
  {
    path: "src/core/features/estimate/estimate.ts",
    symbol: "estimateMonthlyCost",
    title: "Pure business logic",
    text:
      "Plain arithmetic over plain data. Same input, same output: trivially testable, impossible to break with side effects.",
  },
  {
    path: "src/core/http/responses.ts",
    symbol: "json",
    title: "A JSON answer",
    text:
      "Responses are built by pure functions with Cache-Control: no-store, because estimates are personal.",
  },
  {
    path: "src/core/security/headers.ts",
    symbol: "withSecurityHeaders",
    title: "Locked down on the way out",
    text:
      "Every response leaves with the full OWASP header set, defined once in policy.ts.",
  },
];

/** Mount the tour. */
export function mountLifecycle(catalog: Catalog): void {
  const rail = byId("lifecycle-rail");
  const text = byId("lifecycle-text");
  const prev = byId<HTMLButtonElement>("lifecycle-prev");
  const next = byId<HTMLButtonElement>("lifecycle-next");
  const playButton = byId<HTMLButtonElement>("lifecycle-play");
  const body = text?.parentElement;
  if (!rail || !text || !prev || !next || !playButton || !body) return;

  const excerpt = h("pre", { class: "excerpt" });
  body.insertBefore(excerpt, text.nextSibling);
  const total = STOPS.length + 1;
  let at = 0;
  let timer = 0;

  const buttons = Array.from({ length: total }, (_, i) => {
    const button = h("button", {
      type: "button",
      "aria-label": `Step ${i + 1}`,
    }, [String(i + 1)]);
    button.addEventListener("click", () => show(i));
    return button;
  });
  rail.replaceChildren(...buttons.map((b) => h("li", {}, [b])));

  const finale = async (): Promise<void> => {
    text.replaceChildren(
      h("b", {}, ["Now for real. "]),
      "Sending POST /api/estimate with the cost sliders' values…",
    );
    excerpt.replaceChildren();
    const result = await postJson<Estimate>(
      "/api/estimate",
      readEstimateInput(),
    );
    const secured = [
      "content-security-policy",
      "strict-transport-security",
      "x-content-type-options",
    ]
      .filter((name) => result.headers.has(name)).length;
    text.replaceChildren(
      h("b", {}, [`HTTP ${result.status} in ${Math.round(result.ms)} ms. `]),
      `Every step above just ran. ${secured}/3 sampled security headers present; body: ${
        result.ok ? "an estimate" : "a problem report"
      }.`,
    );
  };

  const show = (index: number): void => {
    at = (index + total) % total;
    buttons.forEach((b, i) => {
      b.classList.toggle("is-done", i < at);
      if (i === at) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    const stop = STOPS[at];
    if (stop === undefined) {
      void finale();
      return;
    }
    text.replaceChildren(
      h("b", {}, [`${at + 1}. ${stop.title}. `]),
      stop.text,
      " ",
      h("a", {
        class: "ref",
        href: "#anatomy",
        "data-open-module": stop.path,
        "data-symbol": stop.symbol,
      }, [`${shortName(stop.path)} · ${stop.symbol}`]),
    );
    const module = catalog.modules.find((m) => m.path === stop.path);
    const line = module?.symbols.find((s) => s.name === stop.symbol)?.line;
    if (module === undefined || line === undefined) {
      excerpt.replaceChildren();
      return;
    }
    const [from, to] = symbolRange(module.source, line);
    excerpt.replaceChildren(
      ...codeRows(module.path, module.source, {
        from,
        to: Math.min(to, from + 28),
      }),
    );
  };

  const stopAuto = (): void => {
    clearInterval(timer);
    timer = 0;
    playButton.querySelector(".btn__label")?.replaceChildren("Autoplay");
  };
  prev.addEventListener("click", () => {
    stopAuto();
    show(at - 1);
  });
  next.addEventListener("click", () => {
    stopAuto();
    show(at + 1);
  });
  playButton.addEventListener("click", () => {
    if (timer !== 0) return stopAuto();
    playButton.querySelector(".btn__label")?.replaceChildren("Pause");
    timer = setInterval(() => {
      if (at >= total - 1) return stopAuto();
      show(at + 1);
    }, 3800);
  });
  show(0);
}
