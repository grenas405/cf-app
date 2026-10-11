import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  composeBlueprint,
  uniqueBy,
} from "../../src/core/features/blueprint/blueprint.ts";
import { GOAL_PLAYS } from "../../src/core/features/blueprint/goals.ts";
import { INDUSTRY_PROFILES } from "../../src/core/features/blueprint/industries.ts";
import { PRODUCTS } from "../../src/core/features/blueprint/products.ts";
import {
  BlueprintInput,
  GOALS,
  INDUSTRIES,
  isUnique,
} from "../../src/core/features/blueprint/schema.ts";

Deno.test("uniqueBy() keeps first occurrences in order", () => {
  assertEquals(uniqueBy(["a", "b", "a", "c", "b"], (x) => x), ["a", "b", "c"]);
  assert(isUnique(["a", "b"]));
  assertEquals(isUnique(["a", "a"]), false);
});

Deno.test("every enum value has content behind it", () => {
  for (const industry of INDUSTRIES) {
    assert(INDUSTRY_PROFILES[industry].headline);
  }
  for (const goal of GOALS) {
    for (const product of GOAL_PLAYS[goal].products) assert(PRODUCTS[product]);
  }
});

Deno.test("a blueprint merges goals without duplicates", () => {
  const plan = composeBlueprint({
    industry: "restaurant",
    goals: ["online-orders", "lead-capture"],
    teamSize: "small",
  });
  const names = plan.products.map((p) => p.name);
  assertEquals(names.length, new Set(names).size);
  assertEquals(names.slice(0, 2), ["Workers", "Static Assets"]);
  assert(names.includes("Turnstile"));
  const packages = plan.packages.map((p) => p.name);
  assertEquals(packages.length, new Set(packages).size);
  assertEquals(plan.steps.length, 4);
});

Deno.test("the Claude Code prompt carries the rules and the asks", () => {
  const plan = composeBlueprint({
    industry: "agriculture",
    goals: ["inventory-sync"],
    teamSize: "solo",
  });
  assertStringIncludes(plan.prompt, "Read CLAUDE.md first");
  assertStringIncludes(
    plan.prompt,
    "one-person agriculture & ranch supply team",
  );
  assertStringIncludes(plan.prompt, GOAL_PLAYS["inventory-sync"].ask);
  assertStringIncludes(
    plan.prompt,
    "Reach Cron Triggers, Workers KV only through ports",
  );
  assertEquals(plan.prompt.includes("Reach Workers"), false);
});

Deno.test("regulated industries get a compliance caution", () => {
  assert(
    composeBlueprint({
      industry: "healthcare",
      goals: ["bookings"],
      teamSize: "small",
    }).caution,
  );
  assertEquals(
    composeBlueprint({
      industry: "retail",
      goals: ["bookings"],
      teamSize: "small",
    }).caution,
    undefined,
  );
});

Deno.test("the schema rejects unknown, duplicate and excess choices", () => {
  const ok = { industry: "retail", goals: ["bookings"], teamSize: "small" };
  assert(BlueprintInput.safeParse(ok).success);
  assertEquals(
    BlueprintInput.safeParse({ ...ok, industry: "casino" }).success,
    false,
  );
  assertEquals(
    BlueprintInput.safeParse({ ...ok, goals: ["bookings", "bookings"] })
      .success,
    false,
  );
  assertEquals(BlueprintInput.safeParse({ ...ok, goals: [] }).success, false);
  assertEquals(
    BlueprintInput.safeParse({ ...ok, goals: GOALS.slice(0, 5) }).success,
    false,
  );
  assertEquals(BlueprintInput.safeParse({ ...ok, extra: 1 }).success, false);
});
