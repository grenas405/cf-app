/**
 * Goals a business can pick, each mapped to building blocks, JSR packages
 * and one line of instruction for Claude Code.
 *
 * @module
 */

import type { ProductId } from "./products.ts";
import type { Goal } from "./schema.ts";

/** A JSR package and why it earns its place. */
export interface PackagePick {
  readonly name: string;
  readonly why: string;
}

/** What one goal contributes to a blueprint. */
export interface GoalPlay {
  readonly label: string;
  readonly products: readonly ProductId[];
  readonly packages: readonly PackagePick[];
  /** One concrete instruction for Claude Code. */
  readonly ask: string;
}

const zod: PackagePick = {
  name: "@zod/zod",
  why: "Strict schemas that reject bad input at the edge.",
};
const ulid: PackagePick = {
  name: "@std/ulid",
  why: "Sortable IDs that can be created offline without collisions.",
};
const http: PackagePick = {
  name: "@std/http",
  why: "Content negotiation, ETags and status codes from the standard library.",
};

export const GOAL_PLAYS: Readonly<Record<Goal, GoalPlay>> = {
  "online-orders": {
    label: "Online orders",
    products: ["workers", "d1", "queues", "turnstile"],
    packages: [zod, ulid],
    ask:
      "add POST /api/orders: validate the cart with a strict zod schema, price it in a pure function, save it to D1 through a port, and queue a kitchen ticket",
  },
  "bookings": {
    label: "Appointments & bookings",
    products: ["durable-objects", "d1"],
    packages: [zod, {
      name: "@std/datetime",
      why: "Formatting and parsing appointment times.",
    }],
    ask:
      "add booking where each calendar is a Durable Object, so two customers can never take the same slot",
  },
  "lead-capture": {
    label: "Lead capture",
    products: ["turnstile", "d1"],
    packages: [zod],
    ask:
      "add a contact form protected by Turnstile, validated with zod, stored in D1, and scored by a pure, tested function",
  },
  "inventory-sync": {
    label: "Inventory sync",
    products: ["cron-triggers", "kv"],
    packages: [
      { name: "@std/csv", why: "Parsing supplier and POS exports." },
      {
        name: "@std/async",
        why: "Retry with backoff when a supplier is slow.",
      },
    ],
    ask:
      "add an hourly Cron Trigger that pulls our supplier CSV, parses it with @std/csv, and caches stock levels in KV",
  },
  "multilingual": {
    label: "Spanish & Vietnamese pages",
    products: ["kv"],
    packages: [http],
    ask:
      "serve English, Spanish and Vietnamese copy chosen from Accept-Language with @std/http/negotiation, with translations stored in KV",
  },
  "storm-ready": {
    label: "Storm-season resilience",
    products: ["static-assets", "kv"],
    packages: [http],
    ask:
      "add a site-wide announcement banner stored in KV that I can update from my phone when weather closes the shop",
  },
  "event-spikes": {
    label: "Game-night traffic spikes",
    products: ["static-assets", "cache-api"],
    packages: [http],
    ask:
      "make menu and event pages cacheable with ETags from @std/http/etag so traffic spikes are answered from cache",
  },
  "field-forms": {
    label: "Offline field forms",
    products: ["r2", "d1"],
    packages: [zod, ulid],
    ask:
      "build an offline-first inspection form whose entries carry client-made ULIDs, sync to D1, and upload photos to R2",
  },
};
