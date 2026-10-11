/**
 * The browser entry point. It only wires modules together, in reading order;
 * every behavior lives in a small module of its own.
 *
 * @module
 */

import type { Discovery } from "../core/features/discovery.ts";
import { installAnatomy } from "./anatomy/install.ts";
import { loadCatalog } from "./anatomy/catalog.ts";
import { bodyOf, getJson } from "./api.ts";
import { installBlueprint } from "./blueprint/view.ts";
import { installTerminal } from "./claude/terminal.ts";
import { installCopy } from "./copy.ts";
import { installBreaker } from "./cost/breaker.ts";
import { installCost } from "./cost/view.ts";
import { byId } from "./dom.ts";
import { installLab } from "./edge/lab.ts";
import { installProbe, probeOnce } from "./edge/probe.ts";
import { installMagnetic } from "./effects/magnetic.ts";
import { installPressEffects } from "./effects/press.ts";
import {
  installReveal,
  installScrollChrome,
  installSectionTracking,
} from "./effects/scroll.ts";
import { startHeroMap } from "./hero/canvas.ts";
import { startClock } from "./nav/clock.ts";
import { installMenu } from "./nav/menu.ts";
import { installAudit } from "./principles/audit.ts";
import { installPrinciples } from "./principles/view.ts";
import { installCards } from "./stack/cards.ts";

document.documentElement.classList.remove("no-js");

// Shared, page-wide behavior.
installPressEffects(document);
installMagnetic(document);
installCopy(document);
installReveal(document);

const bar = byId("progress-bar");
const topbar = byId("topbar");
if (bar !== null && topbar !== null) installScrollChrome(bar, topbar);

// Navigation.
const toggle = byId<HTMLButtonElement>("menu-toggle");
const menuRoot = byId("menu");
const menu = toggle !== null && menuRoot !== null
  ? installMenu(toggle, menuRoot)
  : null;
const sectionLabel = byId("topbar-section");
installSectionTracking(document, (id, label) => {
  if (sectionLabel !== null) sectionLabel.textContent = label;
  menu?.setCurrent(id);
});
const clock = byId("menu-clock");
if (clock !== null) startClock(clock);

// Data the page shares: what the API says about itself, and about the code.
const discovery = getJson<Discovery>("/api").then(bodyOf);
const catalog = loadCatalog();

// Sections, top to bottom.
const canvas = byId<HTMLCanvasElement>("hero-canvas");
const hero = canvas !== null ? startHeroMap(canvas) : { probe: () => {} };
installProbe(hero);
void probeOnce();
installCards(catalog);
installLab();
installBlueprint();
installCost(discovery);
installBreaker();
void catalog.then((data) => {
  if (data === null) return;
  installAnatomy(data);
  const claudeMd = data.documents.find((doc) => doc.path === "CLAUDE.md");
  byId("claude-md")?.replaceChildren(claudeMd?.source ?? "");
});
installPrinciples();
installAudit();
installTerminal();
