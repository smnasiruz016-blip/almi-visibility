/**
 * F38 · ANSWER-FIRST CONTENT SPECIFICATION — the useful answer early; one title and one meta description for every page, truthful to its
 * verified content and unique among the client's pages; an absent, empty, duplicated or overstating title or description is a finding, never
 * silently rewritten (acceptance _handoffs 96ae49e, RR-210; approved by its hash d74c5efd…, contract 977b0f38…).
 *
 *   C1  a draft's first content block after its single top heading is F37's direct answer; F38 READS F37's render and never re-renders it.
 *       Where the answer sits on an existing page is NOT MEASURED: no record states an existing page's central question.
 *   C2  a draft's title is its central question's wording as F91 compiled it — the need's own words, and no keyword the content does not hold.
 *       No count, density, length or quota of words, keywords or characters decides anything. Repetition is F40's, read, never re-judged.
 *   C3  the description is the text of the page's supported central claims exactly as the draft renders them; an UNKNOWN part never appears;
 *       nothing promises indexing, ranking, a rich result or AI citation. Useful and engaging are F40's.
 *   C4  exactly one title and one description per draft, recorded as its HEAD, BESIDE the body: the body F37 rendered and F40 judged is never
 *       touched. A draft with no rendered supported central claim gets no invented description: ABSENT, a finding.
 *   C5  every recorded page of the tenant with a stored body: its title and description as the body holds them, and a finding for each that is
 *       ABSENT, EMPTY, MULTIPLE or DUPLICATED (the same text as another recorded page). OVERSTATING is NOT MEASURED for an existing page. A
 *       page with no stored body is NOT MEASURED. Nothing is written, generated or rewritten for an existing page.
 *   C6  uniqueness is decided only among the pages the inventory holds: on an INCOMPLETE or UNKNOWN inventory it is UNIQUE AMONG RECORDED
 *       PAGES, never among the client's pages. One tenant per run, through the one tenant decision.
 *   C7  F38 changes no other row: F37's render, F40's judgements, F41's preview, F94's plan and the head-elements check are read or left alone.
 *
 * Pure. Records in, a head and findings out. No file, no network, no provider, no store.
 */
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { PROMISE, claimsOf } from "./draft-render.mjs";

export const VERDICT = Object.freeze({ PASS: "PASS", FAIL: "FAIL", NOT_MEASURED: "NOT MEASURED" });
export const FINDING = Object.freeze({ ABSENT: "ABSENT", EMPTY: "EMPTY", MULTIPLE: "MULTIPLE", DUPLICATED: "DUPLICATED" });
export const UNIQUE = Object.freeze({ CLIENT: "UNIQUE AMONG THE CLIENT'S PAGES", RECORDED: "UNIQUE AMONG RECORDED PAGES" });
export const OVERSTATING_NOT_MEASURED = "NOT MEASURED — no record holds an existing page's verified claims, so whether its title or description overstates them cannot be decided";
export const ANSWER_PLACEMENT_NOT_MEASURED = "NOT MEASURED — no record states an existing page's central question, so where its answer sits cannot be decided";
export const NO_BODY = "NOT MEASURED — no stored body for this page";
export const STANDING = "a specification and a set of findings only — F38 writes, generates or rewrites no page's title or description, publishes nothing and changes no other row";

const present = (s) => typeof s === "string" && s.trim() !== "";
const sameTenant = (a, b) => decideResolvedTenants(a, b).allowed === true;
const decode = (s) => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const textOf = (s) => decode(String(s).replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const attr = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag); return m ? decode(m[1] ?? m[2]) : null; };

/** The titles and meta descriptions a stored body holds, every one (C5 needs MULTIPLE). */
export function headOfBody(html) {
  const s = String(html ?? "");
  return {
    titles: [...s.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => textOf(m[1])),
    descriptions: [...s.matchAll(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*>/gi)].map((m) => (attr(m[0], "content") ?? "").trim()),
  };
}

