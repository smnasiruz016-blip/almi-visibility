/**
 * F55 · AI CRAWLER ACCESS AUDIT (acceptance _handoffs 7323446, RR-93).
 *
 * Spec row: "Check whether supported AI crawlers can reach intended public content and distinguish policy from observed retrieval."
 *
 *   CRAWLERS    only the ones the engine's configuration DECLARES (config/blocked-crawlers.mjs): its AI categories, each by the
 *               operator-documented token. None added, none dropped. An empty declaration is COULD-NOT-PROVE.
 *   POLICY      per crawler and page, from the client's RECORDED robots.txt by RFC 9309: the most specific group, else `*`; the longest
 *               rule, allow winning a tie (src/audit/robots-scope.mjs, reused unchanged). A 4xx robots.txt is "unavailable" → ALLOWED;
 *               a 5xx or a failed fetch is "unreachable" → DISALLOWED; no record → NOT_MEASURED. It answers "may it", never "did it".
 *   RETRIEVAL   only a RECORDED retrieval by that crawler (passed explicitly; none is recorded today) — otherwise NOT_MEASURED, never
 *               inferred from policy, never zero.
 *   DIRECTIVES  a recorded meta robots tag addressed to all robots or to the crawler's token, reported BESIDE the policy — it never
 *               changes it. The X-Robots-Tag header is NOT_RECORDED where the collector did not record it.
 * Pure; names no product.
 */
import { parseGroups, selectGroup, decide } from "./robots-scope.mjs";

export const POLICY = Object.freeze({ ALLOWED: "ALLOWED", DISALLOWED: "DISALLOWED", NOT_MEASURED: "NOT_MEASURED" });
export const AI_CATEGORIES = Object.freeze(["AI_TRAINING", "AI_SEARCH", "AI_USER_FETCH"]);

/** C4 — the declared supported AI crawlers: the configuration's AI categories with an operator-documented token. */
export function declaredAiCrawlers(declared) {
  return (declared ?? [])
    .filter((c) => AI_CATEGORIES.includes(c?.category) && c?.tier === "OFFICIAL" && typeof c?.agent === "string" && c.agent !== "")
    .map((c) => Object.freeze({ token: c.agent, category: c.category }));
}

/** C1 — the robots decider for one crawler token, from one recorded robots.txt observation (or null). */
export function robotsPolicy(record, token) {
  const v = record?.value;
  if (!v) return { decide: () => ({ state: POLICY.NOT_MEASURED, why: "no recorded robots.txt" }) };
  const ref = record.observation_id;
  if (v.fetchError) return { decide: () => ({ state: POLICY.DISALLOWED, why: "robots.txt unreachable (fetch failed) — RFC 9309: assume complete disallow", ref }) };
  const status = Number(v.httpStatus);
  if (status >= 500 && status < 600) return { decide: () => ({ state: POLICY.DISALLOWED, why: `robots.txt unreachable (${status}) — RFC 9309: assume complete disallow`, ref }) };
  if (status >= 400 && status < 500) return { decide: () => ({ state: POLICY.ALLOWED, why: `robots.txt unavailable (${status}) — RFC 9309: any resource may be accessed`, ref }) };
  if (!(status >= 200 && status < 300) || typeof v.body !== "string") return { decide: () => ({ state: POLICY.NOT_MEASURED, why: "the recorded robots.txt is not readable", ref }) };
  const group = selectGroup(parseGroups(v.body), token);
  return {
    decide: (url) => {
      const d = decide(group, url);
      return { state: d.allowed ? POLICY.ALLOWED : POLICY.DISALLOWED, group: group.matchedBy, rule: d.rule ? `${d.rule.type}:${d.rule.path.length}` : null, ref };
    },
  };
}

/** C3 — recorded meta robots directives addressed to all robots or to this token. The header half: NOT_RECORDED. */
export function pageDirectives(html, token) {
  const s = String(html ?? "");
  const t = String(token).toLowerCase();
  const out = [];
  for (const m of s.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const name = /name\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]?.toLowerCase() ?? null;
    if (name !== "robots" && name !== t) continue;
    const content = (/content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
    out.push({ addressedTo: name === "robots" ? "ALL_ROBOTS" : "THIS_CRAWLER", content });
  }
  return { meta: out, header: "NOT_RECORDED" };
}

/**
 * One client's audit.
 * @param crawlers      declaredAiCrawlers(...) — the declared list
 * @param robotsFor     (url) => the recorded robots.txt observation for that page's origin, or null
 * @param pages         [{ pageId, url, html }] — the client's inventory pages
 * @param retrievals    RECORDED retrievals [{ token, pageId, at, ref }] — passed explicitly; [] is the recorded fact today
 */
export function auditAiCrawlerAccess({ crawlers, robotsFor, pages, retrievals }) {
  if (!Array.isArray(retrievals)) throw new TypeError("recorded retrievals must be passed explicitly — an empty list is a recorded fact, not a default");
  if (!crawlers?.length) return Object.freeze({ verdict: "COULD_NOT_PROVE", why: "no supported AI crawler is declared", rows: [] });
  const rows = [];
  for (const c of crawlers) {
    for (const p of pages) {
      const policy = robotsPolicy(robotsFor(p.url), c.token).decide(p.url);
      const seen = retrievals.filter((r) => r?.token === c.token && r?.pageId === p.pageId && typeof r.ref === "string" && r.ref !== "" && typeof r.at === "string");
      const retrieval = seen.length ? { state: "OBSERVED", at: seen.map((r) => r.at).sort().at(-1), refs: seen.map((r) => r.ref) } : { state: "NOT_MEASURED", why: "no recorded retrieval by this crawler" };
      rows.push(Object.freeze({ token: c.token, category: c.category, pageId: p.pageId, policy, retrieval, directives: pageDirectives(p.html, c.token) }));
    }
  }
  return Object.freeze({ verdict: "AUDITED", rows });
}

export function summarise(audit) {
  const by = (f) => audit.rows.reduce((m, r) => ((m[f(r)] = (m[f(r)] ?? 0) + 1), m), {});
  return Object.freeze({
    pairs: audit.rows.length,
    policy: by((r) => r.policy.state),
    policyGroup: by((r) => r.policy.group ?? "-"),
    retrieval: by((r) => r.retrieval.state),
    directivesAddressed: audit.rows.filter((r) => r.directives.meta.length > 0).length,
    directivesNoindex: audit.rows.filter((r) => r.directives.meta.some((d) => d.content.includes("noindex") || d.content.includes("none"))).length,
  });
}
