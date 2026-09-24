#!/usr/bin/env node
/**
 * 🔴 NO OET TEXT IN THE REPOSITORY — MEASURED BY HASHING IT, NEVER BY HOLDING IT.
 *
 * OET's Intellectual Property policy forbids keeping its content in any electronic
 * retrieval system, and an evidence store is one. This project had quoted five
 * phrases of that policy — in a fact's basis, the licence entry and two design
 * documents — while recording that very prohibition. They were removed on 13
 * September 2026.
 *
 * A census that looked for them would have to CONTAIN them, and would itself be the
 * breach. So each phrase is held only as the sha256 of its normalised words and its
 * word count: every tracked text file is normalised the same way, every window of
 * that many words is hashed, and a match is reported by file and position — never
 * by printing the words.
 *
 * ⚠️ WHAT IT CANNOT SEE: OET wording this repository never quoted, and so never
 * hashed; and git HISTORY — earlier commits still contain the five phrases, and
 * rewriting history is not this census's call. It proves the CURRENT TREE is clean
 * of the wording the repository is known to have held.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** sha256 of the lowercase words joined by single spaces — the only form in which the phrases are held. */
export const FORBIDDEN_PHRASE_HASHES = Object.freeze([
  { words: 8, sha256: "50f016c019a2c2d2910e709560b26dd6a058656be63425e8c6e694f164839733", what: "IP policy ground 1 (reproduction)" },
  { words: 6, sha256: "453b642eb3d175348fd79f43912fa4c733f9356c4c3146721e53ab6c01b03727", what: "IP policy ground 2 (commercial exploitation)" },
  { words: 11, sha256: "47259a183d075c34afdebc5ed9b5f30fb68396d3dc813dd659c389dada6cbdbc", what: "IP policy ground 3 (retrieval systems)" },
  { words: 8, sha256: "a329a83c984b5d49a17e1528b1bb016c3e52663b62cc680420c5ac556157b418", what: "IP policy carve-out (personal use)" },
  { words: 16, sha256: "854daeecff2648011448f90b5658929e9e31af5230113863af8af7fd5aa28442", what: "IP policy opening prohibition" },
]);

export const normaliseWords = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const BINARY = /\.(png|jpe?g|gif|br|gz|zip|pdf|docx|woff2?|ico)$/i;

/**
 * @param {object} [o]
 * @param {Array<{file:string,text:string}>} [o.sources]  injected sources — for the control, never a back door
 * @param {Array<{words:number,sha256:string,what:string}>} [o.hashes]
 */
export function forbiddenTextCensus({ repo = REPO, sources = null, hashes = FORBIDDEN_PHRASE_HASHES } = {}) {
  const files = sources ?? execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" }).split("\n").filter((f) => f && !BINARY.test(f)).map((file) => ({ file, text: null }));
  const lengths = [...new Set(hashes.map((h) => h.words))];
  const byKey = new Map(hashes.map((h) => [`${h.words}:${h.sha256}`, h]));
  const hits = [];
  let scanned = 0;
  for (const f of files) {
    let text = f.text;
    if (text === null) {
      try {
        text = readFileSync(`${repo}${f.file}`, "utf8");
      } catch {
        continue;
      }
    }
    scanned += 1;
    const words = normaliseWords(text);
    for (const n of lengths) {
      for (let i = 0; i + n <= words.length; i += 1) {
        const h = byKey.get(`${n}:${sha(words.slice(i, i + n).join(" "))}`);
        if (h) hits.push({ file: f.file, wordIndex: i, what: h.what });
      }
    }
  }
  return { scanned, phrases: hashes.length, hits };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const r = forbiddenTextCensus();
  console.log(`FORBIDDEN-TEXT CENSUS [bound: ${r.scanned} tracked text files · ${r.phrases} phrases held as hashes only]`);
  for (const h of r.hits) console.log(`  🔴 ${h.file} at word ${h.wordIndex} — ${h.what}`);
  console.log(r.hits.length ? `\n🔴 ${r.hits.length} occurrence(s) of stored subject wording` : "\n✅ no occurrence of the subject wording this repository had quoted");
  process.exit(r.hits.length ? 1 : 0);
}