/** C1 · on F37's draft: the first content block after the single top heading is the direct answer, and nothing else precedes the first question. */
export function answerFirst(draft) {
  const html = String(draft?.html ?? "").replace(/^<link\b[^>]*>\n/, "");
  const head = /^<article\b[^>]*>\n<h1>[^<]*<\/h1>\n<section class="direct-answer" id="answer">/.exec(html);
  if (!head) return Object.freeze({ verdict: VERDICT.FAIL, why: "the first content block after the top heading is not the direct answer" });
  const answerEnd = html.indexOf("</section>", head[0].length);
  const firstQa = html.indexOf('<section class="qa"');
  const between = firstQa < 0 ? "" : html.slice(answerEnd + "</section>".length, firstQa);
  if (firstQa >= 0 && between.trim() !== "") return Object.freeze({ verdict: VERDICT.FAIL, why: "content other than the title, the heading and the answer precedes the first question section" });
  if ((html.match(/<h1>/g) ?? []).length !== 1) return Object.freeze({ verdict: VERDICT.FAIL, why: "the draft does not carry exactly one top heading" });
  return Object.freeze({ verdict: VERDICT.PASS, why: "the direct answer is the first content block after the top heading" });
}

/** C3 · the supported CENTRAL claims (F37's own claimsOf: central unless marked otherwise) exactly as the draft renders them in its direct
 * answer — never an UNKNOWN part, never a non-central claim. */
export function renderedAnswerClaims(draft, spec) {
  let central;
  try { central = new Set(claimsOf(spec).renderable.filter((c) => c.central !== false).map((c) => c.claimId)); } catch { central = new Set(); }
  const html = String(draft?.html ?? "");
  const start = html.indexOf('<section class="direct-answer" id="answer">');
  if (start < 0) return [];
  const section = html.slice(start, html.indexOf("</section>", start));
  return [...section.matchAll(/<div class="claim" data-claim-id="([^"]+)"><p class="claim-text">([\s\S]*?)<\/p>/g)].filter((m) => central.has(m[1])).map((m) => Object.freeze({ claimId: m[1], text: textOf(m[2]) }));
}

/**
 * C2–C4, C6 · one draft's head, BESIDE its body. `others` are the recorded pages' and the run's other drafts' titles and descriptions;
 * `completeness` is F31's verdict for the tenant. The body is read, never changed.
 */
export function headForDraft({ spec, draft, others = { titles: [], descriptions: [] }, completeness = null }) {
  const findings = [];
  const title = present(spec?.title) ? spec.title.trim() : null;
  const claims = renderedAnswerClaims(draft, spec);
  const description = claims.length ? claims.map((c) => c.text).join(" ") : null;
  if (!title) findings.push({ part: "title", kind: FINDING.ABSENT, why: "the compiled spec holds no central question wording" });
  if (!description) findings.push({ part: "description", kind: FINDING.ABSENT, why: "the draft renders no supported central claim — no description is invented" });
  if (title && (others.titles ?? []).includes(title)) findings.push({ part: "title", kind: FINDING.DUPLICATED, why: "a recorded page or another draft of the run holds the same title" });
  if (description && (others.descriptions ?? []).includes(description)) findings.push({ part: "description", kind: FINDING.DUPLICATED, why: "a recorded page or another draft of the run holds the same description" });
  const complete = completeness?.state === "COMPLETE";
  const unique = findings.some((f) => f.kind === FINDING.DUPLICATED) ? null : complete ? UNIQUE.CLIENT : UNIQUE.RECORDED;
  const headHtml = [title ? `<title>${esc(title)}</title>` : null, description ? `<meta name="description" content="${esc(description)}">` : null].filter(Boolean).join("\n");
  return Object.freeze({
    feature: "F38", subject: spec?.subject ?? null,
    answerFirst: answerFirst(draft),
    title, description, headHtml,
    descriptionClaims: Object.freeze(claims.map((c) => c.claimId)),
    findings: Object.freeze(findings.map((f) => Object.freeze(f))),
    unique, inventory: completeness?.state ?? "UNKNOWN",
    verdict: findings.length ? VERDICT.FAIL : VERDICT.PASS,
    standing: STANDING,
  });
}

