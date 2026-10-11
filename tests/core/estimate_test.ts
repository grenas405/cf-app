import { assert, assertEquals } from "@std/assert";
import {
  estimateMonthlyCost,
  fitsFreePlan,
  overageUsd,
  roundCents,
} from "../../src/core/features/estimate/estimate.ts";
import { WORKERS_PRICING } from "../../src/core/features/estimate/pricing.ts";
import { EstimateInput } from "../../src/core/features/estimate/schema.ts";

const base: EstimateInput = {
  monthlyVisitors: 5_000,
  pagesPerVisit: 4,
  apiCallsPerPage: 1,
  cpuMsPerCall: 3,
  currentMonthlyHosting: 40,
};

Deno.test("roundCents() and overageUsd() do the small math", () => {
  assertEquals(roundCents(1), 1);
  assertEquals(roundCents(12.345), 12.35);
  assertEquals(overageUsd(5, 10, 1), 0);
  assertEquals(overageUsd(12_000_000, 10_000_000, 0.3), 0.6);
});

Deno.test("fitsFreePlan() checks the daily average and CPU cap", () => {
  assert(fitsFreePlan(3_000_000, 10, WORKERS_PRICING));
  assertEquals(fitsFreePlan(3_000_001, 10, WORKERS_PRICING), false);
  assertEquals(fitsFreePlan(10, 11, WORKERS_PRICING), false);
});

Deno.test("a small OKC shop fits the Free plan", () => {
  const estimate = estimateMonthlyCost(base);
  assertEquals(estimate.plan, "free");
  assertEquals(estimate.pageViews, 20_000);
  assertEquals(estimate.workerRequests, 20_000);
  assertEquals(estimate.monthlyUsd, 0);
  assertEquals(estimate.monthlySavingsUsd, 40);
});

Deno.test("a busy site pays $5 plus metered overage", () => {
  const estimate = estimateMonthlyCost({
    ...base,
    monthlyVisitors: 5_000_000,
    apiCallsPerPage: 6,
  });
  // 5M visits x 4 pages x 6 calls = 120M requests; 360M CPU ms.
  assertEquals(estimate.plan, "paid");
  assertEquals(estimate.workerRequests, 120_000_000);
  assertEquals(estimate.lines.map((l) => l.usd), [5, 33, 6.6]);
  assertEquals(estimate.monthlyUsd, 44.6);
});

Deno.test("the estimate is a pure function of its input", () => {
  assertEquals(estimateMonthlyCost(base), estimateMonthlyCost(base));
});

Deno.test("the schema is strict and bounded", () => {
  assert(EstimateInput.safeParse(base).success);
  assertEquals(
    EstimateInput.safeParse({ ...base, monthlyVisitors: -1 }).success,
    false,
  );
  assertEquals(
    EstimateInput.safeParse({ ...base, monthlyVisitors: 1.5 }).success,
    false,
  );
  assertEquals(
    EstimateInput.safeParse({ ...base, isAdmin: true }).success,
    false,
  );
  assertEquals(
    EstimateInput.safeParse({ ...base, cpuMsPerCall: Infinity }).success,
    false,
  );
});
