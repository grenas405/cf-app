/**
 * Print the core's security policy in Cloudflare's `_headers` format.
 *
 *   deno run src/tooling/emit_headers.ts > dist/public/_headers
 *
 * One policy, two delivery mechanisms: the core stamps it on API responses,
 * and Cloudflare applies this file to static assets it serves directly.
 *
 * @module
 */

import { renderHeadersFile } from "../core/mod.ts";
import { writeStdout } from "./files.ts";

if (import.meta.main) {
  await writeStdout(renderHeadersFile());
}
