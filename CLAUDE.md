# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## What this is

OKC Edge: an interactive site that explains Cloudflare Workers + JSR + Claude
Code to Oklahoma City businesses, built with the architecture it describes.

## Architecture: ports and adapters

```
src/core/       runtime-agnostic core: pure functions over Request/Response
src/adapters/   one folder per runtime; the only place that touches I/O
  cloudflare/   production (Workers + Static Assets)
  deno/         local dev + proof of portability (std/http/file-server)
src/ui/         browser code, bundled to dist/public/app.js
src/tooling/    small programs that generate _headers and catalog.json
public/         hand-written HTML/CSS/SVG shell
tests/          deno test suites, including the architecture rules
```

The core talks to the world only through `Ports` (`src/core/types.ts`):
`serveStatic` and `log`. Per-request facts (`EdgeInfo`, the clock) arrive in
`RequestContext`. Adding a runtime means writing a new adapter, never editing
the core.

## Rules (enforced by `tests/architecture_test.ts`)

1. Core imports only core files, `@std/http/status` and `@zod/zod`.
2. Core never uses runtime globals or impure calls: no `Deno`, `process`,
   `Date.now()`, `Math.random()`, `console`, `fetch`, timers.
3. Adapters import the core only through `src/core/mod.ts`.
4. Adapters never import each other.
5. UI may import core types (`import type`) but never core code.
6. No classes anywhere. Use small named functions over plain data.
7. Modules stay under 300 lines.
8. Every module starts with a `/** ... @module */` comment saying why it exists.

## Conventions

- Validate every external input with a strict zod schema (`z.strictObject`).
  Platform data (`request.cf`, env vars) counts as external.
- Failures are values: return `Result` (`src/core/result.ts`), don't throw.
  Error responses are RFC 9457 problem details without internals.
- Security headers are defined once in `src/core/security/policy.ts`. Never set
  them anywhere else.
- Browser code builds DOM with `h()`/`textContent`; never `innerHTML`. The CSP
  enforces Trusted Types, so a stray `innerHTML` throws.
- Generated files (`dist/`) are never edited or committed.
- Prefer explicit return types and `readonly` data.

## Commands

```
deno task dev      # build, then serve via the Deno adapter on :8000
deno task dev:cf   # build, then run the Cloudflare adapter in workerd
deno task test     # unit + architecture tests
deno task check    # fmt, lint, type-check, tests, build: run before every commit
deno task deploy   # check, then deploy to Cloudflare Workers
```

## Workflow

Plan first, then make small commits. Put new business logic in a pure function
under `src/core/features/<feature>/` with a test in `tests/`. Run
`deno task check` and make it pass before presenting a diff.
