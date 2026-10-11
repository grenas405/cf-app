/**
 * The blueprint builder: chips in, `POST /api/blueprint`, a plan out.
 * The browser only collects choices; every rule about them is enforced by
 * the zod schema at the edge.
 *
 * @module
 */

import type { Blueprint } from "../../core/features/blueprint/blueprint.ts";
import type { BlueprintInput } from "../../core/features/blueprint/schema.ts";
import { bodyOf, postJson, problemOf } from "../api.ts";
import { all, byId, type Child, h, reveal, withCode } from "../dom.ts";
import { flashButtonState, setButtonState } from "../effects/press.ts";
import { EASE, play } from "../motion.ts";
import {
  entries,
  GOAL_LABELS,
  INDUSTRY_LABELS,
  MAX_GOALS,
  TEAM_LABELS,
} from "./labels.ts";

function chip(
  type: "radio" | "checkbox",
  name: string,
  value: string,
  label: string,
  checked: boolean,
): HTMLElement {
  return h("label", { class: "chip" }, [
    h("input", { type, name, value, checked }),
    h("span", {}, [label]),
  ]);
}

/** Read the form's current choices. */
export function readChoices(form: HTMLFormElement): BlueprintInput {
  const data = new FormData(form);
  return {
    industry: String(data.get("industry")) as BlueprintInput["industry"],
    goals: data.getAll("goals").map(String) as BlueprintInput["goals"],
    teamSize: String(data.get("teamSize")) as BlueprintInput["teamSize"],
  };
}

function limitGoals(form: HTMLFormElement): void {
  const boxes = all<HTMLInputElement>('input[name="goals"]', form);
  const full = boxes.filter((box) => box.checked).length >= MAX_GOALS;
  boxes.forEach((box) => box.disabled = full && !box.checked);
}

function panel(title: string, body: Child[]): HTMLElement {
  return h("div", { class: "panel" }, [
    h("div", { class: "panel__head" }, [
      h("h3", { class: "panel__title" }, [title]),
    ]),
    ...body,
  ]);
}

/** Build the result view from a blueprint. */
export function renderBlueprint(plan: Blueprint): HTMLElement[] {
  const promptId = "blueprint-prompt";
  return [
    h("div", { class: "bp-hero" }, [
      h("p", { class: "bp-hero__kicker" }, [
        `${plan.industry} · ${plan.goals.join(" · ")}`,
      ]),
      h("h3", { class: "bp-hero__title" }, [plan.headline]),
      h("p", { class: "bp-hero__scene" }, [plan.scene]),
      plan.caution === undefined
        ? null
        : h("p", { class: "bp-caution" }, [plan.caution]),
    ]),
    h("div", { class: "bp-grid" }, [
      panel("Cloudflare building blocks", [
        h(
          "ul",
          { class: "bp-list" },
          plan.products.map((p) =>
            h("li", { class: "bp-item" }, [
              h("b", {}, [p.name]),
              h("span", {}, [p.what]),
            ])
          ),
        ),
      ]),
      panel("JSR packages", [
        h(
          "ul",
          { class: "bp-list" },
          plan.packages.map((p) =>
            h("li", { class: "bp-item" }, [
              h("b", {}, [h("code", {}, [p.name])]),
              h("span", {}, [p.why]),
            ])
          ),
        ),
      ]),
      panel("Your first week", [
        h(
          "ol",
          { class: "bp-steps" },
          plan.steps.map((step) => h("li", {}, withCode(step))),
        ),
        h("p", { class: "fineprint" }, withCode(plan.plan)),
      ]),
    ]),
    h("div", { class: "panel bp-prompt" }, [
      h("div", { class: "panel__head" }, [
        h("h3", { class: "panel__title" }, ["Paste this into Claude Code"]),
        h("span", { class: "badge badge--muted" }, ["prompt"]),
      ]),
      h("pre", { class: "codebox", id: promptId }, [
        h("code", {}, [plan.prompt]),
      ]),
      h("div", { class: "bp-prompt__actions" }, [
        h("button", {
          class: "btn btn--ghost btn--sm",
          type: "button",
          "data-copy-from": promptId,
        }, [
          h("span", { class: "btn__label" }, ["Copy prompt"]),
        ]),
      ]),
    ]),
  ];
}

/** Wire the builder. */
export function installBlueprint(): void {
  const form = byId<HTMLFormElement>("blueprint-form");
  const industries = byId("industry-chips");
  const goals = byId("goal-chips");
  const teams = byId("team-chips");
  const submit = byId<HTMLButtonElement>("blueprint-submit");
  const status = byId("blueprint-status");
  const result = byId("blueprint-result");
  if (
    !form || !industries || !goals || !teams || !submit || !status || !result
  ) return;

  industries.replaceChildren(
    ...entries(INDUSTRY_LABELS).map(([id, label]) =>
      chip("radio", "industry", id, label, id === "restaurant")
    ),
  );
  goals.replaceChildren(
    ...entries(GOAL_LABELS).map(([id, label]) =>
      chip(
        "checkbox",
        "goals",
        id,
        label,
        id === "online-orders" || id === "storm-ready",
      )
    ),
  );
  teams.replaceChildren(
    ...entries(TEAM_LABELS).map(([id, label]) =>
      chip("radio", "teamSize", id, label, id === "small")
    ),
  );
  form.addEventListener("change", () => limitGoals(form));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setButtonState(submit, "loading");
    const response = await postJson<Blueprint>(
      "/api/blueprint",
      readChoices(form),
    );
    const plan = bodyOf(response);
    if (plan === null) {
      const problem = problemOf(response);
      status.textContent = problem?.errors?.map((e) => e.message).join(" ") ??
        problem?.detail ?? "The edge could not be reached.";
      flashButtonState(submit, "error");
      return;
    }
    status.textContent = `HTTP ${response.status} in ${
      Math.round(response.ms)
    } ms. Validated at the edge.`;
    result.replaceChildren(...renderBlueprint(plan));
    flashButtonState(submit, "success");
    reveal(result);
    [...result.children].forEach((child, i) =>
      void play(child, [
        { opacity: 0, transform: "translateY(40px) scale(0.98)" },
        { opacity: 1, transform: "none" },
      ], {
        duration: 800,
        delay: 120 + i * 120,
        easing: EASE.out,
        fill: "backwards",
      })
    );
  });
}
