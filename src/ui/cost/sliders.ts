/**
 * Slider math, kept pure: the visit scale, display formats, and reading
 * slider bounds out of the JSON Schema that `GET /api` publishes.
 *
 * @module
 */

import type { EstimateInput } from "../../core/features/estimate/schema.ts";
import { compact, count, usd } from "../format.ts";

/** Visits per month, on a roughly logarithmic ladder. */
export const VISIT_STEPS: readonly number[] = [
  1_000,
  2_500,
  5_000,
  10_000,
  25_000,
  50_000,
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_500_000,
  5_000_000,
  10_000_000,
];

/** Slider position to visits, clamped to the ladder. */
export function visitsAt(index: number): number {
  const i = Math.max(0, Math.min(VISIT_STEPS.length - 1, Math.round(index)));
  return VISIT_STEPS[i] ?? 0;
}

/** How each field maps between its slider and the API. */
export interface SliderSpec {
  readonly field: keyof EstimateInput;
  readonly input: string;
  readonly output: string;
  readonly toValue: (raw: number) => number;
  readonly show: (value: number) => string;
  /** Let the schema decide this slider's range? */
  readonly schemaBounds: boolean;
}

export const SLIDERS: readonly SliderSpec[] = [
  {
    field: "monthlyVisitors",
    input: "s-visitors",
    output: "o-visitors",
    toValue: visitsAt,
    show: (v) => v >= 100_000 ? compact(v) : count(v),
    schemaBounds: false,
  },
  {
    field: "pagesPerVisit",
    input: "s-pages",
    output: "o-pages",
    toValue: (v) => v,
    show: (v) => String(v),
    schemaBounds: true,
  },
  {
    field: "apiCallsPerPage",
    input: "s-api",
    output: "o-api",
    toValue: (v) => v,
    show: (v) => String(v),
    schemaBounds: true,
  },
  {
    field: "cpuMsPerCall",
    input: "s-cpu",
    output: "o-cpu",
    toValue: (v) => v,
    show: (v) => `${v} ms`,
    schemaBounds: true,
  },
  {
    field: "currentMonthlyHosting",
    input: "s-hosting",
    output: "o-hosting",
    toValue: (v) => v,
    show: (v) => usd(v).replace(".00", ""),
    schemaBounds: false,
  },
];

/** Min/max for one property of a JSON Schema object, if present. */
export function boundsFrom(
  schema: unknown,
  field: string,
): { min?: number; max?: number } {
  const props = (schema as {
    properties?: Record<string, { minimum?: unknown; maximum?: unknown }>;
  })
    ?.properties;
  const prop = props?.[field];
  const min = typeof prop?.minimum === "number" ? prop.minimum : undefined;
  const max = typeof prop?.maximum === "number" ? prop.maximum : undefined;
  return {
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

/** Percentage of a range input's track that is filled. */
export function fillPercent(value: number, min: number, max: number): string {
  return max === min ? "0%" : `${((value - min) / (max - min)) * 100}%`;
}
