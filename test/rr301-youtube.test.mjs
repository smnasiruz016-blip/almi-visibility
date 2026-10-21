/* RR-301 · YouTube for ANY client: the Studio export import, video SEO from recorded phrases and questions only, Q&A from the OWN channel's
 * transcript, VideoObject, a script from an article, the channel check and the monthly report's part. No key exists yet: the real run on the
 * pilot channels is DEFERRED (the owner adds the key before 9 Nov). Nothing reads youtube.com. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importStudioExport, youtubeApi, retainRaw, videoSeo, transcriptQA, videoObject, scriptFromArticle, channelCheck, youtubeForReport, KEY_NAME } from "../src/video/youtube.mjs";
import { monthlyReport } from "../src/report/monthly-report.mjs";
import { keyFactCards } from "../src/page/joined-page.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSV = readFileSync(join(REPO, "test/fixtures/rr301-studio-export.csv"), "utf8");
const PRODUCT = "https://prep.widgetry.example/guides/widgetry-exam-fee";
const PHRASES = [{ text: "widgetry licence exam fee", ref: "search_phrase:1" }, { text: "widgetry exam online", ref: "search_phrase:2" }, { text: "best pizza near me", ref: "search_phrase:3" }];
const QUESTIONS = [{ text: "How much does the Widgetry licence exam cost?", ref: "public_question:fee" }, { text: "Can I take the Widgetry licence exam online?", ref: "public_question:online" }, { text: "What is the capital of France?", ref: "public_question:x" }];
const TRANSCRIPT = [{ start: 0, text: "Hello and welcome." }, { start: 65, text: "The Widgetry licence exam costs WB$120 per sitting." }, { start: 160, text: "You can take the Widgetry licence exam online from home." }];

test("IMPORT: a YouTube Studio content export — its own columns; the Total row is not a video; a field the export lacks is not invented", () => {
  const imp = importStudioExport(CSV, { importedOn: "2026-10-20" });
  assert.equal(imp.ok, true);
  assert.deepEqual(imp.videos.map((v) => [v.videoId, v.views]), [["wdg00000001", 820], ["wdg00000002", 420]]);
  assert.match(imp.videos[0].description, /0:00 Introduction/);
  assert.deepEqual(imp.videos[0].tags, ["widgetry licence exam fee", "widgetry exam cost"]);
  /* the standard Studio export has no Description, Tags or Thumbnail text columns: those fields are undefined (NOT MEASURED), never "" */
  const bare = importStudioExport("Content,Video title,Views\nabc,A video,5\n", { importedOn: "2026-10-20" });
  assert.deepEqual([bare.videos[0].description, bare.videos[0].tags, bare.videos[0].thumbnailText], [undefined, undefined, undefined]);
  assert.match(importStudioExport("Name,Value\nx,1\n", { importedOn: "2026-10-20" }).why, /not a YouTube Studio content export/);
});

test("KEY BY NAME, NOTHING SCRAPED: with no key the API reader is DEFERRED, named; the module never reads youtube.com pages; raw data kept 30 days", () => {
  const api = youtubeApi({ env: {} });
  assert.equal(api.state, "DEFERRED");
  assert.match(api.why, new RegExp(`\\(${KEY_NAME}\\)`));
  const src = readFileSync(join(REPO, "src/video/youtube.mjs"), "utf8");
  assert.doesNotMatch(src.replace(/watch\?v=\$\{[^}]+\}/g, ""), /fetch[^;]*youtube\.com|https:\/\/www\.youtube\.com\/(channel|c\/|@|results|feed)/, "a youtube.com page is read");
  assert.doesNotMatch(src, /console\.(log|error)\([^)]*key\b/i, "the key could be printed");
  const now = Date.parse("2026-10-20T00:00:00Z");
  assert.deepEqual(retainRaw([{ recorded_at: "2026-10-01T00:00:00Z" }, { recorded_at: "2026-09-10T00:00:00Z" }], now).length, 1);
});

