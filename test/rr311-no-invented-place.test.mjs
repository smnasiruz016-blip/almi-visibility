/**
 * RR-311 (owner, testing Setup 1.3.7, 21 Oct 2026): "Templates add 'in Denmark' to every title … only because the channel's description says
 * Denmark — the video never says so. That is an invented fact: a place goes into a title ONLY if the video's own title, description or
 * transcript names it. Also: never build 'X: What Is It Really Like?' from a title that is not a topic (e.g. 'JAB WE MET'), and correct
 * obvious spelling in the original ('Togather' → 'Together')."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { optionsFor, boilerplateOf, gapFixes, spellFix, ownWords } from "../desktop/youtube-plan.mjs";

const vid = (id, title, o = {}) => ({ videoId: id, title, description: o.description ?? "", tags: [], publishedAt: "2026-09-01T00:00:00Z", durationSec: 900, width: 1280, height: 720, views: o.views ?? 100, comments: 0 });
const GREETING = "We are a Pakistani family living in Denmark, sharing our daily life.";
const VIDEOS = [
  vid("j1", "JAB WE MET | STRONG UZMA | Dhanak Ki Duniya", { views: 4575, description: GREETING }),
  vid("s1", "Jumping Sara", { views: 4036, description: `Sara jumps rope in the garden.\n${GREETING}` }),
  vid("t1", "I Cant Believe It Togather", { views: 3977, description: GREETING }),
  vid("c1", "Copenhagen zoo day", { views: 3000, description: `A day at the zoo with the kids.\n${GREETING}` }),
  vid("a1", "Ammi ka birthday | daily vlog", { views: 2000, description: `Aaj ammi ki salgirah hai, hum sab togather hain.\n${GREETING}` }),
];
const CTX = { channel: { title: "Dhanak Ki Duniya", handle: "@dhanakkiduniya", boilerplate: boilerplateOf(VIDEOS) }, persona: { who: "Pakistani Mom", whoFrom: "your channel's description", places: ["Denmark"] },
  niche: { queries: [{ q: "pakistani mom in denmark" }, { q: "family vlog" }] }, summary: null, readOn: "2026-10-21",
  questions: [{ text: "Which school is best for kids in Denmark?", source: "a comment", likes: 9 }] };
const all = (v) => optionsFor(v, CTX).options;
const text = (o) => [o.title, o.description, o.hashtags.join(" "), o.thumbnail].join("\n");

test("A PLACE ONLY WHEN THE VIDEO NAMES IT: the channel's home (from the channel's description, or the greeting every video carries) never goes into a title, description line, hashtag, thumbnail or viewer question of a video that does not name it", () => {
  for (const id of ["j1", "s1", "t1", "a1"]) for (const o of all(VIDEOS.find((v) => v.videoId === id))) {
    assert.doesNotMatch(text(o), /denmark/i, `${id}: "${o.title}" — a place the video never names`);
    assert.ok(!o.basedOn.some((b) => /your channel's home/.test(b)), "the channel's home still used");
  }
  assert.equal(all(VIDEOS[0])[0].title, "JAB WE MET | Pakistani Mom Vlog");
  /* the greeting every video carries is not this video's own words (it has no "welcome to" — only the greeting rule catches it) */
  assert.equal(ownWords(VIDEOS[0], CTX.channel).firstLine, null);
  /* nor does the greeting ("living in Denmark") make the video a "life abroad" video */
  for (const o of all(VIDEOS[0])) assert.doesNotMatch(`${o.title} ${o.hashtags.join(" ")} ${o.thumbnail} ${o.basedOn.join(" ")}`, /abroad|living/i, `the greeting decided the kind of video: ${o.title}`);
  assert.equal(all(VIDEOS[1])[0].title, "Jumping Sara | Pakistani Mom Vlog");
  /* the video names its place itself (its title, or a description line of its own) — then it is used, and said */
  const z = all(VIDEOS[3]);
  assert.match(z[0].title, /Copenhagen/); assert.ok(z[0].basedOn.includes("the place this video names (Copenhagen)"), JSON.stringify(z[0].basedOn));
  const own = optionsFor(vid("d1", "Grocery haul", { description: "Our weekly shopping in Odense, Denmark." }), CTX).options[0];
  assert.match(own.title, /Denmark|Odense/);
  /* the same rule in the action plan's ready text (it is made by the same options) */
  for (const g of Object.values(gapFixes(VIDEOS, CTX, {}))) for (const v of g.videos.filter((x) => x.videoId !== "c1")) for (const r of v.ready) assert.doesNotMatch(r.text, /denmark/i, `plan: ${v.title}`);
});

test("NO 'WHAT IS IT REALLY LIKE?' FROM A TITLE THAT IS NOT A TOPIC: a question is a viewer's own (not naming a place the video does not) or shaped for a kind of video it fits — else the option is the video's own words or the niche's", () => {
  for (const v of VIDEOS) for (const o of all(v)) assert.doesNotMatch(o.title, /What Is It Really Like/, `${v.title} → ${o.title}`);
  assert.ok(!all(VIDEOS[0]).some((o) => /school/i.test(o.title)), "a viewer's question about another topic and place used");
  /* a viewer's question that fits the video's words but names a place the video does not name is not used for it */
  const g = optionsFor(vid("g1", "Grocery haul | weekly shopping", { description: "Our weekly grocery shopping at the supermarket." }), { ...CTX, questions: [{ text: "Which supermarket is cheapest for a grocery haul in Denmark?", source: "a comment", likes: 12 }] }).options;
  assert.ok(g.every((o) => !/Denmark/.test(o.title)), JSON.stringify(g.map((o) => o.title)));
  assert.equal(all(VIDEOS[0]).length, 3, "fewer than 3 options");
});

test("OBVIOUS SPELLING IS CORRECTED, AND SAID — Roman Urdu is never touched", () => {
  const t = all(VIDEOS[2]);
  assert.equal(t[0].title, "I Cant Believe It Together | Pakistani Mom Vlog");
  assert.ok(t[0].basedOn.includes("spelling corrected: Togather → Together"), JSON.stringify(t[0].basedOn));
  assert.equal(spellFix("Happy Mew Year"), "Happy New Year");
  assert.equal(spellFix("TOGATHER"), "TOGETHER");
  assert.equal(spellFix("Ammi ka birthday, hum sab saath hain"), "Ammi ka birthday, hum sab saath hain");
  assert.equal(ownWords(VIDEOS[4], CTX.channel).firstLine, "Aaj ammi ki salgirah hai, hum sab together hain.");
});
