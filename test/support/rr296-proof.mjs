/**
 * RR-296 · the proof run, in memory: the test project's planned needs through the ONE builder's new-page path, beside the 12 stored guides
 * as the pages that already stand; then four days of articles. Nothing is written, fetched or published. Shared by the test and the
 * evidence print.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { guideItemsByValue, buildGuides, planNewPages, buildNewPages, withSections, gateInput, servedBy } from "../../src/page/one-builder.mjs";
import { allGates, costGate, AI_SEARCH_BOTS } from "../../src/page/page-gates.mjs";
import { articleDays, articleSettings, settingsView, PUBLISH_MODE } from "../../src/page/articles.mjs";
import { GUIDANCE } from "../../config/guidance/guidance-read.mjs";
import { rootIndexFor } from "../../src/tenancy/resolver.mjs";
import { lookupStore } from "../../src/tenancy/root-registry.mjs";
import * as P from "../fixtures/rr296-test-project.mjs";

export const BATCH = "rr254-test-pages-2026-10-12";
export const DIR = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
export const HERE = existsSync(join(DIR, "joined-pages.jsonl"));
export const ROBOTS = `User-agent: *\nAllow: /\n\n${AI_SEARCH_BOTS.map((b) => `User-agent: ${b}`).join("\n")}\nAllow: /\n`;
export const COST = costGate({ entry: { recorded_at: "a", money: { amountState: "ZERO_BY_TARIFF", amount: 0 }, requests: 0 }, startedAt: "b", budget: { money: 0, requests: 0 } });
const ON = "2026-10-20";

/** The 12 guides as the pages that already stand: their records, their rebuilt pages, and what the plan and the gates read of them. */
export function standingGuides() {
  const rows = readFileSync(join(DIR, "joined-pages.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const json = (f) => JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const guides = guideItemsByValue(rows);
  const quotation = new Map(json("page-drafts.json").pages.flatMap((p) => p.needs.flatMap((n) => n.answer.claims.map((c) => [c.claimId, c.quotation ?? null]))));
  const links = json("internal-links-2026-10-18.json");
  const common = { keyFacts: json("key-facts.json"), rates: json("conversion-rates.json"), quotationOf: (id) => quotation.get(id) ?? null, stamp: null, on: ON, relatedFor: (value) => (Array.isArray(links?.pages?.[value]) ? links.pages[value] : []) };
  return { guides, common };
}

export function newPageRun({ design = P.DESIGN } = {}) {
  const { guides, common } = standingGuides();
  const built = buildGuides({ guides, ...common, design: null });
  const existing = built.filter((g) => !g.refused).map((g) => ({ id: g.url, url: g.url, claimIds: g.answer, questions: g.questions }));
  /* one need whose answer is already on an existing guide: the doctors' guide's first answer, asked in other words */
  const doctors = guides.get("medicine");
  const first = doctors.itemList[0];
  const plan = planNewPages({ needs: P.NEEDS({ question: "What does the doctors' exam cost to sit?", claim: first.claims[0] }), existing });
  const pages = buildNewPages({ plan, keyFacts: P.KEY_FACTS, quotationOf: P.quotationOf, design, stamp: null, on: ON, site: P.SITE });
  /* the section: the doctors' guide rebuilt by the same builder with the merged need's question asked on it */
  const sections = plan.filter((p) => p.kind === "SECTION");
  const [rebuilt] = buildGuides({ guides: new Map([["medicine", withSections(doctors, sections)]]), ...common, design: null });
  const gated = [...built.filter((g) => !g.refused && g.url !== rebuilt.url), rebuilt, ...pages].map(gateInput);
  const results = allGates(gated, { guidance: GUIDANCE, on: ON, cost: COST, site: { robotsTxt: ROBOTS, sitemapUrls: gated.map((g) => g.url), serve: servedBy(gated) } });
  const serve = servedBy([...pages, rebuilt]);
  return { plan, pages, sections, rebuilt, results, existing, gated, serve, guides, common };
}

export const DAYS = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"];
export function articleRun({ settings = {}, newPages = newPageRun() } = {}) {
  const stood = [...newPages.existing.map((e) => ({ ...e, gate: newPages.gated.find((g) => g.url === e.url) })), ...newPages.pages.map((p) => ({ url: p.url, claimIds: p.answer, questions: p.questions, gate: gateInput(p) }))];
  return articleDays({ days: DAYS, settings, topics: P.TOPICS, existing: stood, design: P.DESIGN, keyFacts: P.KEY_FACTS, quotationOf: P.quotationOf, site: P.SITE, guidance: GUIDANCE, robotsTxt: ROBOTS, cost: COST });
}
export { articleSettings, settingsView, PUBLISH_MODE, P };
