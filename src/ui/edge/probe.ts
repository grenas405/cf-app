/**
 * Live requests to `GET /api/edge`: one from the hero button, a burst of five
 * from Mission Control. Times are measured in the browser, so they include
 * the full network round trip.
 *
 * @module
 */

import type { EdgeReport } from "../../core/features/edge.ts";
import { bodyOf, getJson } from "../api.ts";
import { byId, h } from "../dom.ts";
import { flashButtonState, setButtonState } from "../effects/press.ts";
import { median, ms } from "../format.ts";
import type { HeroMap } from "../hero/canvas.ts";
import { EASE, play, wait } from "../motion.ts";
import { paintEdgeFields } from "./report.ts";

/** One timed request. */
export async function probeOnce(): Promise<
  { report: EdgeReport | null; ms: number }
> {
  const result = await getJson<EdgeReport>("/api/edge");
  const report = bodyOf(result);
  if (report !== null) paintEdgeFields(report);
  return { report, ms: result.ms };
}

function showRtt(value: number): void {
  const slot = byId("hud-rtt");
  if (slot === null) return;
  slot.textContent = ms(value);
  slot.classList.remove("is-fresh");
  void slot.offsetWidth;
  slot.classList.add("is-fresh");
}

function travel(
  packet: HTMLElement,
  outbound: boolean,
  duration: number,
): Promise<void> {
  return play(packet, [
    { left: outbound ? "0%" : "100%", opacity: 1 },
    { left: outbound ? "100%" : "0%", opacity: 1 },
  ], { duration, easing: EASE.inOut });
}

function addBar(
  list: HTMLElement,
  index: number,
  value: number,
  scaleMax: number,
): void {
  const fill = h("span", { class: "probe__bar-fill" });
  list.append(h("li", { class: "probe__bar" }, [
    h("span", {}, [`#${index}`]),
    h("span", {}, [fill]),
    h("span", { class: "probe__bar-value" }, [ms(value)]),
  ]));
  const width = Math.max(0.04, Math.min(1, value / scaleMax));
  void play(fill, [{ transform: "scaleX(0)" }, {
    transform: `scaleX(${width})`,
  }], {
    duration: 700,
    easing: EASE.out,
    fill: "forwards",
  });
}

/** Wire the hero button and the Mission Control panel. */
export function installProbe(hero: HeroMap): void {
  const heroButton = byId<HTMLButtonElement>("hero-probe");
  heroButton?.addEventListener("click", async () => {
    setButtonState(heroButton, "loading");
    const { report, ms: rtt } = await probeOnce();
    showRtt(rtt);
    hero.probe(rtt);
    flashButtonState(heroButton, report === null ? "error" : "success");
  });

  const run = byId<HTMLButtonElement>("probe-run");
  const bars = byId("probe-bars");
  const badge = byId("probe-badge");
  const packet = byId("probe-packet");
  if (run === null || bars === null || badge === null || packet === null) {
    return;
  }

  run.addEventListener("click", async () => {
    setButtonState(run, "loading");
    bars.replaceChildren();
    const times: number[] = [];
    for (let i = 1; i <= 5; i++) {
      badge.textContent = `request ${i}/5`;
      const outbound = travel(packet, true, 380);
      const { report, ms: rtt } = await probeOnce();
      await outbound;
      await travel(packet, false, 380);
      if (report === null) {
        badge.textContent = "offline";
        flashButtonState(run, "error");
        return;
      }
      times.push(rtt);
      addBar(bars, i, rtt, Math.max(120, ...times) * 1.1);
      showRtt(rtt);
      await wait(120);
    }
    badge.textContent = `median ${ms(median(times))}`;
    hero.probe(median(times));
    flashButtonState(run, "success");
  });
}
