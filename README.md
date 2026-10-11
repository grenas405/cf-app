# OKC Edge

An interactive guide to running an Oklahoma City business on **Cloudflare
Workers**, built from **JSR** packages with **Claude Code**. The site dissects
its own architecture as you scroll: every diagram, code excerpt and rule check
on the page is generated from this repository at build time.

- **Live request**: fire real requests at the edge and see which data center
  answered.
- **Blueprint**: pick an OKC industry and goals, and get a plan, the Cloudflare
  building blocks, JSR packages and a ready-to-paste Claude Code prompt.
- **Cost**: drag sliders and get a Workers estimate from a pure function, then
  try to break the API with hostile input.
- **Anatomy**: browse every module, its imports and source, a dependency graph,
  a step-by-step trace of one request, and the architecture rules.
- **Principles**: OWASP and Unix principles mapped to files, plus a live audit
  of the security headers your browser received.

## Architecture

```
          ┌──────────────────────── src/ui (browser) ───────────────────────┐
          │  imports core *types* only; bundled to dist/public/app.js       │
          └─────────────────────────────────────────────────────────────────┘
 Cloudflare Workers                                          Deno
┌───────────────────────────┐                      ┌───────────────────────────┐
│ src/adapters/cloudflare   │                      │ src/adapters/deno         │
│  env.ASSETS → serveStatic │                      │  std/http/file-server     │
│  request.cf → EdgeInfo    │                      │    → serveStatic          │
└─────────────┬─────────────┘                      └─────────────┬─────────────┘
              │            ports: serveStatic, log               │
              └──────────────────────┬───────────────────────────┘
                     ┌───────────────┴────────────────┐
                     │ src/core (runtime-agnostic)    │
                     │ pure functions over Request →  │
                     │ Response, zod at the boundary  │
                     └────────────────────────────────┘
```

- **Core** (`src/core`): Web-standard `Request`/`Response` only. Its only
  dependencies are `@std/http/status` and `@zod/zod`. It contains no classes, no
  runtime globals, no clock and no I/O.
- **Cloudflare adapter** (`src/adapters/cloudflare`): the first and production
  adapter. It maps the `ASSETS` binding and `request.cf` onto the core's ports.
- **Deno adapter** (`src/adapters/deno`): fills the same `serveStatic` port with
  `@std/http/file-server` (`serveDir`/`serveFile`). That module reads the disk
  with `Deno.stat`/`Deno.open`, which Workers don't have. That's why static
  serving is a port and not core code.
- **Tooling** (`src/tooling`): small programs that print to stdout, which the
  shell redirects. `emit_headers.ts > _headers` compiles the security policy for
  Cloudflare. `emit_catalog.ts > catalog.json` produces the codebase's
  self-description for the UI.

The rules in [CLAUDE.md](CLAUDE.md) are enforced by `tests/architecture_test.ts`
and shown live on the page.

## Commands

Requires [Deno](https://deno.com) 2.4+. Wrangler runs through Deno's npm
support, so no Node toolchain is needed.

| Command                   | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `deno task dev`           | Build, then serve via the Deno adapter on http://localhost:8000 |
| `deno task dev:cf`        | Build, then run the Cloudflare adapter in `workerd` (port 8787) |
| `deno task test`          | Unit, integration and architecture tests                        |
| `deno task check`         | fmt, lint, type-check, tests, build (what CI runs)              |
| `deno task publish:check` | Prove the core is a valid JSR package                           |
| `deno task deploy`        | `check`, then `wrangler deploy`                                 |

`deno task build` writes everything to `dist/`:

```
dist/worker.js            core + Cloudflare adapter, bundled by `deno bundle`
dist/public/              public/ + generated files:
  app.js                  the browser bundle (no zod; validation is server-side)
  _headers                security headers for static assets
  catalog.json            modules, imports, exports, sources, rule results
```

## Security (OWASP)

- One header policy (`src/core/security/policy.ts`). It sets a strict CSP with
  Trusted Types, HSTS, frame denial, COOP/COEP/CORP and a Permissions-Policy.
  The core applies it at runtime, and it is compiled into `_headers` for static
  files.
- Every JSON body passes a same-origin check (Fetch Metadata and `Origin`), a
  content-type check, a size cap, a bounded streaming read, `JSON.parse` and a
  strict zod schema, in that order.
- Errors are RFC 9457 problem details without internals. Unexpected failures are
  logged as structured JSON through the `log` port.
- The browser builds DOM with `textContent` only, and has no `innerHTML`.
- Least privilege: the dev server binds to loopback, and every Deno task runs
  with explicit `--allow-*` flags.

## Deploying

From your machine:

```sh
deno task deploy   # runs check first; wrangler will ask you to log in once
```

From Cloudflare's Git integration (Workers Builds), whose build image has Node
but not Deno, use these settings. Deno is published on npm, so `npx` fetches it:

| Setting        | Value                             |
| -------------- | --------------------------------- |
| Build command  | `npx --yes deno@2.9.6 task build` |
| Deploy command | `npx wrangler deploy`             |
| Root directory | `/`                               |

`dist/` is not committed, so the build command is required.

Workers prices in the estimator were checked on 2026-10-11. Confirm them on
[Cloudflare's pricing page](https://developers.cloudflare.com/workers/platform/pricing/).
