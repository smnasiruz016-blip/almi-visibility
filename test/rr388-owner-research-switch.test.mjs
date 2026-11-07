/**
 * RR-388 PART E · E4 the owner's own research document goes into the app and every line still goes through the truth pass; E1 the autopilot
 * switch as clear as "Create SEO pages" (Pages tab and Home).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { documentText, researchRows, addOwnerResearch, zipEntry } from "../desktop/owner-research.mjs";

/* a real .odt is a zip with content.xml: one written here (deflated), the way LibreOffice writes it */
function zipOf(files) {
  const locals = [], centrals = []; let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text, "utf8"), data = deflateRawSync(raw), n = Buffer.from(name, "utf8");
    const L = Buffer.alloc(30); L.writeUInt32LE(0x04034b50, 0); L.writeUInt16LE(20, 4); L.writeUInt16LE(8, 8); L.writeUInt32LE(data.length, 18); L.writeUInt32LE(raw.length, 22); L.writeUInt16LE(n.length, 26);
    const C = Buffer.alloc(46); C.writeUInt32LE(0x02014b50, 0); C.writeUInt16LE(20, 6); C.writeUInt16LE(8, 10); C.writeUInt32LE(data.length, 20); C.writeUInt32LE(raw.length, 24); C.writeUInt16LE(n.length, 28); C.writeUInt32LE(off, 42);
    locals.push(L, n, data); centrals.push(C, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals), E = Buffer.alloc(22); E.writeUInt32LE(0x06054b50, 0); E.writeUInt16LE(centrals.length / 2, 8); E.writeUInt16LE(centrals.length / 2, 10); E.writeUInt32LE(cd.length, 12); E.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, E]);
}
const ODT = zipOf({ mimetype: "application/vnd.oasis.opendocument.text", "content.xml": `<?xml version="1.0"?><office:document-content><office:body><office:text>
<text:p>1. Can an MDS graduate apply to sit the OET in Ghana?</text:p><text:p>Yes, dentistry is one of OET&apos;s 12 professions. Source: <text:a xlink:href="https://oet.com/test/oet-test">oet.com</text:a></text:p>
<text:p>Where is the Uganda council office for physiotherapists?</text:p><text:p>Google AI Overview: Plot 1, Kampala, near the British Council.</text:p>
<text:p>How do I book the OET in Kenya?</text:p><text:p>Book on OET&apos;s own site with a myOET account.</text:p>
<text:p>What does CORU ask of dietitians?</text:p><text:p>Grade B in three components and C+ in one. https://www.google.com/search?q=coru+oet</text:p>
</office:text></office:body></office:document-content>` });

test("E4 · a real .odt is read here (zip + deflate); each question with its page is kept; no page, an AI summary or a search page is refused, said", () => {
  assert.equal(zipEntry(ODT, "nope.xml"), null);
  const text = documentText("6_questions.odt", ODT); assert.match(text, /Can an MDS graduate apply/); assert.match(text, /OET's 12 professions/);
  const { rows, refused } = researchRows(text);
  assert.deepEqual(rows, [{ question: "Can an MDS graduate apply to sit the OET in Ghana?", answer: "Yes, dentistry is one of OET's 12 professions. oet.com", link: "https://oet.com/test/oet-test" }]);
  assert.deepEqual(refused.map((r) => r.why), ["an AI summary (for example a Google AI Overview) is never a source", "no page address: a line needs the page it came from", "a search-results page is never a source"]);
  assert.equal(documentText("x.pdf", Buffer.from("x")), null, "an unknown kind is refused, never guessed");
  assert.equal(researchRows("How long?\nAbout a week. https://chatgpt.com/share/abc").refused[0].why, "an AI assistant's answer is never a source");
});

test("E4 · a kept line joins the page that asks it UNCHECKED (not filled, not our own text): the truth pass decides; the source shown is the page", () => {
  const plan = { pages: [{ title: "OET in Ghana", items: [{ question: "Can an MDS graduate apply to sit the OET in Ghana?", claims: [] }] }] };
  const o = addOwnerResearch(plan, [{ question: "Can an MDS graduate apply to sit the OET in Ghana?", answer: "Dentistry is one of the 12.", link: "https://oet.com/test/oet-test", on: "2026-11-07" }, { question: "Nobody asks this?", answer: "x", link: "https://x.org/" }]);
  assert.deepEqual(o, { joined: 1, waiting: ["Nobody asks this?"] });
  const c = plan.pages[0].items[0].claims[0]; assert.equal(c.filled, undefined); assert.equal(c.ownProduct, undefined); assert.equal(c.source, "oet.com — its page"); assert.equal(c.research, true);
  addOwnerResearch(plan, [{ question: "Can an MDS graduate apply to sit the OET in Ghana?", answer: "Dentistry is one of the 12.", link: "https://oet.com/test/oet-test" }]); assert.equal(plan.pages[0].items[0].claims.length, 1, "the same line twice is one line");
  const tp = readFileSync(new URL("../desktop/truth-pass.mjs", import.meta.url), "utf8"); assert.match(tp, /!c\.filled [^;]*&& !c\.ownProduct/, "an unchecked line is judged (only judged or own lines are skipped)");
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.match(main, /if \(r\[2\] === "research\/document" && req\.method === "POST"\)/); assert.ok(main.indexOf("addOwnerResearch(exam") < main.indexOf("await factsStep(exam, quick, step);"));
  const ui = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8"); assert.match(ui, /id="handinfile" accept="\.json,application\/json,\.odt,\.docx,\.txt,\.md"/); assert.match(ui, /research\/document`, \{ name: f\.name, base64: b64 \}/);
  assert.match(readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8"), /"owner-research\.mjs"/);
});

test("E1 · the autopilot switch: a big coloured button next to Create SEO pages and on Home, with its state, last and next cycle in one line", () => {
  const ui = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");
  assert.match(ui, /\$\{on \? "Autopilot is ON — turn off" : "Turn autopilot on"\}<\/button>/); assert.match(ui, /class="big \$\{on \? "apon" : "apoff"\}"/);
  assert.match(ui, /last cycle: \$\{last \?/); assert.match(ui, /next cycle: \$\{esc\(next\)\}/);
  assert.match(ui, /if \(\$\("#topcreate"\)\) apSwitch\("pages"\);/); assert.match(ui, /apSwitch\("home"\); \/\/ RR-388 E1/);
  assert.match(ui, /\.big\.apon\{background:#1b7f3b/); assert.match(ui, /mode: on \? "review" : "autopilot"/, "the same switch the Autopilot box uses");
});
