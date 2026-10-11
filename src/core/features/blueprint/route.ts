/**
 * `POST /api/blueprint`: wires the input pipeline to the pure composer.
 *
 * @module
 */

import { readJsonBody } from "../../http/json_body.ts";
import { json } from "../../http/responses.ts";
import type { Route } from "../../types.ts";
import { composeBlueprint } from "./blueprint.ts";
import { BlueprintInput } from "./schema.ts";

/** Three short fields fit easily in 1 KiB. */
const MAX_BODY_BYTES = 1_024;

export const blueprintRoute: Route = {
  method: "POST",
  path: "/api/blueprint",
  summary: "Builds an edge blueprint for an Oklahoma City business.",
  input: BlueprintInput,
  handle: async (request) => {
    const input = await readJsonBody(request, BlueprintInput, MAX_BODY_BYTES);
    return input.ok ? json(composeBlueprint(input.value)) : input.error;
  },
};
