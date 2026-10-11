/**
 * `POST /api/estimate`: the HTTP face of the cost estimator. This file only
 * wires the input pipeline to the pure math; it contains no logic of its own.
 *
 * @module
 */

import { readJsonBody } from "../../http/json_body.ts";
import { json } from "../../http/responses.ts";
import type { Route } from "../../types.ts";
import { estimateMonthlyCost } from "./estimate.ts";
import { EstimateInput } from "./schema.ts";

/** A handful of numbers never needs more than 2 KiB. */
const MAX_BODY_BYTES = 2_048;

export const estimateRoute: Route = {
  method: "POST",
  path: "/api/estimate",
  summary: "Estimates a month of Cloudflare Workers costs for your traffic.",
  input: EstimateInput,
  handle: async (request) => {
    const input = await readJsonBody(request, EstimateInput, MAX_BODY_BYTES);
    return input.ok ? json(estimateMonthlyCost(input.value)) : input.error;
  },
};
