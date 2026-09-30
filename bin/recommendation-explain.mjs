#!/usr/bin/env node
/**
 * F73 · RECOMMENDATION EXPLAINABILITY — every recorded recommendation's seven fields, each RECORDED or NOT MEASURED; count-only.
 *
 *   node bin/recommendation-explain.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched or written
 *
 * 🔴 An absent cost or reversibility stays NOT MEASURED — never estimated or filled (RR-97). Explainer: src/report/recommendation-explain.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { readRecommendationExplanations } from "../src/report/recommendation-explain-reader.mjs";

scopedEntryPoint({ entry: "bin/recommendation-explain.mjs", governed: false, resources: [RESOURCES.runArtefacts("audit findings"), RESOURCES.evidenceStore()] });

const r = readRecommendationExplanations();
const e = r.explanation;
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F73 · RECOMMENDATION EXPLAINABILITY — recorded data only, count-only");
console.log(`  bound            ${r.bound}`);
for (const [k, v] of Object.entries(e.perField)) console.log(`  ${k.padEnd(16)} recorded ${v.recorded} · NOT MEASURED ${v.notMeasured}`);
console.log(`  references       ${e.references} linked · broken ${e.broken}`);
console.log(`  verdicts         ${fmt(e.verdicts)} — an explanation missing any field is never presented as complete`);
