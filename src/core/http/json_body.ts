/**
 * The input pipeline for every JSON endpoint, written as a flat sequence of
 * small checks. Each step either passes the request along or stops it with a
 * precise problem response; the first failure wins.
 *
 *   same origin -> JSON content type -> declared size -> bounded read
 *   -> JSON.parse -> zod schema
 *
 * @module
 */

import { STATUS_CODE } from "@std/http/status";
import type { z } from "@zod/zod";
import { err, ok, type Result } from "../result.ts";
import { parseJson, readTextWithin } from "./body.ts";
import {
  declaredLengthWithin,
  isJsonContentType,
  isSameOrigin,
} from "./guards.ts";
import { type FieldError, problem } from "./responses.ts";

/** The most issues we report back; enough to fix a form, not to flood. */
const MAX_REPORTED_ISSUES = 20;

/** Flatten zod issues into `{ path, message }` pairs for the client. */
export function toFieldErrors(error: z.ZodError): readonly FieldError[] {
  return error.issues.slice(0, MAX_REPORTED_ISSUES).map((issue) => ({
    path: issue.path.length === 0 ? "(body)" : issue.path.join("."),
    message: issue.message,
  }));
}

/** Validate an already-parsed value against a schema. */
export function validate<T>(
  schema: z.ZodType<T>,
  value: unknown,
): Result<T, Response> {
  const parsed = schema.safeParse(value);
  return parsed.success ? ok(parsed.data) : err(problem(
    STATUS_CODE.UnprocessableEntity,
    "The request body failed validation.",
    toFieldErrors(parsed.error),
  ));
}

/** Run the full pipeline and hand back either typed data or a response. */
export async function readJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes: number,
): Promise<Result<T, Response>> {
  if (!isSameOrigin(request)) {
    return err(problem(
      STATUS_CODE.Forbidden,
      "Cross-site requests are not accepted.",
    ));
  }
  if (!isJsonContentType(request)) {
    return err(problem(
      STATUS_CODE.UnsupportedMediaType,
      "Send JSON with Content-Type: application/json.",
    ));
  }
  if (!declaredLengthWithin(request, maxBytes)) {
    return err(problem(
      STATUS_CODE.ContentTooLarge,
      `Bodies are limited to ${maxBytes} bytes.`,
    ));
  }

  const text = await readTextWithin(request, maxBytes);
  if (!text.ok) {
    return err(
      text.error === "too-large"
        ? problem(
          STATUS_CODE.ContentTooLarge,
          `Bodies are limited to ${maxBytes} bytes.`,
        )
        : problem(STATUS_CODE.BadRequest, "The body is not valid UTF-8."),
    );
  }

  const value = parseJson(text.value);
  if (!value.ok) {
    return err(problem(STATUS_CODE.BadRequest, "The body is not valid JSON."));
  }
  return validate(schema, value.value);
}
