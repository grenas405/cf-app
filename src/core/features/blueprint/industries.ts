/**
 * Oklahoma City business profiles. Scenes are illustrative composites, not
 * real companies.
 *
 * @module
 */

import type { ProductId } from "./products.ts";
import type { Industry } from "./schema.ts";

/** How a kind of business shows up in the blueprint. */
export interface IndustryProfile {
  readonly label: string;
  readonly headline: string;
  readonly scene: string;
  /** The one building block this kind of business benefits from most. */
  readonly signature: ProductId;
  /** Compliance guardrails, when the industry has them. */
  readonly caution?: string;
}

export const INDUSTRY_PROFILES: Readonly<Record<Industry, IndustryProfile>> = {
  "restaurant": {
    label: "Restaurant & food truck",
    headline: "Take orders at the edge, not on the phone.",
    scene:
      "Friday night in Bricktown: the line is out the door and half the orders still arrive by phone.",
    signature: "queues",
  },
  "retail": {
    label: "Boutique & retail",
    headline: "Your shelf, online, always in sync.",
    scene:
      "A Plaza District shop with four hundred products and one register that already knows the inventory.",
    signature: "kv",
  },
  "energy": {
    label: "Energy & field services",
    headline: "Paperwork that works where the signal doesn't.",
    scene:
      "Crews out past Kingfisher with one bar of signal and a clipboard of paper forms.",
    signature: "r2",
  },
  "healthcare": {
    label: "Clinic & wellness",
    headline: "Fewer phone tags, same careful privacy.",
    scene:
      "A Midtown practice whose front desk spends every morning returning calls about hours and openings.",
    signature: "durable-objects",
    caution:
      "Health information needs a HIPAA compliance review before it touches any new system. Start with wins that collect no medical details: hours, directions, open-slot lookups.",
  },
  "nonprofit": {
    label: "Nonprofit & community",
    headline: "Volunteer sign-ups without the spreadsheet chaos.",
    scene:
      "A volunteer-run pantry coordinating Saturday shifts across the metro from one shared spreadsheet.",
    signature: "d1",
  },
  "real-estate": {
    label: "Real estate & property",
    headline: "Listings that load instantly, showings that never double-book.",
    scene:
      "A leasing office juggling showings across Edmond, Moore and Yukon from one phone line.",
    signature: "durable-objects",
  },
  "agriculture": {
    label: "Agriculture & ranch supply",
    headline: "Answer “is it in stock?” before they call.",
    scene:
      "A feed store near Stockyards City fielding the same stock question all day long.",
    signature: "cron-triggers",
  },
  "aerospace": {
    label: "Aerospace & manufacturing",
    headline: "Quote requests that route themselves.",
    scene:
      "A machine shop supplying the metro's aerospace cluster, quoting jobs from emailed drawings.",
    signature: "queues",
    caution:
      "Export-controlled or CUI technical data (ITAR, CMMC) needs its own compliance path. Use the edge for public pieces like quote intake that excludes controlled drawings.",
  },
  "creative": {
    label: "Creative studio & film",
    headline: "Share big files fast, without surprise bandwidth bills.",
    scene:
      "A Film Row studio sending gigabytes of dailies to clients in three time zones.",
    signature: "r2",
  },
};
