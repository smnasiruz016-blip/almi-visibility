/**
 * 🔴 RR-328 B · THE COUNTRY FACTS COLLECTOR (Vercel Cron → /cron/country-facts, and the owner's button on /owner/countries). It fills the
 * owner's five parts (desktop/country-facts.mjs) for all 197 countries — the countries people come from most first (CF_PRIORITY), then the
 * rest — into the live database (cf-store.mjs):
 *   · FEE (all countries, daily): the subject's fee from its own page (fee.mjs feeOf) in each country's currency (rates.mjs);
 *   · CENTRES (all countries, weekly): the venues the subject's own pages name (venues.mjs), and — where none — taking it at home (its own
 *     page's words) with the nearest venues (the UN's sub-regions);
 *   · QUESTIONS (per country, weekly): the question-type searches FROM that country in the keyword database (kw-store.mjs), grouped by
 *     need (country-facts.mjs questionGroups; a brand's name is no question); each group gets a short answer — the fee from its fact, the rest written by the AI from the country's
 *     confirmed facts and labelled "AI-written"; an answer stating a number that is in none of the facts is stored "unconfirmed";
 *   · COUNCILS (per country × the 12 professions, monthly) and RULES (per country, monthly): AlmiOET's official records first, then the AI's
 *     candidates (cf-ai.mjs) — EACH one confirmed by reading its source page here (robots obeyed, public addresses only, paced: the official
 *     reader of desktop/official.mjs): the page must be the body's own website or its government's, and must show the name (and the
 *     address, or the quoted rule). Not found there → stored "unconfirmed", never shown on a page.
 *   · finished work is not done again until it is due; one run at a time (a lock); a run stops at its time, at today's page reads, or at
 *     today's AI dollars (COUNTRY_FACTS_AI_USD_PER_DAY, COUNTRY_FACTS_READS_PER_DAY in Vercel — the defaults below); history is kept.
 */
import { randomBytes } from "node:crypto";
import { COUNTRIES, neighboursOf } from "../desktop/world.mjs";
import { CF_PRIORITY, CF_PROFESSIONS, questionGroups, nameOnPage, addressOnPage, quoteOnPage, numbersOf, hostOf, governmentHost, SHOWN_STATUS } from "../desktop/country-facts.mjs";
import { feeOf } from "../desktop/fee.mjs";
import { readRates, feeInCurrency, CURRENCY_OF, localShown as localFee } from "../desktop/rates.mjs";
import { venueCountries } from "../desktop/venues.mjs";
import { BRANDS } from "./kw-finder.mjs";
import ORIGIN from "../desktop/lists/almiworld-oet-origin-facts.json" with { type: "json" };
import { LOCATIONS } from "./kw-seeds.mjs";
import { askAi, aiConfigured, councilQuestion, ruleQuestion, answerQuestion } from "./cf-ai.mjs";

export const CF_SUBJECT = Object.freeze({ name: "OET", site: "https://oet.com" });
export const CF_COLLECTOR = Object.freeze({ runBudgetMs: 240000, lockSeconds: 290, aiUsdPerDay: 2, readsPerDay: 200, aiReserveUsd: 0.6, maxGroups: 8, refreshDays: Object.freeze({ fee: 1, centres: 7, questions: 7, councils: 30, rules: 30 }) });
export const CF_ORDER = Object.freeze([...CF_PRIORITY, ...COUNTRIES.filter((c) => !CF_PRIORITY.includes(c))]);
const ALL = "*";
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PROF_OF = Object.fromEntries(CF_PROFESSIONS.flatMap((p) => [[p, p], [`${p}s`, p]]).concat([["doctors", "medicine"], ["nurses", "nursing"], ["dentists", "dentistry"], ["pharmacists", "pharmacy"], ["physiotherapists", "physiotherapy"], ["occupational therapists", "occupational therapy"], ["radiographers", "radiography"], ["dietitians", "dietetics"], ["optometrists", "optometry"], ["podiatrists", "podiatry"], ["speech pathologists", "speech pathology"], ["vets", "veterinary science"], ["veterinarians", "veterinary science"]]));
export const professionKey = (s) => PROF_OF[String(s ?? "").toLowerCase().trim()] ?? null;
export const capsOf = (env = process.env) => ({ aiUsd: Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) > 0 ? Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) : CF_COLLECTOR.aiUsdPerDay, reads: Number(env.COUNTRY_FACTS_READS_PER_DAY) > 0 ? Math.floor(Number(env.COUNTRY_FACTS_READS_PER_DAY)) : CF_COLLECTOR.readsPerDay });

