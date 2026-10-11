/**
 * Illustrative Claude Code sessions for the terminal. Not recordings: each is
 * a faithful sketch of the workflow this repo is set up for (read the rules,
 * plan, edit small pure pieces, prove it with `deno task check`).
 *
 * @module
 */

/** How a line is styled. */
export type LineKind =
  | "user"
  | "claude"
  | "tool"
  | "out"
  | "add"
  | "del"
  | "ok"
  | "gap";

/** One line of a session. */
export interface Line {
  readonly kind: LineKind;
  readonly text: string;
}

/** A named session. */
export interface Session {
  readonly id: string;
  readonly title: string;
  readonly lines: readonly Line[];
}

const l = (kind: LineKind, text = ""): Line => ({ kind, text });

export const SESSIONS: readonly Session[] = [
  {
    id: "spanish",
    title: "Spanish menu",
    lines: [
      l("user", "Serve our menu in Spanish when the browser asks for it."),
      l("gap"),
      l("tool", "Read CLAUDE.md"),
      l("out", "Core must stay pure; adapters own I/O; zod at every boundary."),
      l(
        "claude",
        "Plan: a pure pickLanguage() in the core using @std/http/negotiation, a menu feature that takes the language, and tests for both. No adapter changes needed.",
      ),
      l("user", "Go ahead."),
      l("tool", "Write src/core/features/menu/language.ts"),
      l("add", "+ export function pickLanguage(request: Request): Language {"),
      l("add", '+   return acceptsLanguages(request, ...LANGUAGES) ?? "en";'),
      l("add", "+ }"),
      l("tool", "Write tests/core/menu_test.ts"),
      l("add", '+ Deno.test("prefers es when asked", () => { ... });'),
      l("tool", "Bash deno task check"),
      l("out", "fmt ok · lint ok · types ok"),
      l("ok", "✓ all tests passed · 8/8 architecture rules"),
      l(
        "claude",
        "Done. Spanish is served on Accept-Language: es; English stays the default. Diff is ready for review.",
      ),
    ],
  },
  {
    id: "booking",
    title: "Booking endpoint",
    lines: [
      l(
        "user",
        "Add POST /api/bookings for our Midtown studio. No double-booking.",
      ),
      l("gap"),
      l("tool", "Read CLAUDE.md, src/core/types.ts"),
      l(
        "claude",
        "Double-booking needs one coordinator per calendar, so I'll add a Calendar port to the core and implement it with a Durable Object in the Cloudflare adapter only.",
      ),
      l("tool", "Write src/core/features/bookings/schema.ts"),
      l("add", "+ export const BookingInput = z.strictObject({"),
      l(
        "add",
        "+   slot: z.iso.datetime(), partySize: z.number().int().min(1).max(8),",
      ),
      l("add", "+ });"),
      l("tool", "Edit src/core/types.ts"),
      l("add", "+   readonly calendar: Calendar;"),
      l("tool", "Write src/adapters/cloudflare/calendar.ts"),
      l("tool", "Bash deno task check"),
      l("out", "architecture: portable-core ✓ pure-core ✓ narrow-boundary ✓"),
      l("ok", "✓ all tests passed"),
      l(
        "claude",
        "The core decides what a valid booking is; the Durable Object guarantees only one wins each slot.",
      ),
    ],
  },
  {
    id: "harden",
    title: "Harden a form",
    lines: [
      l(
        "user",
        "Our contact form gets spam. Fix it without annoying customers.",
      ),
      l("gap"),
      l("tool", 'Grep "lead" src/'),
      l(
        "claude",
        "I'll verify a Turnstile token in the Cloudflare adapter and pass the result to the core as a boolean, so the core stays testable without the network.",
      ),
      l("tool", "Edit src/core/features/leads/route.ts"),
      l(
        "del",
        "-   const input = await readJsonBody(request, LeadInput, MAX);",
      ),
      l(
        "add",
        '+   if (!context.human) return problem(STATUS_CODE.Forbidden, "Verification failed.");',
      ),
      l(
        "add",
        "+   const input = await readJsonBody(request, LeadInput, MAX);",
      ),
      l("tool", "Bash deno task check"),
      l("ok", "✓ all tests passed"),
      l(
        "claude",
        "Bots get a 403 before any parsing happens; people never see a puzzle.",
      ),
    ],
  },
];
