/**
 * 🔴 item 34c (recipe R15: what the others cover, never their words): the public sitemaps of the sites that rank beside us → a list of topics they have a page on and we do not.
 * Suggestions for the plan, nothing more: only the words of an address are read, no page is opened, nothing is copied.
 */
import { meaningOf } from "./coverage.mjs";
export const KEEP_DAYS = 30;
const NEVER = /(?:^|\.)(?:youtube|facebook|instagram|linkedin|tiktok|twitter|x|pinterest|wikipedia|reddit|quora|google|bing|amazon|medium)\.[a-z.]+$|\.gov(?:\.[a-z]+)?$|\.edu(?:\.[a-z]+)?$/i;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };
/** the sites that rank most often beside us; never a social site, a government body, the official owner, or us */
export function competitorsFrom(urls = [], { exclude = [], max = 5 } = {}) {
  const out = new Set(exclude.map(hostOf).filter(Boolean)), n = new Map();
  for (const u of urls) { const h = hostOf(u); if (h && !out.has(h) && !NEVER.test(h)) n.set(h, (n.get(h) ?? 0) + 1); }
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([h]) => h);
}
const locs = (xml) => [...String(xml ?? "").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
/** a site's public page list: its robots file names the sitemaps; an index is followed a little way */
export async function sitemapUrlsOf(host, read, { maxFiles = 4, maxUrls = 3000 } = {}) {
  const robots = await read(`https://${host}/robots.txt`, "text/plain").catch(() => null), named = [...String(robots ?? "").matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  const queue = named.length ? named : [`https://${host}/sitemap.xml`], urls = []; let files = 0;
  while (queue.length && files < maxFiles && urls.length < maxUrls) { const u = queue.shift(); if (/\.gz$/i.test(u)) continue; files++; const xml = await read(u, "text/xml,application/xml").catch(() => null); if (!xml) continue; if (/<sitemapindex/i.test(xml)) queue.push(...locs(xml)); else urls.push(...locs(xml)); }
  return urls.slice(0, maxUrls);
}
const wordsOfUrl = (u) => { try { return decodeURIComponent(new URL(u).pathname).replace(/\/+$/, "").split("/").pop().replace(/\.[a-z]{2,5}$/i, "").split(/[-_]+/).filter((w) => w && !/^\d+$/.test(w)).join(" "); } catch { return ""; } };
/** sites = [{ host, urls }] → [{ topic, sites, example }], most sites first: only addresses about the subject, and only what none of our pages covers */
export function pagesTheyHave({ sites = [], subject, ours = [], max = 40 }) {
  const word = String(subject ?? "").toLowerCase(), mine = ours.map((t) => meaningOf(t, { drop: [subject] })).filter((m) => m.length), rows = new Map();
  for (const { host, urls } of sites) for (const u of urls ?? []) {
    const topic = wordsOfUrl(u); if (!word || !new RegExp(`(?:^| )${word}(?: |$)`, "i").test(topic)) continue;
    const need = meaningOf(topic, { drop: [subject] }); if (!need.length || need.length > 8) continue;
    if (mine.some((m) => need.filter((w) => m.includes(w)).length / need.length >= 0.6)) continue;
    const key = need.join(" "), row = rows.get(key) ?? { topic: topic.toLowerCase(), sites: [], example: u }; if (!row.sites.includes(host)) row.sites.push(host); rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.sites.length - a.sites.length || a.topic.localeCompare(b.topic)).slice(0, max);
}
