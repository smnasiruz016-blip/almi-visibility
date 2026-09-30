/**
 * 🔴 SPECIFICATION AMENDMENT 2 (RR-80 §2; _handoffs 388ae02, applied 3f86fbf) — ten rows' required outcomes amended in place.
 *
 * Proves: (1) each amended row is the amendment's line BYTE FOR BYTE — the line is carried here as TEXT and hashed here, never
 * copied from the generated file (a pin compared to itself proves nothing; CI has no _handoffs checkout); (2) NO other row
 * changed — BEFORE is the 16-hex prefix of every row's line hash in the generated file at main 9c47219 (blob sha256
 * 78a650bf…), the last derivation from the amended_1 extract; (3) ids, order and the denominator are unchanged — 90, F01–F90,
 * no F00, no F91 (P22b's negative control stands untouched); (4) the one class change, F62 to Core intelligence.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { CAPABILITIES, EXTRACT_PROVENANCE } from "../config/fboard/capabilities.mjs";
import { EXTRACT_PROVENANCE as DERIVE_PROVENANCE } from "../bin/fboard-derive.mjs";

const AMENDED = [
  "F10 | Core intelligence | Human question discovery | Discover goals, questions, concerns, confusions and likely follow-up questions. Questions drawn from the subject's own Search Console are owned evidence of its own properties; a result over them covers only that owned sample and never stands for public or global question research.",
  "F14 | Core intelligence | Demand evidence research | Use free public evidence first; record method, date, population, limitations and confidence; a public search observation also records its source surface, search ecosystem, country, language, time window, the bound applied, and whether it was observed or inferred.",
  "F15 | Core intelligence | Supply visibility demand need separation | Measure content supply, reach, demand, audience need and worthiness independently; state demand as STRONG, MODERATE, WEAK, UNKNOWN or MONITOR — STRONG only when three independent evidence categories agree, MONITOR whenever required signals conflict, fewer than three categories exist or clicks are zero, and UNKNOWN when the evidence cannot support a conclusion.",
  "F16 | Core intelligence | SERP and answer-surface census | Observe result types, competitors, cited sources, questions, features and answer formats; research the public questions asked about the subject across its relevant countries and languages as a bounded sample, keeping observed questions apart from inferred suggestions and recording each one's source, time window, country, language and limits, without claiming to collect every question.",
  "F37 | Core intelligence | Best-answer architecture | Combine questions, search language, verified facts, evidence gaps and user journeys into one coherent resource; where no existing page should be improved instead, write it as one complete owner-reviewable draft with direct answers, clear structure, original value, visible sources and sound crawl and index eligibility.",
  "F38 | Core intelligence | Answer-first content specification | Place the useful answer early while remaining naturally keyword-aware and non-repetitive; wording is useful and engaging but truthful, never stating or implying more than its verified claims support and never promising indexing, ranking or AI citation.",
  "F42 | Advanced | Draft repair assistant | Diagnose and repair a draft while preserving claims, evidence state and owner approval boundaries; at most two repair rounds follow the initial draft, a round that reduces no named failure stops early, and a draft still failing after two is halted or parked with its exact blocker and never presented for approval.",
  "F44 | Foundation | Verified fact supply | Store reusable facts with claim, value, unit, scope, source, tier, checker, date, freshness and provenance; a capability claim about a product is product- and tenant-scoped, and one sourced from the product or its owner is marked SELF-SOURCED, holds no independent tier, never corroborates itself and never makes a capability verified.",
  "F50 | Core intelligence | Prompt and answer-question library | Maintain representative, versioned user questions by intent, locale and journey stage as a question-and-answer inventory in which each merged question keeps its original wording and holds two separate determinations: its answer, researched in approved, current, subject-scoped evidence with source and date, or UNKNOWN or DATA GAP where none supports it; and whether the declared product ADDRESSES, PARTIALLY ADDRESSES (naming the addressed and the unaddressed part) or DOES NOT ADDRESS it, judged only from independently verified product capabilities, or UNKNOWN where they cannot decide; unmet questions are kept as gaps and never answered on the product's behalf.",
  "F62 | Core intelligence | International and locale intelligence | Research genuine language, regulatory, cultural and search differences across the subject's relevant countries and languages without doorway-page multiplication; country-name substitution alone never justifies a separate URL."
];
const BEFORE = {"F01":"1748b770c0bddb60","F02":"9d3bc31f9c5ed63a","F03":"4c18284ea9ce9432","F04":"35fa86c408583d1b","F05":"49766bcd9fcb2bc4","F06":"301364750546b580","F07":"997fe93cfe4ba01e","F08":"bb1ce57d2f93bf4c","F09":"59ad397d7bc5c3c1","F10":"f7b08a7a050b8f43","F11":"f1f41efa529012f4","F12":"177a5239084699df","F13":"8de20f1065a22c8c","F14":"6d988d00e079f090","F15":"7d7783d24b1c76f9","F16":"b5f1612d16e44074","F17":"7087cbbe624d393a","F18":"80fac5b9e4b11358","F19":"7d160dda974c6936","F20":"8821c65c100fb0c7","F21":"fd807b2eaa570f40","F22":"6fbc1b4f11b1d5e1","F23":"e946c09bf61260c5","F24":"1ce5d2a57471f4a8","F25":"2d0177ceb9c91583","F26":"aad29acf34d1c42c","F27":"bf1d96f4f1ff5d64","F28":"3901556e8b3b8359","F29":"868d41af9080c705","F30":"26162028d183978b","F31":"0fd1d4c832855f42","F32":"ffc28a17240666cf","F33":"458c185987f3cd37","F34":"30fad1995e055faa","F35":"f12bccfa0405b153","F36":"82095c0a5a5a28e7","F37":"025fea718b836ad0","F38":"748e6a374e4ee865","F39":"467e292bf95735e0","F40":"f8557dbf9fb76554","F41":"b554423f57083f54","F42":"c93059a4d8fe1efb","F43":"6959e21d2cc473c3","F44":"63bf99012def7b50","F45":"87446985392914b4","F46":"2f2f8fef450e1a52","F47":"278c1aceb38e0a18","F48":"8c66df03235b1ecd","F49":"1175f5e79b0f7713","F50":"d429f508c8a652e6","F51":"2b1f9ac461a3230e","F52":"d304d70bd185a828","F53":"35e5a112bbdbec5f","F54":"3f976bcf33988749","F55":"1868d4828ab01a5d","F56":"acb23152bb3249c8","F57":"f61782e2889ed023","F58":"ca2ef141872e1787","F59":"ca025e906717d38b","F60":"c9d800e700290745","F61":"6fdb17fb9d221f03","F62":"144607e2d844d90c","F63":"8b9d6dfc16a182c4","F64":"2576737e0c5ec95b","F65":"dbe5c4c5aae2238c","F66":"113a465f7fbf4c80","F67":"c9d6f4b7a9b52a42","F68":"18a5d686f178210d","F69":"3e141ca885d0e4ef","F70":"26d0eeba1dc3976f","F71":"537da0495aa89701","F72":"0d28532420926fb0","F73":"01e25cd3d613a31a","F74":"bc7cee142b4cb4f7","F75":"134843d9631c934a","F76":"1d3b098e44da5dff","F77":"d0df9b307574a619","F78":"f16649c6d328f76f","F79":"f34ee5e267e8147b","F80":"93930914da6f703e","F81":"9d3a7153db863b1e","F82":"5ccad95a4f905f6d","F83":"bb4f564e8ecc945e","F84":"9a2daf4cf96d9a52","F85":"03b0d5596ba2ef18","F86":"5e616e0d3ea407ef","F87":"499094137be90e7d","F88":"7dd81393cf9c9c49","F89":"535e1d46041e87cc","F90":"38a78a7e03509bce"};
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

test("A2·1 · each amended row is the amendment's line, byte for byte", () => {
  assert.equal(AMENDED.length, 10);
  for (const line of AMENDED) {
    const [id, domain, name] = line.split(" | ");
    const row = CAPABILITIES.find((c) => c.id === id);
    assert.ok(row, `${id} missing`);
    assert.equal(row.lineSha256, sha(line), `${id} is not the amendment's line`);
    assert.deepEqual([row.domain, row.name], [domain, name]);
  }
});

test("A2·2 · no other row changed; exactly the ten amended rows differ from the amended_1 derivation", () => {
  /* Amendment 3 (RR-103, 30 Sep) APPENDED F91 after F90; this test is about the rows Amendment 2 touched, so it reads the rows BEFORE names
   * and requires that F91 is the one row outside them. */
  assert.deepEqual(CAPABILITIES.filter((c) => !(c.id in BEFORE)).map((c) => c.id), ["F91"]);
  const changed = CAPABILITIES.filter((c) => c.id in BEFORE && BEFORE[c.id] !== c.lineSha256.slice(0, 16)).map((c) => c.id);
  assert.deepEqual(changed, AMENDED.map((l) => l.slice(0, 3)));
  // CONTROL: the comparison can fail — a planted change to one untouched row is seen
  const planted = CAPABILITIES.map((c) => (c.id === "F01" ? { ...c, lineSha256: sha("planted") } : c));
  assert.ok(planted.filter((c) => BEFORE[c.id] !== c.lineSha256.slice(0, 16)).some((c) => c.id === "F01"));
});

