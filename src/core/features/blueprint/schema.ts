/**
 * The contract for `POST /api/blueprint`. Closed enums mean the server only
 * ever accepts choices it has content for: unknown values are rejected at the
 * edge instead of flowing into the logic (OWASP: allow-list input validation).
 *
 * @module
 */

import { z } from "@zod/zod";

export const INDUSTRIES = [
  "restaurant",
  "retail",
  "energy",
  "healthcare",
  "nonprofit",
  "real-estate",
  "agriculture",
  "aerospace",
  "creative",
] as const;

export const GOALS = [
  "online-orders",
  "bookings",
  "lead-capture",
  "inventory-sync",
  "multilingual",
  "storm-ready",
  "event-spikes",
  "field-forms",
] as const;

export const TEAM_SIZES = ["solo", "small", "growing"] as const;

export type Industry = typeof INDUSTRIES[number];
export type Goal = typeof GOALS[number];
export type TeamSize = typeof TEAM_SIZES[number];

/** True when no value appears twice. */
export function isUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const BlueprintInput = z.strictObject({
  industry: z.enum(INDUSTRIES).describe("What kind of business you run"),
  goals: z.array(z.enum(GOALS)).min(1).max(4)
    .refine(isUnique, "Each goal can only be chosen once")
    .describe("Up to four things you want the web to do for you"),
  teamSize: z.enum(TEAM_SIZES).describe("How many people will build it"),
});

export type BlueprintInput = z.infer<typeof BlueprintInput>;
