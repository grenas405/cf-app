/**
 * Chip labels for the blueprint form. Typed against the core's enums, so if
 * the server gains or loses an option this file stops compiling until the
 * UI catches up. The types cross the boundary; the code does not.
 *
 * @module
 */

import type {
  Goal,
  Industry,
  TeamSize,
} from "../../core/features/blueprint/schema.ts";

export const INDUSTRY_LABELS: Readonly<Record<Industry, string>> = {
  "restaurant": "Restaurant & food truck",
  "retail": "Boutique & retail",
  "energy": "Energy & field services",
  "healthcare": "Clinic & wellness",
  "nonprofit": "Nonprofit & community",
  "real-estate": "Real estate",
  "agriculture": "Agriculture & ranch supply",
  "aerospace": "Aerospace & manufacturing",
  "creative": "Creative studio & film",
};

export const GOAL_LABELS: Readonly<Record<Goal, string>> = {
  "online-orders": "Online orders",
  "bookings": "Bookings",
  "lead-capture": "Lead capture",
  "inventory-sync": "Inventory sync",
  "multilingual": "Spanish & Vietnamese",
  "storm-ready": "Storm-season resilience",
  "event-spikes": "Game-night spikes",
  "field-forms": "Offline field forms",
};

export const TEAM_LABELS: Readonly<Record<TeamSize, string>> = {
  "solo": "Just me",
  "small": "Small team",
  "growing": "Growing team",
};

/** The most goals the schema accepts. */
export const MAX_GOALS = 4;

/** Typed entries of a record, in declaration order. */
export function entries<K extends string>(
  record: Readonly<Record<K, string>>,
): [K, string][] {
  return Object.entries(record) as [K, string][];
}
