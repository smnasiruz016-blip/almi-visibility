/**
 * 🔴 ROW 60 — THE OWNER'S LAW, 14 SEPTEMBER 2026 (ROW60_CONSEQUENCE_LAW.md). GREEN on the real store; each of the
 * command's six evidence limbs RED, ALONE — each sabotage must trip its own limb and no other.
 *
 *   an entry missing REVERSIBILITY or any of the six parts          → entry
 *   volume amplifying ACROSS a level boundary                        → cross-level-amplifier   (A3's teeth)
 *   the same evidence ranking differently on a second run            → determinism             (A2)
 *   an UNCLASSIFIED class ranked LOW, or ranked on a fallback        → unclassified-ordered    (A4)
 *   UNCLASSIFIED, INFORMATIONAL or OBSERVATION admitted to the scale → scale
 *   REC-AI-CRAWLER-BLOCK given a level by nearest-class guessing     → nearest-class
 *
 * Since the split of 14 September 2026 the classes in use are the SPLIT classes (config/class-splits.mjs): ten keep
 * the owner's level, and the seven superseded entries keep every word the law holds them to.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { targetPageId, canonicalUrl } from "../src/evidence/ids.mjs";
import {
  reconcileRegister, scaleErrors, consequenceFor, orderByConsequence, orderErrors, determinismErrors, ENTRY_PARTS, NOT_SEVERITIES, UNCLASSIFIED,
} from "../src/audit/consequence.mjs";
import { splitView } from "../src/audit/class-split.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER, UNREACHABLE_RECOMMENDATIONS, SUPERSEDED_ENTRIES } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";
import { CLASS_SPLITS } from "../config/class-splits.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const read = (dir) => readdirSync(join(REPO, dir)).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, dir, f)).readAll());
const AUDIT = read("runs/audit");
const ALL = walk(join(REPO, "runs")).sort().flatMap((p) => createJsonlStore(p).readAll());
const { view: VIEW } = splitView(ALL, CLASS_SPLITS);
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const reconcile = (register) => reconcileRegister({ records: AUDIT, register, scale: SEVERITY_SCALE, splits: CLASS_SPLITS });

const OPEN = new Map();
for (const v of VIEW.values()) if (v.state === "OPEN") OPEN.set(v.class, (OPEN.get(v.class) ?? 0) + 1);
const classItems = (register = CONSEQUENCE_REGISTER, scale = SEVERITY_SCALE) =>
  Object.keys(register).sort().map((k) => ({ id: k, consequence: consequenceFor([k], register, scale), volume: OPEN.get(k) ?? 0, appliedClasses: [k], linkedClasses: [k] }));

// the halves nobody has ruled — since 14 Sep 2026, the two noindex classes
const HALVES = Object.keys(CONSEQUENCE_REGISTER).filter((k) => CONSEQUENCE_REGISTER[k].splitFrom && CONSEQUENCE_REGISTER[k].level === UNCLASSIFIED).sort();

/* ================================================================== *
 * THE LAW IS FROZEN, AND THE REGISTER IS ITS WORDS
 * ================================================================== */