/** Every way a draft's head breaks C1–C4, read from the head, the spec and the draft. A head with any fault is refused. */
export function headFaults(head, { spec, draft }) {
  const f = [];
  const add = (clause, code) => f.push({ clause, code });
  if (answerFirst(draft).verdict !== VERDICT.PASS) add("C1", "ANSWER_NOT_FIRST");
  if (head?.title !== (present(spec?.title) ? spec.title.trim() : null)) add("C2", "TITLE_IS_NOT_THE_CENTRAL_QUESTION");
  const rendered = renderedAnswerClaims(draft, spec);
  if (head?.description != null && head.description !== rendered.map((c) => c.text).join(" ")) add("C3", "DESCRIPTION_IS_NOT_THE_RENDERED_SUPPORTED_CLAIMS");
  const unknown = [...String(draft?.html ?? "").matchAll(/<p class="unknown"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]).replace(/^UNKNOWN — /, ""));
  if (unknown.some((u) => present(u) && (`${head?.title ?? ""} ${head?.description ?? ""}`).includes(u))) add("C3", "AN_UNKNOWN_PART_IN_THE_HEAD");
  if (PROMISE.test(`${head?.title ?? ""} ${head?.description ?? ""} ${head?.headHtml ?? ""}`)) add("C3", "A_PROMISE_IN_THE_HEAD");
  const h = headOfBody(head?.headHtml ?? "");
  if (h.titles.length !== 1 || !present(h.titles[0])) add("C4", "NOT_EXACTLY_ONE_NON_EMPTY_TITLE");
  if (h.descriptions.length !== 1 || !present(h.descriptions[0])) add("C4", "NOT_EXACTLY_ONE_NON_EMPTY_DESCRIPTION");
  const body = headOfBody(draft?.html ?? "");
  if (body.titles.length || body.descriptions.length) add("C4", "THE_HEAD_IS_INSIDE_THE_BODY");
  return f;
}

/**
 * C5, C6 · one tenant's existing pages: each page's title and description as its stored body holds them, and its findings. Another tenant's
 * page is refused and never read into the result. Nothing is rewritten.
 */
export function auditExistingPages({ tenantId, pages = [], completeness = null }) {
  const refused = [];
  const own = [];
  for (const p of pages) (sameTenant(p?.tenantId, tenantId) ? own : refused).push(p);
  const withBody = own.filter((p) => present(p.html));
  const heads = new Map(withBody.map((p) => [p.pageId, headOfBody(p.html)]));
  const count = (pick) => { const m = new Map(); for (const h of heads.values()) { const v = pick(h); if (present(v)) m.set(v, (m.get(v) ?? 0) + 1); } return m; };
  const single = (list) => (list.length === 1 ? list[0] : null);
  const titleCounts = count((h) => single(h.titles)), descCounts = count((h) => single(h.descriptions));
  const findingsOf = (list, counts) => {
    if (!list.length) return [FINDING.ABSENT];
    const out = [];
    if (list.length > 1) out.push(FINDING.MULTIPLE);
    if (list.every((v) => !present(v))) out.push(FINDING.EMPTY);
    if (list.length === 1 && present(list[0]) && counts.get(list[0]) > 1) out.push(FINDING.DUPLICATED);
    return out;
  };
  const complete = completeness?.state === "COMPLETE";
  const results = own.map((p) => {
    if (!present(p.html)) return Object.freeze({ pageId: p.pageId, measured: false, why: NO_BODY, overstating: OVERSTATING_NOT_MEASURED, answerPlacement: ANSWER_PLACEMENT_NOT_MEASURED });
    const h = heads.get(p.pageId);
    const title = findingsOf(h.titles, titleCounts), description = findingsOf(h.descriptions, descCounts);
    return Object.freeze({
      pageId: p.pageId, measured: true,
      title: Object.freeze({ values: Object.freeze([...h.titles]), findings: Object.freeze(title), unique: title.length ? null : complete ? UNIQUE.CLIENT : UNIQUE.RECORDED }),
      description: Object.freeze({ values: Object.freeze([...h.descriptions]), findings: Object.freeze(description), unique: description.length ? null : complete ? UNIQUE.CLIENT : UNIQUE.RECORDED }),
      overstating: OVERSTATING_NOT_MEASURED,
      answerPlacement: ANSWER_PLACEMENT_NOT_MEASURED,
    });
  });
  const tally = (part) => Object.fromEntries(Object.values(FINDING).map((k) => [k, results.filter((r) => r.measured && r[part].findings.includes(k)).length]));
  return Object.freeze({
    feature: "F38", tenantId, inventory: completeness?.state ?? "UNKNOWN", bound: completeness?.bound ?? "no completeness verdict recorded (F31)",
    pages: own.length, measured: withBody.length, notMeasured: own.length - withBody.length,
    title: Object.freeze(tally("title")), description: Object.freeze(tally("description")),
    results: Object.freeze(results), refused: Object.freeze(refused.map((p) => Object.freeze({ pageId: p?.pageId ?? null, why: "ANOTHER TENANT'S PAGE — never read into this audit (C6)" }))),
    standing: STANDING,
  });
}
