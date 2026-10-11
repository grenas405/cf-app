/**
 * Reading request bodies safely: bounded in size, strict about encoding,
 * and reporting failure as a value instead of an exception.
 *
 * @module
 */

import { err, ok, type Result } from "../result.ts";

/** Why a body could not be read. */
export type ReadError = "too-large" | "unreadable";

/** Join byte chunks into one array. */
export function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const joined = new Uint8Array(size);
  chunks.reduce((offset, chunk) => {
    joined.set(chunk, offset);
    return offset + chunk.byteLength;
  }, 0);
  return joined;
}

/** Decode UTF-8, refusing malformed byte sequences. */
export function decodeUtf8(bytes: Uint8Array): Result<string, ReadError> {
  try {
    return ok(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return err("unreadable");
  }
}

/**
 * Read the body as text, stopping as soon as it grows past `maxBytes`.
 * Memory use is bounded no matter what the client sends.
 */
export async function readTextWithin(
  request: Request,
  maxBytes: number,
): Promise<Result<string, ReadError>> {
  if (request.body === null) return ok("");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return err("too-large");
      }
      chunks.push(value);
    }
  } catch {
    return err("unreadable");
  }
  return decodeUtf8(concatBytes(chunks));
}

/** `JSON.parse` that reports failure as a value. */
export function parseJson(text: string): Result<unknown, "not-json"> {
  try {
    return ok(JSON.parse(text));
  } catch {
    return err("not-json");
  }
}
