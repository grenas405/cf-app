/**
 * Compose a tailored plan from a business profile and its goals. Pure data
 * in, pure data out: the "intelligence" is a few table lookups and merges.
 *
 * @module
 */

import { GOAL_PLAYS, type PackagePick } from "./goals.ts";
import { INDUSTRY_PROFILES } from "./industries.ts";
import { type Product, type ProductId, PRODUCTS } from "./products.ts";
import type { BlueprintInput, TeamSize } from "./schema.ts";

/** The plan returned to the browser. */
export interface Blueprint {
  readonly industry: string;
  readonly headline: string;
  readonly scene: string;
  readonly caution?: string;
  readonly goals: readonly string[];
  readonly products: readonly Product[];
  readonly packages: readonly PackagePick[];
  readonly plan: string;
  readonly steps: readonly string[];
  readonly prompt: string;
}

/** Packages every blueprint starts with: this codebase's own stack. */
const BASE_PACKAGES: readonly PackagePick[] = [
  { name: "@std/http", why: "Web-standard HTTP helpers for any runtime." },
  { name: "@zod/zod", why: "One schema for validation, types and docs." },
  { name: "@std/assert", why: "Fast unit tests for every pure function." },
];

const TEAM_PLANS: Readonly<Record<TeamSize, string>> = {
  solo:
    "Start on the Workers Free plan and ship one goal at a time. Claude Code does the typing; you make the decisions.",
  small:
    "Move to Workers Paid ($5/month) when you launch, for higher limits and room to grow. Review every Claude Code change in a pull request.",
  growing:
    "Use Workers Paid with a staging environment, and let CI run `deno task check` on every pull request before anything reaches customers.",
};

/** Products that are the platform itself rather than services behind a port. */
const RUNTIME_PRODUCTS: readonly ProductId[] = ["workers", "static-assets"];

const TEAM_WORDS: Readonly<Record<TeamSize, string>> = {
  solo: "one-person",
  small: "small",
  growing: "growing",
};

/** Keep the first occurrence of each key, preserving order. */
export function uniqueBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** The ready-to-paste instruction for Claude Code. */
export function composePrompt(
  industryLabel: string,
  teamSize: TeamSize,
  asks: readonly string[],
  products: readonly Product[],
): string {
  const services = products.filter((p) => !RUNTIME_PRODUCTS.includes(p.id));
  return [
    `Read CLAUDE.md first. We are a ${
      TEAM_WORDS[teamSize]
    } ${industryLabel.toLowerCase()} team in Oklahoma City.`,
    "",
    "Goals:",
    ...asks.map((ask, i) => `${i + 1}. ${ask}.`),
    "",
    "Rules:",
    "- Business logic lives in pure functions in src/core, each with a unit test.",
    "- Every input is checked by a strict zod schema before any work happens.",
    services.length === 0
      ? "- Keep anything Cloudflare-specific in src/adapters/cloudflare."
      : `- Reach ${
        services.map((p) => p.name).join(", ")
      } only through ports implemented in src/adapters/cloudflare.`,
    "",
    "Plan first and wait for my OK. Then work in small commits and run `deno task check` before showing me the diff.",
  ].join("\n");
}

/** Build the whole blueprint. */
export function composeBlueprint(input: BlueprintInput): Blueprint {
  const profile = INDUSTRY_PROFILES[input.industry];
  const plays = input.goals.map((goal) => GOAL_PLAYS[goal]);

  const productIds: ProductId[] = uniqueBy(
    [
      "workers",
      "static-assets",
      profile.signature,
      ...plays.flatMap((p) => p.products),
    ],
    (id) => id,
  );
  const products = productIds.map((id) => PRODUCTS[id]);
  const packages = uniqueBy(
    [...BASE_PACKAGES, ...plays.flatMap((play) => play.packages)],
    (pick) => pick.name,
  );

  return {
    industry: profile.label,
    headline: profile.headline,
    scene: profile.scene,
    ...(profile.caution === undefined ? {} : { caution: profile.caution }),
    goals: plays.map((play) => play.label),
    products,
    packages,
    plan: TEAM_PLANS[input.teamSize],
    steps: [
      "Clone this repo and run `deno task dev` to see the core running locally.",
      ...plays.map((play) => `Ask Claude Code to ${play.ask}.`),
      "Run `deno task deploy` and share your workers.dev link.",
    ],
    prompt: composePrompt(
      profile.label,
      input.teamSize,
      plays.map((play) => play.ask),
      products,
    ),
  };
}