/** one run. → { ok, day, saved, unconfirmed, kept, done: ["Pakistan · councils", …], stoppedBy, why, aiUsd, reads, searches } */
export async function runCountryFacts({ store, kwStore = null, kv = null, env = process.env, reader, ai = askAi, now = () => Date.now(), budgetMs = CF_COLLECTOR.runBudgetMs, countries = null, subject = CF_SUBJECT }) {
  const start = now(), today = dayOf(start), at = () => new Date(now()).toISOString(), id = randomBytes(8).toString("hex");
  if (kv) { const [locked] = await kv.run([["SET", "av:cf:lock", id, "NX", "EX", CF_COLLECTOR.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another country-facts run is working — this one did nothing." }; }
  const caps = capsOf(env), spent = await store.spend(today), r0 = reader.requests(), tasks = await store.tasks();
  const out = { ok: true, day: today, saved: 0, unconfirmed: 0, kept: 0, done: [], stoppedBy: null, why: null, aiUsd: 0, reads: 0, searches: 0 };
  const due = (c, t) => { const x = tasks.get(`${c}|${t}`); return !x || x.state !== "done" || daysBetween(x.day, today) >= CF_COLLECTOR.refreshDays[t]; };
  const stop = (code, why) => { out.stoppedBy = code; out.why = why; return false; };
  const room = (needAi = false) => {
    if (now() - start > budgetMs) return stop("TIME", "This run's time is used — the next run continues.");
    if (spent.reads + reader.requests() - r0 >= caps.reads) return stop("READS", `Today's ${caps.reads} page reads are used — the next day continues.`);
    if (needAi && spent.aiUsd + out.aiUsd + CF_COLLECTOR.aiReserveUsd > caps.aiUsd) return stop("AI_BUDGET", `Today's AI budget ($${caps.aiUsd.toFixed(2)}) is used — the next day continues.`);
    return true;
  };
  const put = async (f) => { const r = await store.putFact({ proposedBy: "official", aiWritten: false, ...f }, { at: at() }); if (r.saved) { out.saved++; if (f.status === "unconfirmed") out.unconfirmed++; } else if (/owner/.test(r.why ?? "")) out.kept++; return r; };
  const finish = async (c, t, state = "done", note = null) => { await store.setTask(c, t, { day: today, state, note }); tasks.set(`${c}|${t}`, { day: today, state }); if (state === "done") out.done.push(`${c === ALL ? "all countries" : c} · ${t}`); };
  const askOne = async (q) => { const r = await ai({ env, ...q }); out.aiUsd += r.usd ?? 0; out.searches += r.searches ?? 0; return r; };
  const list = countries ?? CF_ORDER;
  try {
    let sitemap = null; const urls = async () => (sitemap ??= await reader.sitemapOf(subject.site)).urls ?? [];
    /* ── 1 · the fee in every country's money (daily) ── */
    if (due(ALL, "fee") && room()) {
      const fee = await feeOf({ urls: await urls(), subject: subject.name, subjectName: subject.name, reader });
      if (!fee.ok) await finish(ALL, "fee", "retry", fee.why);
      else {
        const rates = await readRates({ reader, countries: COUNTRIES, on: at() });
        for (const c of COUNTRIES) {
          const f = feeInCurrency(fee, c, rates), last = f.steps?.at(-1) ?? null;
          await put({ key: `fee|${c}`, country: c, part: "fee", kind: "fee", value: { official: `${fee.currency} ${fee.amount}`, line: f.line, local: localFee(f.line), currency: f.currency ?? CURRENCY_OF[c] ?? null, amount: f.amount ?? null, rate: last ? { source: last.source, link: last.link, date: last.rateDate, said: last.said, open: Boolean(last.open) } : null }, sourceUrl: fee.source.url, sourceTitle: fee.source.title, readOn: fee.checkedOn, status: "confirmed" });
        }
        await finish(ALL, "fee");
      }
    }
    /* ── 2 · the test centres, and at home with the nearest venues (weekly) ── */
    if (due(ALL, "centres") && room()) {
      const v = await venueCountries({ urls: await urls(), subject: subject.name, reader });
      const venues = new Map(v.countries.map((x) => [x.name, x]));
      if (!venues.size && !v.home) await finish(ALL, "centres", "retry", "no venue page could be read");
      else {
        for (const c of COUNTRIES) {
          const x = venues.get(c);
          if (x) await put({ key: `centres|${c}`, country: c, part: "centres", kind: "venue", value: { venue: true, home: null, nearest: [] }, sourceUrl: x.source.url, sourceTitle: x.source.title, readOn: x.checkedOn, status: "confirmed" });
          else if (v.home) await put({ key: `centres|${c}`, country: c, part: "centres", kind: "home", value: { venue: false, home: v.home.says, nearest: neighboursOf(c).filter((n) => venues.has(n)).slice(0, 4) }, sourceUrl: v.home.url, sourceTitle: v.home.title, readOn: v.home.checkedOn, status: "confirmed" });
        }
        await finish(ALL, "centres");
      }
    }
    /* ── 3 · per country: its questions, its councils, its rules ── */
    for (const c of list) {
      if (out.stoppedBy) break;
      const facts = async () => (await store.facts({ country: c })).filter((f) => SHOWN_STATUS.includes(f.status));
      if (due(c, "questions") && room()) await questionsOf(c);
      if (out.stoppedBy) break;
      if (due(c, "councils") && room(true)) await councilsOf(c);
      if (out.stoppedBy) break;
      if (due(c, "rules") && room(true)) await rulesOf(c);

      async function questionsOf(country) {
        const loc = LOCATIONS.find((l) => l.name === country);
        if (!loc || !kwStore) return finish(country, "questions", "done", "no keyword data for this country yet — the keyword service does not ask it");
        const rows = await kwStore.keywordsAt({ location: loc.code, language: "en" });
        const top = questionGroups(rows, { subject: subject.name, skip: BRANDS, max: CF_COLLECTOR.maxGroups }).map((g) => ({ ...g, intent: g.group }));
        if (!top.length) return finish(country, "questions", "done", `no question-type searches from ${country} in the keyword database yet`);
        const known = await facts(), fee = known.find((f) => f.part === "fee" && localFee(f.value?.line));
        const lines = known.map((f) => f.part === "fee" ? `the ${subject.name} fee: ${String(f.value.line).split(" — ")[0]}` : f.part === "centres" ? (f.value.venue ? `${subject.name}'s own pages name a test venue in ${country}` : `no venue in ${country}; ${f.value.home}${f.value.nearest?.length ? `; nearest venues: ${f.value.nearest.join(", ")}` : ""}`) : f.part === "councils" ? `${f.profession}: ${f.value.name}` : f.part === "rules" ? f.value.rule : null).filter(Boolean);
        const byFact = top.filter((g) => g.intent === "fees" && fee), byAi = top.filter((g) => !byFact.includes(g));
        for (const g of byFact) await put({ key: `question|${country}|${slug(g.group)}`, country, part: "questions", kind: "question", value: { question: g.keywords[0], keywords: g.keywords.slice(0, 10), volume: g.volume, period: g.period, intent: g.intent, answer: `${subject.name} costs ${String(fee.value.line).split(" — ")[0]} in ${country} (${subject.name}'s own page, read ${fee.readOn}${fee.value.rate ? `; the rate: ${fee.value.rate.source}, ${fee.value.rate.date}` : ""}).` }, sourceUrl: fee.sourceUrl, sourceTitle: fee.sourceTitle, readOn: today, status: "confirmed" });
        if (!byAi.length) return finish(country, "questions");
        if (!aiConfigured(env)) return finish(country, "questions", "waiting", "the AI is not connected yet (ANTHROPIC_API_KEY) — only the fee questions are answered");
        if (!room(true)) return;
        const r = await askOne(answerQuestion({ country, subject: subject.name, groups: byAi, facts: lines }));
        if (!r.ok) return finish(country, "questions", "retry", r.why);
        const allowed = new Set([...numbersOf(lines.join(" ")), ...byAi.flatMap((g) => numbersOf(g.keywords.join(" ")))]);
        for (const g of byAi) {
          const a = (r.data.answers ?? []).find((x) => x.group === g.group); if (!a?.answer) continue;
          const extra = numbersOf(a.answer).filter((n) => !allowed.has(n));
          await put({ key: `question|${country}|${slug(g.group)}`, country, part: "questions", kind: "question", value: { question: g.keywords[0], keywords: g.keywords.slice(0, 10), volume: g.volume, period: g.period, intent: g.intent, answer: a.answer.trim(), label: "AI-written from the country's confirmed facts" }, readOn: today, aiWritten: true, proposedBy: "ai",
            status: extra.length ? "unconfirmed" : "confirmed", why: extra.length ? `the answer states ${extra.join(", ")}, which no confirmed fact says` : null });
        }
        return finish(country, "questions");
      }

      async function councilsOf(country) {
        const known = (ORIGIN.items ?? []).filter((f) => f.country === country && f.fact === "council" && f.profession).map((f) => ({ profession: f.profession, name: f.name ?? f.text, link: f.link }));
        let cands = known.map((k) => ({ profession: k.profession, name: k.name, website: k.link, address: "", sourceUrl: k.link, proposedBy: "almioet-record" }));
        if (aiConfigured(env)) {
          const r = await askOne(councilQuestion({ country, subject: subject.name, professions: CF_PROFESSIONS, known }));
          if (!r.ok) return finish(country, "councils", "retry", r.why);
          const ai = (r.data.councils ?? []).map((x) => ({ ...x, profession: professionKey(x.profession), proposedBy: "ai" })).filter((x) => x.profession && x.name && x.sourceUrl);
          cands = [...ai, ...cands.filter((k) => !ai.some((x) => x.profession === k.profession))];
        }
        for (const x of cands) {
          if (!room()) return;
          const page = await reader.read(x.sourceUrl), own = hostOf(x.sourceUrl) && (hostOf(x.sourceUrl) === hostOf(x.website) || governmentHost(hostOf(x.sourceUrl)));
          const text = page.ok ? `${page.title ?? ""} ${page.h1 ?? ""} ${page.text}` : "";
          const nameOk = page.ok && nameOnPage(x.name, text), addrOk = nameOk && x.address && addressOnPage(x.address, text);
          const why = !own ? "its source page is not on the body's own website or its government's" : !page.ok ? `its source page could not be read (${page.why})` : !nameOk ? "the name is not on its source page" : null;
          await put({ key: `council|${country}|${slug(x.profession)}`, country, profession: x.profession, part: "councils", kind: "council", value: { name: x.name, website: x.website, address: addrOk ? x.address : null, ...(nameOk && !addrOk ? { addressWhy: x.address ? "the address given is not on the source page" : "no address found yet" } : {}) },
            sourceUrl: page.ok ? page.url : x.sourceUrl, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, proposedBy: x.proposedBy, status: own && nameOk ? "confirmed" : "unconfirmed", why });
        }
        return finish(country, "councils", aiConfigured(env) ? "done" : "waiting", aiConfigured(env) ? null : "the AI is not connected yet (ANTHROPIC_API_KEY) — AlmiOET's records only");
      }

      async function rulesOf(country) {
        const councils = (await facts()).filter((f) => f.part === "councils");
        const hosts = new Set(councils.map((f) => hostOf(f.value?.website)).filter(Boolean));
        let cands = (ORIGIN.items ?? []).filter((f) => f.country === country && ["goodStanding", "attestation"].includes(f.fact)).map((f) => ({ kind: f.fact === "goodStanding" ? "good standing" : "attestation", rule: f.text, quote: null, sourceUrl: f.link, proposedBy: "almioet-record", profession: f.profession ?? null }));
        if (aiConfigured(env)) {
          const r = await askOne(ruleQuestion({ country, subject: subject.name, councils: councils.map((f) => f.value.name) }));
          if (!r.ok) return finish(country, "rules", "retry", r.why);
          cands = [...(r.data.rules ?? []).filter((x) => x.rule && x.quote && x.sourceUrl).slice(0, 3).map((x) => ({ ...x, proposedBy: "ai" })), ...cands];
        }
        let n = 0;
        for (const x of cands) {
          if (!room()) return;
          const page = await reader.read(x.sourceUrl), h = hostOf(x.sourceUrl), own = Boolean(h && (governmentHost(h) || hosts.has(h) || x.proposedBy === "almioet-record"));
          const found = page.ok && (x.quote ? quoteOnPage(x.quote, page.text) : true);
          const why = !own ? "its source page is not on an official website (the council's or the government's)" : !page.ok ? `its source page could not be read (${page.why})` : !found ? "the quoted words are not on its source page" : null;
          await put({ key: `rule|${country}|${slug(x.kind)}|${++n}`, country, profession: x.profession ?? null, part: "rules", kind: x.kind, value: { rule: x.rule, quote: x.quote ?? null }, sourceUrl: page.ok ? page.url : x.sourceUrl, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, proposedBy: x.proposedBy, aiWritten: x.proposedBy === "ai", status: own && found ? "confirmed" : "unconfirmed", why });
        }
        return finish(country, "rules", aiConfigured(env) ? "done" : "waiting", aiConfigured(env) ? null : "the AI is not connected yet (ANTHROPIC_API_KEY) — AlmiOET's records only");
      }
    }
    out.reads = reader.requests() - r0;
    await store.addSpend(today, { aiUsd: out.aiUsd, reads: out.reads, searches: out.searches });
    if (kv) try { await kv.run([["SET", "av:cf:last", JSON.stringify({ at: at(), ...out }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ }
    return out;
  } finally { if (kv) try { const [held] = await kv.run([["GET", "av:cf:lock"]]); if (held === id) await kv.run([["DEL", "av:cf:lock"]]); } catch { /* it expires by itself */ } }
}
