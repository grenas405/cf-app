/**
 * The browser's view of the API. Response shapes are imported as types from
 * the core, so the compiler catches drift between client and server, while no
 * server code ever ships to the browser.
 *
 * @module
 */

import type { Problem } from "../core/http/responses.ts";

/** Everything a caller might want to know about one exchange. */
export interface ApiResult<T> {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: Headers;
  readonly body: T | Problem | null;
  readonly ms: number;
}

/** Narrow a result to its success body. */
export function bodyOf<T>(result: ApiResult<T>): T | null {
  return result.ok ? result.body as T : null;
}

/** Narrow a result to its problem body. */
export function problemOf<T>(result: ApiResult<T>): Problem | null {
  return result.ok ? null : result.body as Problem | null;
}

/** Perform a request and time it. Network failures become status 0. */
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const started = performance.now();
  try {
    const response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
    });
    const text = await response.text();
    const ms = performance.now() - started;
    let body: T | Problem | null = null;
    try {
      body = text === "" ? null : JSON.parse(text);
    } catch {
      body = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      body,
      ms,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      body: null,
      ms: performance.now() - started,
    };
  }
}

/** `GET` a JSON resource. */
export function getJson<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path);
}

/** `POST` a JSON body. */
export function postJson<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
