/**
 * RR-388 B (owner, 7 Nov 08:39: "ALL collectors together stay inside $2/day") · the one daily total of every collector: the AI collectors
 * (cf_day), DataForSEO (top pages + the ten), research, creators (its KV counter). The 7 Nov census found the slices could add to ~$5 a day.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { collectorsSpentToday, collectorsCapOf } from "../site/collectors-day.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { runResearch } from "../site/research-collector.mjs";

const TODAY = "2026-11-07";
test("the one total: every collector's money of today, each part read where it is kept; a part that cannot be read counts 0 and is said", async () => {
  const seo = seoMemoryStore(); await seo.addSpend(TODAY, "top-pages", { usd: 0.3, units: 1 }); await seo.addSpend(TODAY, "dfs-g1", { usd: 0.2, units: 1 }); await seo.addSpend(TODAY, "research", { usd: 0.4, units: 1 }); await seo.addSpend("2026-11-06", "research", { usd: 9, units: 1 });
  const kv = { run: async (cmds) => cmds.map((c) => (c[0] === "GET" && c[1] === `av:crusd:${TODAY}` ? String(250000) : null)) }, cf = { spend: async () => ({ aiUsd: 0.6 }) };
  assert.deepEqual(await collectorsSpentToday({ seo, cf, kv, today: TODAY }), { cfAi: 0.6, dataforseo: 0.5, research: 0.4, creators: 0.25, total: 1.75, unread: [] });
  const bad = await collectorsSpentToday({ seo, cf: { spend: async () => { throw new Error("x"); } }, kv: { run: async () => { throw new Error("y"); } }, today: TODAY }); assert.deepEqual(bad.unread, ["cf", "creators"]);
  assert.equal(collectorsCapOf({}), 2);
});
test("research stops when all collectors together reached the day's $2, even with its own $1 untouched (and spends nothing)", async () => {
  const seo = seoMemoryStore(), calls = []; await seo.addSpend(TODAY, "dfs-a2", { usd: 1.99, units: 1 });
  const r = await runResearch({ seo, env: { ANTHROPIC_API_KEY: "test-key-stand-in-never-sent-0000" }, fetchImpl: async (u) => { calls.push(u); throw new Error("never sent"); }, now: () => Date.parse(`${TODAY}T08:00:00Z`) });
  assert.equal(calls.length, 0); assert.equal(r.stoppedBy, "CAP"); assert.match(r.why, /all collectors together \(\$2\)/);
});