test("VIDEO SEO: title, description, tags and chapters ONLY from recorded phrases and questions (chapters at the transcript's own times); nothing invented", () => {
  const [, tips] = importStudioExport(CSV, { importedOn: "2026-10-20" }).videos;
  const v = { videoId: "v1", title: "Widgetry licence exam explained", description: "" };
  const s = videoSeo(v, { phrases: PHRASES, questions: QUESTIONS, transcript: TRANSCRIPT, productUrl: PRODUCT });
  assert.deepEqual(s.tags, ["widgetry licence exam fee", "widgetry exam online"], "a tag is not a recorded phrase about the video");
  assert.equal(s.title.from, "search_phrase:1");
  assert.deepEqual(s.chapters.suggest, ["0:00 Introduction", "1:05 How much does the Widgetry licence exam cost?", "2:40 Can I take the Widgetry licence exam online?"]);
  assert.ok(s.description.suggest.includes(PRODUCT) && !/France|pizza/.test(JSON.stringify(s)));
  assert.equal(s.invented, 0);
  /* a video no record is about: everything kept, said so */
  const none = videoSeo(tips, { phrases: PHRASES, questions: QUESTIONS });
  assert.deepEqual([none.tags.length, none.title.keep], [0, "Exam day tips"]);
  assert.match(none.title.why, /no recorded search phrase or question/);
});

test("Q&A FROM A TRANSCRIPT: the OWN channel only; each answer is the transcript's own sentence, with its source (the video at its time) and date — and the page builder's card check takes it", () => {
  const v = { videoId: "wdg00000001", title: "How much does the Widgetry licence exam cost?" };
  assert.match(transcriptQA({ video: v, transcript: TRANSCRIPT, questions: QUESTIONS, ownChannel: false, channelTitle: "Widgetry", readOn: "2026-10-20" }).why, /OWN channel only/);
  const r = transcriptQA({ video: v, transcript: TRANSCRIPT, questions: QUESTIONS, ownChannel: true, channelTitle: "Widgetry Co", readOn: "2026-10-20" });
  assert.equal(r.items.length, 2);
  const [fee] = r.items;
  assert.equal(fee.claims[0].text, "The Widgetry licence exam costs WB$120 per sitting.");
  assert.equal(fee.claims[0].link, "https://www.youtube.com/watch?v=wdg00000001&t=65s");
  assert.match(fee.claims[0].source, /Widgetry Co on YouTube — ".*" at 1:05/);
  const cards = keyFactCards({ facts: [{ claimId: fee.claims[0].claimId, value: "WB$120" }], items: r.items, quotationOf: (id) => r.items.flatMap((i) => i.claims).find((c) => c.claimId === id)?.quotation });
  assert.equal(cards.cards.length, 1, "the page builder refused the video's own fact");
});

test("VIDEOOBJECT, SCRIPT, CHANNEL CHECK and the MONTHLY REPORT — no score derived; what the data lacks is NOT MEASURED", () => {
  const imp = importStudioExport(CSV, { importedOn: "2026-10-20" });
  const [a, b] = imp.videos;
  const vo = videoObject({ ...a, publishedAt: "2026-10-01" }, { embedUrl: "https://www.youtube-nocookie.com/embed/wdg00000001" });
  assert.deepEqual([vo.jsonLd["@type"], vo.jsonLd.duration], ["VideoObject", "PT5M12S"]);
  assert.match(videoObject(b, { embedUrl: "x" }).why, /needs the video's name, description and upload date/);
  const sc = scriptFromArticle({ question: "Can I take the exam online?", url: "https://x.example/a", items: [{ claims: [{ text: "It can be taken online.", link: "https://board.example/o", source: "The board", readOn: "2026-10-18" }] }] });
  assert.match(sc.lines.join("\n"), /\(on screen: Source — The board, checked 2026-10-18\)/);
  assert.match(sc.note, /does not make the video/);
  const check = channelCheck(imp.videos, { productUrl: PRODUCT });
  assert.deepEqual(check[0].findings, []);
  /* RR-306 B6: the link check names the page it expected */
  assert.deepEqual(check[1].findings, ["no description", "no text on the thumbnail", `no link to your product's page (${PRODUCT})`]);
  const bare = channelCheck(importStudioExport("Content,Video title\nabc,A video\n", { importedOn: "x" }).videos, { productUrl: PRODUCT });
  assert.deepEqual([bare[0].findings.length, bare[0].notMeasured.length], [0, 4], "a field the data lacks became a finding");
  const yt = youtubeForReport(imp, check);
  const rep = monthlyReport({ product: "Widgetry Prep (test project)", month: "October 2026", youtube: yt }).lines.join("\n");
  assert.match(rep, /## YouTube\n- YouTube \(your Studio export, 2026-10-20\): 2 video\(s\), 1240 views in the export\./);
  assert.match(monthlyReport({ product: "x", month: "m" }).lines.join("\n"), /YouTube: NOT CONNECTED .* \(this is not zero\)/);
  assert.doesNotMatch(JSON.stringify(yt), /score/i);
});
