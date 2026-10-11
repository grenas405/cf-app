/**
 * Monthly cost math for a site on Cloudflare Workers. Pure arithmetic: the
 * same input always yields the same estimate, and each line shows its formula
 * so a business owner can check the work.
 *
 * @module
 */

import { WORKERS_PRICING, type WorkersPricing } from "./pricing.ts";
import type { EstimateInput } from "./schema.ts";

/** One line on the bill. */
export interface CostLine {
  readonly label: string;
  readonly formula: string;
  readonly usd: number;
}

/** The full estimate returned to the browser. */
export interface Estimate {
  readonly plan: "free" | "paid";
  readonly pageViews: number;
  readonly workerRequests: number;
  readonly cpuMs: number;
  readonly lines: readonly CostLine[];
  readonly monthlyUsd: number;
  readonly currentMonthlyUsd: number;
  readonly monthlySavingsUsd: number;
  readonly notes: readonly string[];
  readonly pricing: WorkersPricing;
}

/** Round to whole cents. */
export function roundCents(usd: number): number {
  return Math.round(usd * 100) / 100;
}

/** Usage beyond an allowance, priced per million units. */
export function overageUsd(
  used: number,
  included: number,
  usdPerMillion: number,
): number {
  return (Math.max(0, used - included) / 1_000_000) * usdPerMillion;
}

/** Does this workload fit within the Free plan's daily and CPU limits? */
export function fitsFreePlan(
  workerRequests: number,
  cpuMsPerCall: number,
  pricing: WorkersPricing,
): boolean {
  const perDay = workerRequests / pricing.daysPerMonth;
  return perDay <= pricing.free.requestsPerDay &&
    cpuMsPerCall <= pricing.free.cpuMsPerRequest;
}

/** `12_345_678` -> `"12.35M"` */
function millions(n: number): string {
  return `${Number((n / 1_000_000).toFixed(2))}M`;
}

/** The Workers Paid bill, line by line. */
export function paidLines(
  workerRequests: number,
  cpuMs: number,
  pricing: WorkersPricing,
): readonly CostLine[] {
  const { paid } = pricing;
  return [
    {
      label: "Workers Paid subscription",
      formula: "flat monthly minimum",
      usd: paid.monthlyBaseUsd,
    },
    {
      label: `Requests beyond the included ${millions(paid.includedRequests)}`,
      formula: `max(0, ${millions(workerRequests)} - ${
        millions(paid.includedRequests)
      }) x $${paid.usdPerMillionRequests.toFixed(2)}/M`,
      usd: roundCents(overageUsd(
        workerRequests,
        paid.includedRequests,
        paid.usdPerMillionRequests,
      )),
    },
    {
      label: `CPU time beyond the included ${millions(paid.includedCpuMs)} ms`,
      formula: `max(0, ${millions(cpuMs)} - ${
        millions(paid.includedCpuMs)
      }) ms x $${paid.usdPerMillionCpuMs.toFixed(2)}/M`,
      usd: roundCents(
        overageUsd(cpuMs, paid.includedCpuMs, paid.usdPerMillionCpuMs),
      ),
    },
  ];
}

/** Lines shown when everything fits on the Free plan. */
export function freeLines(pricing: WorkersPricing): readonly CostLine[] {
  const { requestsPerDay, cpuMsPerRequest } = pricing.free;
  return [{
    label: "Workers Free plan",
    formula: `under ${
      requestsPerDay.toLocaleString("en-US")
    } Worker requests/day and ${cpuMsPerRequest} ms CPU each`,
    usd: 0,
  }];
}

/** Estimate a month on Workers. */
export function estimateMonthlyCost(
  input: EstimateInput,
  pricing: WorkersPricing = WORKERS_PRICING,
): Estimate {
  const pageViews = Math.round(input.monthlyVisitors * input.pagesPerVisit);
  const workerRequests = Math.round(pageViews * input.apiCallsPerPage);
  const cpuMs = Math.round(workerRequests * input.cpuMsPerCall);
  const plan = fitsFreePlan(workerRequests, input.cpuMsPerCall, pricing)
    ? "free"
    : "paid";
  const lines = plan === "free"
    ? freeLines(pricing)
    : paidLines(workerRequests, cpuMs, pricing);
  const monthlyUsd = roundCents(lines.reduce((sum, l) => sum + l.usd, 0));

  return {
    plan,
    pageViews,
    workerRequests,
    cpuMs,
    lines,
    monthlyUsd,
    currentMonthlyUsd: roundCents(input.currentMonthlyHosting),
    monthlySavingsUsd: roundCents(input.currentMonthlyHosting - monthlyUsd),
    notes: [
      `${
        pageViews.toLocaleString("en-US")
      } page views are served as Static Assets, which are free and do not count as Worker requests.`,
      "The Free plan limit is daily; a single viral day can exceed it even when the monthly average fits.",
      "Storage products (KV, D1, R2) are billed separately and have their own free allowances.",
      `List prices checked on ${pricing.checkedOn}; confirm at ${pricing.source}.`,
    ],
    pricing,
  };
}
