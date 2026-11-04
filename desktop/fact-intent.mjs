/**
 * 🔴 RR-370 A (owner, 4 Nov 2026: "Q&A mismatches have come back for days because the engine matches questions to facts by WORDS"). EVERY FACT CARRIES THE QUESTION IT ANSWERS: its intent, set where the fact is collected (the collector's own rule kind, the part it was gathered for, the subject page's key), and a fact is placed only under a question of that intent. Attestation is not good standing because it was collected as attestation, whatever words the two share. Pure.
 */
export const INTENTS = Object.freeze(["required-score", "good-standing", "registration", "who-registers", "documents", "fee", "venue", "results", "remark", "booking", "format", "grade", "validity", "other-tests", "eligibility", "preparation", "about", "other"]);
const RULE_KIND = Object.freeze({ attestation: "documents", documents: "documents", "good-standing": "good-standing", verification: "good-standing", registration: "registration", other: "other" });
const SUBJECT_KIND = [[/^results/, "results"], [/^remark/, "remark"], [/^(?:book|tip|changeFee)/, "booking"], [/^(?:scale|gradeB|gradeBands)$/, "grade"], [/GradeB$|^(?:listeningB|readingB)$/, "grade"], [/Marks$|Glance$|Words$|Minutes$|Roleplay$|PartA$|OtherDay$/, "format"], [/^(?:practiceEvery|sampleTests|benchmarkIelts)$/, "preparation"], [/^(?:recognised|professions12|purpose|notForOthers|contact)$/, "about"]];
const ruleKindOf = (key) => String(key ?? "").split("|")[2] ?? null;
/** the intent a fact was collected for; null when nothing says (the AI judge then decides on its first use) */
export function intentOfFact(f) {
  if (!f) return null; if (f.intent && INTENTS.includes(f.intent)) return f.intent;
  if (f.part === "rules" && f.key) return RULE_KIND[ruleKindOf(f.key)] ?? null;
  if (f.part === "fee") return "fee"; if (f.part === "centres") return "venue"; if (f.part === "home-council" || f.part === "open-council") return "who-registers";
  if (f.fact) { for (const [re, i] of SUBJECT_KIND) if (re.test(f.fact)) return i; }
  return null;
}
/** which facts a fixed part of a page may hold. A part not named here takes anything the judge lets stand */
export const PART_INTENTS = Object.freeze({ standing: ["good-standing"], documents: ["documents"], fee: ["fee"], otherfees: ["booking", "remark", "fee"], centres: ["venue", "booking"], results: ["results"], scores: ["required-score"], destinations: ["required-score"], council: ["who-registers"], councils: ["who-registers", "required-score"], regulator: ["who-registers", "registration"] });
const partOf = (part) => String(part ?? "").replace(/\d+$/, "");
/** a claim whose collected intent is known and is not what this part asks */
export const misplaced = (part, claim) => { const allowed = PART_INTENTS[partOf(part)], i = claim?.intent; return Boolean(allowed && i && !allowed.includes(i) && !claim.gap); };
/** the parts a page must keep: a question of ours, with an honest line when no fact fits. A question people asked goes instead */
export const FIXED_PART = /^(?:standing|regulator|council|councils|scores|destinations|fee|centres|others|results|writing|otherfees)\d*$/;
/** 🔴 RR-370: "How much does the test cost?" is the test's price. What a change or a re-mark costs is true, and has a question of its own */
export function splitOtherFees(pages, subject) { for (const p of pages ?? []) { const at = (p.items ?? []).findIndex((it) => it.part === "fee"); if (at < 0) continue; const it = p.items[at], other = (it.claims ?? []).filter((c) => c.intent === "booking" || c.intent === "remark"); if (!other.length) continue; p.items[at] = { ...it, claims: it.claims.filter((c) => !other.includes(c)) }; p.items.splice(at + 1, 0, { part: "otherfees", question: `How much does it cost to change an ${subject} booking or ask for a re-mark?`, claims: other }); } return pages; }
