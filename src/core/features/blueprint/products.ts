/**
 * Cloudflare building blocks, described in plain words for business owners.
 *
 * @module
 */

export type ProductId =
  | "workers"
  | "static-assets"
  | "kv"
  | "d1"
  | "r2"
  | "durable-objects"
  | "queues"
  | "cron-triggers"
  | "turnstile"
  | "cache-api";

/** A building block and what it does for you. */
export interface Product {
  readonly id: ProductId;
  readonly name: string;
  readonly what: string;
}

export const PRODUCTS: Readonly<Record<ProductId, Product>> = {
  "workers": {
    id: "workers",
    name: "Workers",
    what:
      "Your code, running in Cloudflare data centers close to each customer, with no server to patch.",
  },
  "static-assets": {
    id: "static-assets",
    name: "Static Assets",
    what:
      "Pages, styles and images served from Cloudflare's network. Asset requests are free.",
  },
  "kv": {
    id: "kv",
    name: "Workers KV",
    what:
      "Global key-value storage for settings, translations and cached data. Fast reads everywhere.",
  },
  "d1": {
    id: "d1",
    name: "D1",
    what: "A serverless SQL database (SQLite) for orders, leads and bookings.",
  },
  "r2": {
    id: "r2",
    name: "R2",
    what:
      "Object storage for photos, PDFs and video, with no egress fees for downloads.",
  },
  "durable-objects": {
    id: "durable-objects",
    name: "Durable Objects",
    what:
      "One coordinator per thing (a calendar, a cart) so simultaneous requests never collide.",
  },
  "queues": {
    id: "queues",
    name: "Queues",
    what:
      "Hand slow work (tickets, emails, syncs) to the background so customers never wait.",
  },
  "cron-triggers": {
    id: "cron-triggers",
    name: "Cron Triggers",
    what: "Run a Worker on a schedule: hourly syncs, nightly reports.",
  },
  "turnstile": {
    id: "turnstile",
    name: "Turnstile",
    what: "Stops bots on your forms without making customers solve puzzles.",
  },
  "cache-api": {
    id: "cache-api",
    name: "Cache API",
    what: "Keeps hot responses in the data center that served them.",
  },
};