test("A2·3 · Amendment 2 left ids and order unchanged: F01–F90 in order (Amendment 3 later appended F91); no F00, no F92, no F99", () => {
  assert.deepEqual(CAPABILITIES.slice(0, 90).map((c) => c.id), Array.from({ length: 90 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`));
  /* The absent-id control was F91 until Amendment 3 made F91 a row; it is RESTATED as F92, the id one past the last row
   * (test/spec-amendment-3.test.mjs proves the restatement fires). */
  for (const absent of ["F00", "F92", "F99"]) assert.equal(CAPABILITIES.some((c) => c.id === absent), false, `${absent} exists`);
});

test("A2·4 · F62 is Core intelligence now, and the generated list is pinned to the amended_2 extract the derivation names", () => {
  assert.equal(CAPABILITIES.find((c) => c.id === "F62").domain, "Core intelligence");
  assert.deepEqual({ ...EXTRACT_PROVENANCE }, { ...DERIVE_PROVENANCE });
  /* since Amendment 3 (RR-103) the derivation names the amended_3 extract, which carries Amendment 2's ten lines unchanged (A2·1) */
  assert.match(EXTRACT_PROVENANCE.path, /amended_3\.extract\.txt$/);
  assert.equal(EXTRACT_PROVENANCE.sha256, "179cb43a3a3dd59451eb5cac37ae54ccc112f2617d794d3974b805df164564f8");
});
