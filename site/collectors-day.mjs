/**
 * 🔴 RR-388 B (owner, 7 Nov 08:39: "ALL collectors together (free + DataForSEO + any AI) stay inside $2/day") · THE ONE DAILY TOTAL OF EVERY
 * COLLECTOR on the AlmiSEO Data server. Each collector keeps its own slice (country facts and answers $2 of AI, research $1, creators $1, top
 * pages $1, the ten DataForSEO collectors $0.35 each); on top of its slice, NONE may pass this one total. The coverage census of 7 Nov found
 * the slices could add up to about $5 a day.
 *   cfAi: country facts + answers (cf_day) · dataforseo: top pages + the ten (seo_spend top-pages, dfs-*) · research (seo_spend research) ·
 *   creators (its own day counter in the KV store)
 */
export const collectorsCapOf = (env = process.env) => (Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) > 0 ? Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) : 2);
const r4 = (x) => Math.round(x * 1e4) / 1e4;
/** today's money of every collector → { cfAi, dataforseo, research, creators, total } (a part that cannot be read counts 0 and is said) */
export async function collectorsSpentToday({ seo = null, cf = null, kv = null, today }) {
  const unread = [];
  let cfAi = 0; if (typeof cf?.spend === "function") { try { cfAi = Number((await cf.spend(today))?.aiUsd ?? 0) || 0; } catch { unread.push("cf"); } }
  let rows = []; if (typeof seo?.spendSince === "function") { try { rows = ((await seo.spendSince(today)) ?? []).filter((r) => r.day === today); } catch { unread.push("seo"); } }
  const sum = (f) => r4(rows.filter(f).reduce((t, r) => t + (Number(r.usd) || 0), 0));
  const dataforseo = sum((r) => r.job === "top-pages" || String(r.job).startsWith("dfs-")), research = sum((r) => r.job === "research");
  let creators = 0; if (kv) { try { const [u] = await kv.run([["GET", `av:crusd:${today}`]]); /* creators.mjs CREATORS.usdKey */ creators = Number(u ?? 0) / 1e6; } catch { unread.push("creators"); } }
  return { cfAi: r4(cfAi), dataforseo, research, creators: r4(creators), total: r4(cfAi + dataforseo + research + creators), unread };
}
