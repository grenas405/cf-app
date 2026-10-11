/**
 * The contract for `POST /api/estimate`. One strict zod schema is the single
 * source of truth: it validates input at the edge, types the code, and is
 * published as JSON Schema so the UI can set its slider ranges from it.
 *
 * @module
 */

import { z } from "@zod/zod";

export const EstimateInput = z.strictObject({
  monthlyVisitors: z.number().int().min(0).max(10_000_000)
    .describe("Visits to your site per month"),
  pagesPerVisit: z.number().min(1).max(30)
    .describe("Pages a typical visitor opens"),
  apiCallsPerPage: z.number().min(0).max(20)
    .describe("Dynamic requests per page that run Worker code"),
  cpuMsPerCall: z.number().min(0.5).max(50)
    .describe("CPU milliseconds each Worker request uses"),
  currentMonthlyHosting: z.number().min(0).max(50_000)
    .describe("What you pay for hosting today, in USD per month"),
});

export type EstimateInput = z.infer<typeof EstimateInput>;
