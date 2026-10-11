/**
 * Server settings from environment variables, parsed instead of trusted.
 * The default binds to loopback only: nothing is exposed on the network
 * unless you explicitly ask for it (secure by default).
 *
 * @module
 */

import { z } from "@zod/zod";
import { err, ok, type Result } from "../../core/mod.ts";

export const ServerConfig = z.object({
  port: z.coerce.number().int().min(1).max(65_535).default(8000),
  hostname: z.union([z.ipv4(), z.literal("localhost")]).default("127.0.0.1"),
});

export type ServerConfig = z.infer<typeof ServerConfig>;

/** The raw variables, as `Deno.env.get` returns them. */
export interface RawEnv {
  readonly PORT: string | undefined;
  readonly HOST: string | undefined;
}

/** Parse raw environment strings into a config, or explain what is wrong. */
export function parseConfig(env: RawEnv): Result<ServerConfig, string> {
  const parsed = ServerConfig.safeParse({ port: env.PORT, hostname: env.HOST });
  if (parsed.success) return ok(parsed.data);
  const reasons = parsed.error.issues.map((issue) =>
    `${issue.path.join(".")}: ${issue.message}`
  );
  return err(`Invalid server config. ${reasons.join("; ")}`);
}
