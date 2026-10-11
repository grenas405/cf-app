/**
 * Translate Cloudflare's `request.cf` object into the core's `EdgeInfo`.
 *
 * Platform data is still input, so it is parsed with zod like everything
 * else. Only the fields the app shows are read (data minimization):
 * coordinates, postal codes and ISP details are never touched.
 *
 * @module
 */

import { z } from "@zod/zod";
import type { EdgeInfo } from "../../core/mod.ts";

const short = z.string().max(64).optional().catch(undefined);

/** The subset of `IncomingRequestCfProperties` this app reads. */
export const CfProperties = z.object({
  colo: short,
  city: short,
  region: short,
  country: short,
  httpProtocol: short,
  tlsVersion: short,
});

/** Pull the `cf` property off a request, if the platform attached one. */
export function cfOf(request: Request): unknown {
  return (request as Request & { readonly cf?: unknown }).cf;
}

/** Build `EdgeInfo` from whatever `request.cf` contains. */
export function readEdgeInfo(request: Request): EdgeInfo {
  const parsed = CfProperties.safeParse(cfOf(request) ?? {});
  const cf = parsed.success ? parsed.data : {};
  return {
    runtime: "cloudflare-workers",
    colo: cf.colo,
    visitorCity: cf.city,
    visitorRegion: cf.region,
    visitorCountry: cf.country,
    httpProtocol: cf.httpProtocol,
    tlsVersion: cf.tlsVersion,
  };
}
