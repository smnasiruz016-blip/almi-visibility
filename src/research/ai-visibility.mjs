/**
 * 🔴 F51 · F52 · F53 · F56 · F57 · AI VISIBILITY FROM FILED OBSERVATIONS (acceptances _handoffs AlmiVisibility_F51/F52/F53/F56/F57_ACCEPTANCE_
 * 2026-10-19.md, RR-291; owner answer Q1 CHANGED: the client's OWN AI connection when it connects it — its key or subscription, the cost on the
 * client — or records filed by hand; AlmiWorld never pays for a client's AI calls).
 *
 * An AI-answer OBSERVATION is admitted only with its prompt, system, date, sampling, method, cited URLs and route (CLIENT_AI_CONNECTION or
 * HAND_FILED); one without its date or method is refused, named (F51 C1, C3). From admitted observations only:
 *   F51 · mention / omission / citation counted PER SYSTEM, each over its own sample;
 *   F52 · share of mentions over the filed samples, with the sample size, worded for that sample — NOT MEASURED with no sample;
 *   F53 · the graph prompt → answer → mention → citation → source → gap → action, every link from an observation, none inferred;
 *   F56 · a description of the brand kept only with its observation id and an uncertainty label;
 *   F57 · an action per gap, decided by F35's OWN rule for the gap's need (src/page/action-decision.mjs decideGroupedNeed) — no gap, no action.
 * Pure. Generic: it names no client, product, provider or host.
 */
import { decideGroupedNeed } from "../page/action-decision.mjs";

export const ROUTES = Object.freeze({ CLIENT_AI_CONNECTION: "CLIENT_AI_CONNECTION", HAND_FILED: "HAND_FILED" });
export const NOT_MEASURED = "NOT MEASURED";
export const UNCERTAINTY = Object.freeze(["LOW", "MEDIUM", "HIGH"]);
const present = (v) => typeof v === "string" && v.trim() !== "";
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };

/** F51 C1 + C3 · admit one observation, or refuse it with every missing part named. */
export function admitObservation(o) {
  const missing = [];
  for (const f of ["observationId", "prompt", "system", "sampling", "method"]) if (!present(o?.[f])) missing.push(f);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o?.date ?? "")) missing.push("date");
  if (!Array.isArray(o?.citedUrls)) missing.push("citedUrls");
  if (!Object.values(ROUTES).includes(o?.route)) missing.push(`route (${Object.values(ROUTES).join(" or ")})`);
  if (typeof o?.mentionsBrand !== "boolean") missing.push("mentionsBrand");
  return missing.length ? Object.freeze({ state: "REFUSED", missing: Object.freeze(missing) }) : Object.freeze({ state: "ADMITTED", observation: Object.freeze({ ...o }) });
}

/** F51 C2 · per system: its sample, mentioned, omitted, and cited (one of the brand's own domains among the cited URLs). */
export function perSystem(observations, { brandDomains = [] }) {
  const own = new Set(brandDomains.map((d) => d.replace(/^www\./, "")));
  const out = {};
  for (const o of observations) {
    const s = (out[o.system] ??= { sample: 0, mentioned: 0, omitted: 0, cited: 0 });
    s.sample += 1;
    if (o.mentionsBrand) s.mentioned += 1; else s.omitted += 1;
    if (o.citedUrls.some((u) => own.has(hostOf(u)))) s.cited += 1;
  }
  return out;
}

/** F52 · share of mentions over the FILED samples only, with the sample size; NOT MEASURED with none. Never worded as universal. */
export function shareOfVoice(observations, { brand, competitors = [] }) {
  const n = observations.length;
  if (n === 0) return Object.freeze({ state: NOT_MEASURED, sample: 0, line: `share of AI mentions: ${NOT_MEASURED} — no filed sample` });
  const named = (o, who) => (who === brand ? o.mentionsBrand : (o.mentionsCompetitors ?? []).includes(who));
  const shares = Object.fromEntries([brand, ...competitors].map((w) => [w, Math.round((100 * observations.filter((o) => named(o, w)).length) / n)]));
  const systems = [...new Set(observations.map((o) => o.system))].sort();
  return Object.freeze({ state: "MEASURED", sample: n, shares, line: `in ${n} filed answer(s) from ${systems.join(", ")} (${observations[0].date} … ${observations.at(-1).date}): ${Object.entries(shares).map(([k, v]) => `${k} ${v}%`).join(" · ")} — this sample only` });
}

