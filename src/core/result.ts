/**
 * Errors as values. A function that can fail returns a `Result` instead of
 * throwing, so every failure path is visible in its signature and handled
 * explicitly by the caller (Unix "Rule of Repair": fail noisily and early).
 *
 * @module
 */

/** A successful outcome carrying a value. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** A failed outcome carrying a reason. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Either a success or a failure, never both. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Wrap a value as a success. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Wrap a reason as a failure. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