const LAW_RAW = readFileSync(join(REPO, "ROW60_CONSEQUENCE_LAW.md"), "utf8").replace(/\r\n/g, "\n");
const norm = (s) => s.replace(/[*`]/g, "").replace(/🔴 /g, "").replace(/\s+/g, " ");
const LAW = norm(LAW_RAW);

test("🔴 the owner's law is frozen — its LF-normalised bytes hash to the value pinned here", () => {
  assert.equal(createHash("sha256").update(LAW_RAW, "utf8").digest("hex"), "d6ae2f156587fdbbc848a04dc284f7527c816f7d26a23c917233beb227008723");
});

test("🔴 every text field of every RULED entry — live or superseded — the Part C gap and every scale definition appear in the law WORD FOR WORD", () => {
  const skip = new Set(["what", "level", "ruledBy", "ruledOn", "wording", "figuresFrom", "escalatedFrom", "supersededOn", "supersededBy"]);
  const ruledEntries = [...Object.entries(CONSEQUENCE_REGISTER).filter(([, e]) => !e.splitFrom), ...Object.entries(SUPERSEDED_ENTRIES)];
  assert.equal(ruledEntries.length, 17, "the owner ruled 17 entries — 10 live, 7 superseded");
  const notVerbatim = [];
  const check = (where, s) => typeof s === "string" && !LAW.includes(norm(s)) && notVerbatim.push(where);
  let checked = 0;
  for (const [k, e] of ruledEntries) for (const [f, v] of Object.entries(e)) if (!skip.has(f) && typeof v === "string") (checked++, check(`${k}.${f}`, v));
  for (const [k, e] of Object.entries(UNREACHABLE_RECOMMENDATIONS)) for (const s of [e.gap, e.why, ...e.needs]) (checked++, check(k, s));
  for (const s of SEVERITY_SCALE) (checked++, check(`scale.${s.level}`, s.definition));
  assert.ok(checked >= 17 * 3, `only ${checked} fields checked — the check is policing too little`);
  assert.deepEqual(notVerbatim, [], "a field was paraphrased or invented");
  // a half claims none of the owner's words: it carries no consequence, reversibility, blast radius or ruling
  for (const k of HALVES) assert.deepEqual([CONSEQUENCE_REGISTER[k].consequence, CONSEQUENCE_REGISTER[k].reversibility, CONSEQUENCE_REGISTER[k].blastRadius, CONSEQUENCE_REGISTER[k].ruledBy], [null, null, null, null], k);
});

test("🔴 the scale is the law's: five levels, strongest first, and no state among them", () => {
  assert.deepEqual(SEVERITY_SCALE.map((s) => s.level), ["CRITICAL", "HIGH", "MODERATE", "LOW", "NONE"]);
  assert.deepEqual(scaleErrors(SEVERITY_SCALE), []);
  for (const s of SEVERITY_SCALE) assert.ok(LAW.includes(`${s.level} ${norm(s.definition)}`), `${s.level}'s definition is not the law's line`);
});

test("🟢 the evidence the ruled entries cite is the store's: the counts, the robots figures' pull, and the canonical intersection", () => {
  const e = CONSEQUENCE_REGISTER;
  assert.equal(OPEN.get("exact-duplicate"), 106);
  const liveNumbered = ["status-and-redirects", "head-elements", "canonical", "query-parameters"];
  assert.deepEqual(liveNumbered.map((k) => [k, String(OPEN.get(k))]), liveNumbered.map((k) => [k, e[k].blastRadius.match(/^\d+/)[0]]));
  // 🔴 4b: 216 impressions on all 106 and a 1,497-row pool are the COMPLETE page-rows pull the entry NAMES — an older
  // pull of the same window than the one the report ranks on (219 on 1,525 rows). The words are the owner's.
  const pull = ALL.find((r) => r.observation_id === e["robots-blocks-search-crawler"].figuresFrom && r.method === "gsc.searchAnalytics.query:page-rows");
  assert.equal(pull.value.dataState, "COMPLETE");
  assert.equal(pull.value.rows.length, 1497);
  const robots = new Set(AUDIT.filter((r) => r.record_type === "issue" && r.issue_class === "robots-blocks-search-crawler").map((r) => r.target_page_id));
  const imp = new Map();
  for (const row of pull.value.rows) {
    let id;
    try { id = targetPageId(canonicalUrl(row.url)); } catch { continue; }
    if (robots.has(id)) imp.set(id, (imp.get(id) ?? 0) + (row.impressions ?? 0));
  }
  assert.deepEqual([robots.size, [...robots].filter((p) => (imp.get(p) ?? 0) > 0).length, [...imp.values()].reduce((a, b) => a + b, 0)], [106, 106, 216]);
  // canonical is LOW "on its own evidence today" — the intersection it names is measured, and it is empty
  const open = (pred) => [...VIEW.values()].filter((v) => v.state === "OPEN" && pred(v)).map((v) => ALL.find((r) => r.issue_id === v.issue_id).target_page_id);
  const dup = new Set(open((v) => v.class === "exact-duplicate" || v.class === "near-duplicate-found"));
  assert.equal(open((v) => v.class === "canonical").filter((p) => dup.has(p)).length, 0, "a canonical-less page now sits on a duplicated page — the entry must be revisited");
  assert.match(AUDIT.find((r) => r.issue_class === "host-publishes-no-a-record").summary, /does NOT establish whether Googlebot reaches the host/);
  // 🔴 and the finding behind the split, held: the superseded orphan entry's 340 are all checks that never ran
  assert.equal(SUPERSEDED_ENTRIES["orphan-within-crawled-set"].blastRadius.match(/^\d+/)[0], "340");
  assert.equal(OPEN.get("orphan-within-crawled-set-check-not-run"), 340);
  assert.equal(OPEN.get("orphan-within-crawled-set-found") ?? 0, 0);
});

test("🟢 GREEN: the real classes order consequence-first, the unclassified go to owner review, and every check holds", () => {
  const items = classItems();
  const order = orderByConsequence({ items, scale: SEVERITY_SCALE });
  assert.deepEqual(orderErrors({ order, items, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE }), []);
  assert.deepEqual(determinismErrors({ items, scale: SEVERITY_SCALE }), []);
  assert.deepEqual(order.ranked.map((r) => r.id), [
    "exact-duplicate", "host-publishes-no-a-record", "official-source-contradicts-itself", "instrument-disagreement",
    "indexability-preflight-found", "thin-content-found", "robots-blocks-search-crawler", "near-duplicate-found", "template-dominance-found", "commencement-date-ambiguous-against-source",
    "head-elements", "status-and-redirects", "canonical", "query-parameters",
  ]);
  assert.deepEqual(order.unranked.map((u) => u.id), HALVES);
  assert.ok(order.unranked.every((u) => u.route === "OWNER REVIEW"));
});

/* ================================================================== *
 * LIMB 1 — A PARTIAL ENTRY
 * ================================================================== */

test("🔴 RED limb 1: an entry missing REVERSIBILITY — or any one of the six parts — is refused, alone", () => {
  for (const part of ENTRY_PARTS) {
    const reg = JSON.parse(JSON.stringify(CONSEQUENCE_REGISTER));
    delete reg["robots-blocks-search-crawler"][part];
    const r = reconcile(reg);
    assert.equal(r.ok, false, `${part} removed and the register still reconciled`);
    assert.deepEqual([r.missing, r.stale, r.inherited], [[], [], []]);
    assert.ok(r.invalid.length > 0 && r.invalid.every((x) => x.class === "robots-blocks-search-crawler"), `${part}: ${JSON.stringify(r.invalid)}`);
  }
  const reg = { ...CONSEQUENCE_REGISTER, "": CONSEQUENCE_REGISTER.canonical };
  assert.ok(reconcile(reg).stale.includes(""));
});

test("🔴 an UNCLASSIFIED entry that writes a consequence has picked a half — refused; and an escalation may cross ONE level only", () => {
  const reg = JSON.parse(JSON.stringify(CONSEQUENCE_REGISTER));
  reg["noindex-declared-deliberate"].consequence = "the dominant half";
  assert.ok(reconcile(reg).invalid.some((x) => x.class === "noindex-declared-deliberate" && /picks a half/.test(x.why)));
  const esc = JSON.parse(JSON.stringify(CONSEQUENCE_REGISTER));
  esc["robots-blocks-search-crawler"].escalatedFrom = "NONE"; // NONE → MODERATE is two steps
  assert.ok(reconcile(esc).invalid.some((x) => /one step up/.test(x.why)));
});

/* ================================================================== *
 * LIMB 2 — A3's TEETH: VOLUME NEVER CROSSES A LEVEL
 * ================================================================== */

test("🔴 RED limb 2: volume amplifying ACROSS a level — LOW 18 above HIGH 1 — is refused, alone", () => {
  const items = classItems();
  const levels = SEVERITY_SCALE.map((s) => s.level);
  const declared = items.filter((i) => i.consequence.state === "DECLARED");
  const order = {
    ranked: [...declared]
      .sort((a, b) => b.volume - a.volume || levels.indexOf(a.consequence.level) - levels.indexOf(b.consequence.level) || (a.id < b.id ? -1 : 1))
      .map((i, n) => ({ id: i.id, rank: n + 1, of: declared.length, level: i.consequence.level, volume: i.volume })),
    unranked: items.filter((i) => i.consequence.state !== "DECLARED").map((i) => ({ id: i.id })),
  };
  const at = (id) => order.ranked.findIndex((r) => r.id === id);
  assert.ok(at("head-elements") < at("host-publishes-no-a-record"), "the sabotaged order must actually put volume above consequence");
  const errs = orderErrors({ order, items, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE });
  assert.deepEqual(limbs(errs), ["cross-level-amplifier"], JSON.stringify(errs));
  // the check reads adjacent pairs: the first boundary volume crossed is MODERATE 118 sitting directly above HIGH 106
  assert.ok(errs.some((e) => /thin-content-found \(MODERATE, volume 118\) ranks above exact-duplicate \(HIGH, volume 106\)/.test(e.why)), JSON.stringify(errs));
});

test("🔴 inside ONE level, less volume above more is refused too — volume is the amplifier there", () => {
  const items = classItems();
  const order = orderByConsequence({ items, scale: SEVERITY_SCALE });
  [order.ranked[0], order.ranked[1]] = [order.ranked[1], order.ranked[0]]; // host (HIGH, 1) above exact-duplicate (HIGH, 106)
  assert.deepEqual(limbs(orderErrors({ order, items, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE })), ["amplifier"]);
});

/* ================================================================== *
 * LIMB 3 — A2: DETERMINISM
 * ================================================================== */

test("🔴 RED limb 3: the same evidence ranking differently on a second run is refused, alone — on the real HIGH tie (host 1, official 1)", () => {
  const items = classItems();
  const noTieBreak = ({ items: xs, scale }) => {
    const levels = scale.map((s) => s.level);
    return xs.filter((i) => i.consequence.state === "DECLARED").sort((a, b) => levels.indexOf(a.consequence.level) - levels.indexOf(b.consequence.level) || b.volume - a.volume).map((i) => i.id);
  };
  assert.deepEqual(limbs(determinismErrors({ order: noTieBreak, items, scale: SEVERITY_SCALE })), ["determinism"]);
  assert.deepEqual(determinismErrors({ items, scale: SEVERITY_SCALE }), []);
  assert.equal(JSON.stringify(orderByConsequence({ items, scale: SEVERITY_SCALE })), JSON.stringify(orderByConsequence({ items: [...items].reverse(), scale: SEVERITY_SCALE })));
});

/* ================================================================== *
 * LIMB 4 — A4: UNCLASSIFIED IS NEVER LOW, NEVER RANKED ON A FALLBACK
 * ================================================================== */

test("🔴 RED limb 4: an UNCLASSIFIED class ranked as LOW — the fallback — is refused, alone", () => {
  const items = classItems();
  const fallback = orderByConsequence({
    items: items.map((i) => (i.consequence.state === "DECLARED" ? i : { ...i, consequence: { ...i.consequence, state: "DECLARED", level: "LOW" } })),
    scale: SEVERITY_SCALE,
  });
  assert.equal(fallback.unranked.length, 0);
  const errs = orderErrors({ order: fallback, items, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE });
  assert.deepEqual(limbs(errs), ["unclassified-ordered"], JSON.stringify(errs));
  assert.deepEqual(errs.map((e) => e.id).sort(), HALVES);
});

test("🔴 A4 on the real recommendations: the one with the MOST volume (noindex, 484) is not ranked, because its consequence is unknown", () => {
  const fields = computeRecommendationFields({
    recommendations: AUDIT.filter((r) => r.record_type === "draft_recommendation"),
    links: AUDIT.filter((r) => r.record_type === "recommendation_evidence"),
    records: [...AUDIT, ...read("runs/evidence"), ...read("runs/crawl")],
    ledger: createJsonlStore(join(REPO, "runs", "cost", "ledger.jsonl")).readAll(),
    consequenceRegister: CONSEQUENCE_REGISTER,
    consequenceScale: SEVERITY_SCALE,
    classSplits: CLASS_SPLITS,
  });
  const n = fields.find((f) => f.recommendation_id === "REC-NOINDEX-CV-GUIDE").priority;
  assert.equal(n.rank, 1, "it has the most measured volume");
  assert.deepEqual([n.consequenceWeightedRank.state, n.consequenceWeightedRank.route], ["UNKNOWN", "OWNER REVIEW"]);
});

/* ================================================================== *
 * LIMB 5 — STATES ARE NEVER SEVERITIES
 * ================================================================== */

test("🔴 RED limb 5: UNCLASSIFIED, INFORMATIONAL or OBSERVATION admitted into the severity scale is refused, alone — each one", () => {
  assert.deepEqual([...NOT_SEVERITIES].sort(), ["INFORMATIONAL", "OBSERVATION", "UNCLASSIFIED", "UNKNOWN"]);
  for (const state of ["UNCLASSIFIED", "INFORMATIONAL", "OBSERVATION", "UNKNOWN"]) {
    const errs = scaleErrors([...SEVERITY_SCALE, { level: state, definition: "a state dressed as a level" }]);
    assert.deepEqual(limbs(errs), ["scale"], state);
    assert.equal(errs.length, 1, state);
  }
  assert.deepEqual(limbs(scaleErrors([])), ["scale"], "an empty scale is not a scale");
});

/* ================================================================== *
 * LIMB 6 — PART C: NO NEAREST CLASS
 * ================================================================== */

test("🔴 RED limb 6: REC-AI-CRAWLER-BLOCK given a level by borrowing the nearest class is refused, alone", () => {
  const links = AUDIT.filter((r) => r.record_type === "recommendation_evidence" && r.recommendation_id === "REC-AI-CRAWLER-BLOCK");
  assert.deepEqual(links.at(-1).issues, [], "its evidence links no issue");
  const guessed = consequenceFor(["robots-blocks-search-crawler"], CONSEQUENCE_REGISTER, SEVERITY_SCALE);
  const items = [
    { id: "REC-AI-CRAWLER-BLOCK", consequence: guessed, volume: null, appliedClasses: ["robots-blocks-search-crawler"], linkedClasses: [] },
    { id: "REC-ROBOTS-CORRIDOR", consequence: guessed, volume: 219, appliedClasses: ["robots-blocks-search-crawler"], linkedClasses: ["robots-blocks-search-crawler"] },
  ];
  const errs = orderErrors({ order: orderByConsequence({ items, scale: SEVERITY_SCALE }), items, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE });
  assert.deepEqual(limbs(errs), ["nearest-class"], JSON.stringify(errs));
  assert.deepEqual(errs.map((e) => e.id), ["REC-AI-CRAWLER-BLOCK"]);
  const c = UNREACHABLE_RECOMMENDATIONS["REC-AI-CRAWLER-BLOCK"];
  assert.equal(c.level, UNCLASSIFIED);
  assert.deepEqual([...c.needs], ["affected scope", "crawler access", "robots directives in force", "reversibility", "the measured visibility or indexation consequence"]);
});