/** F53 · the influence graph, every node and link from an observation; an unobserved link is absent. */
export function influenceGraph(observations, gaps = [], actions = []) {
  const nodes = new Map(), links = [];
  const node = (id, kind) => { if (!nodes.has(id)) nodes.set(id, { id, kind }); return id; };
  for (const o of observations) {
    const p = node(`prompt:${o.prompt}`, "PROMPT"), a = node(`answer:${o.observationId}`, "ANSWER");
    links.push([p, a]);
    if (o.mentionsBrand) links.push([a, node(`mention:${o.observationId}`, "MENTION")]);
    for (const u of o.citedUrls) { const c = node(`citation:${o.observationId}:${u}`, "CITATION"); links.push([a, c]); const h = hostOf(u); if (h) links.push([c, node(`source:${h}`, "SOURCE")]); }
  }
  for (const g of gaps) if (nodes.has(`answer:${g.observationId}`)) links.push([`answer:${g.observationId}`, node(`gap:${g.gapId}`, "GAP")]);
  for (const x of actions) if (nodes.has(`gap:${x.gapId}`)) links.push([`gap:${x.gapId}`, node(`action:${x.gapId}:${x.action}`, "ACTION")]);
  const kinds = [...nodes.values()].reduce((m, n) => ((m[n.kind] = (m[n.kind] ?? 0) + 1), m), {});
  return Object.freeze({ nodes: nodes.size, links: links.length, kinds, edges: Object.freeze(links) });
}

/** F53 / F57 · the gaps the observations show: an answer that omits the brand is OMITTED; one that names it but cites none of its domains NOT_CITED. */
export function gapsOf(observations, { brandDomains = [] }) {
  const own = new Set(brandDomains.map((d) => d.replace(/^www\./, "")));
  return observations.flatMap((o) => {
    const cited = o.citedUrls.some((u) => own.has(hostOf(u)));
    const kind = !o.mentionsBrand ? "OMITTED" : !cited ? "NOT_CITED" : null;
    return kind ? [Object.freeze({ gapId: `${o.observationId}:${kind}`, observationId: o.observationId, kind, needId: o.needId ?? null, system: o.system })] : [];
  });
}

/** F56 · a description of the brand, kept only with its observation id and an uncertainty label; none without its evidence. */
export function admitDescription(d, admittedIds) {
  if (!present(d?.observationId) || !admittedIds.has(d.observationId)) return Object.freeze({ state: "REFUSED", reason: "NO_OBSERVATION_BEHIND_IT" });
  if (!UNCERTAINTY.includes(d?.uncertainty)) return Object.freeze({ state: "REFUSED", reason: "NO_UNCERTAINTY_LABEL" });
  if (!present(d?.description)) return Object.freeze({ state: "REFUSED", reason: "NO_DESCRIPTION" });
  return Object.freeze({ state: "ADMITTED", description: Object.freeze({ observationId: d.observationId, description: d.description, uncertainty: d.uncertainty }) });
}

/**
 * F57 · one action per gap, by F35's own rule for the gap's need: its coverage record decides (FULL → KEEP / NO NEW PAGE; PARTIAL → ADD
 * SECTION; NONE → HOLD until F35's guards pass). A gap with no need is HELD, named. No gap, no action; never generic AI content.
 */
export function actionsForGaps(gaps, { coverageOf = () => null, needOf = () => null }) {
  return gaps.map((g) => {
    const need = g.needId ? needOf(g.needId) : null;
    if (!need) return Object.freeze({ gapId: g.gapId, action: "HOLD", reason: "the gap names no recorded need (F35 C9)", rule: "F35" });
    const d = decideGroupedNeed({ need, coverage: coverageOf(g.needId), rightToExist: null, duplication: { state: "NO_COMPARISON" } });
    return Object.freeze({ gapId: g.gapId, action: d.decision === "CHOSEN" ? d.actions.map((a) => a.action).join("+") : "HOLD", reason: d.decision === "CHOSEN" ? d.actions.map((a) => a.rule).join("; ") : (d.missing ?? []).join("; "), rule: "F35 decideGroupedNeed" });
  });
}
