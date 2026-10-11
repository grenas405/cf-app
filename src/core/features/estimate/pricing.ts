/**
 * Cloudflare Workers list prices, kept as data rather than buried in math so
 * they are easy to audit and update. Always confirm against the source.
 *
 * @module
 */

/** The numbers the estimate depends on. */
export interface WorkersPricing {
  readonly source: string;
  readonly checkedOn: string;
  readonly daysPerMonth: number;
  readonly free: {
    readonly requestsPerDay: number;
    readonly cpuMsPerRequest: number;
  };
  readonly paid: {
    readonly monthlyBaseUsd: number;
    readonly includedRequests: number;
    readonly usdPerMillionRequests: number;
    readonly includedCpuMs: number;
    readonly usdPerMillionCpuMs: number;
  };
}

export const WORKERS_PRICING: WorkersPricing = {
  source: "https://developers.cloudflare.com/workers/platform/pricing/",
  checkedOn: "2026-10-11",
  daysPerMonth: 30,
  free: { requestsPerDay: 100_000, cpuMsPerRequest: 10 },
  paid: {
    monthlyBaseUsd: 5,
    includedRequests: 10_000_000,
    usdPerMillionRequests: 0.3,
    includedCpuMs: 30_000_000,
    usdPerMillionCpuMs: 0.02,
  },
};
