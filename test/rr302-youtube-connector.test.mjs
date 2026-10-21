/* RR-302 C1 · the client's YouTube connector is WIRED: with a key (a FAKE one, in this test only) and the subject's declared YOUTUBE_DATA_API
 * connector, bin/youtube-channel.mjs reads the channel end to end — channels → uploads → videos, through the opened connector's paced,
 * origin-limited fetch — and prints the channel check. Every API answer is REPLAYED here from fixture files (no-egress preload): nothing
 * leaves the machine. Without the key it is DEFERRED, named; the key never appears in any output. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { CONNECTOR_KINDS } from "../src/tenancy/root-registry.mjs";
import { youtubeReaderFrom, KEY_NAME } from "../src/video/youtube.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const SUBJECT = "fixture-channel", SITE = "https://fixture-channel.invalid", API = "https://www.googleapis.com";
const FAKE_KEY = "fake-test-key-rr302-not-a-secret";
const href = (path, params) => { const u = new URL(`${API}/youtube/v3/${path}`); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); u.searchParams.set("key", FAKE_KEY); return u.href; };

test("C1 · the YOUTUBE_DATA_API kind exists, and the reader refuses any other connector or one with no credential name", () => {
  assert.ok(CONNECTOR_KINDS.includes("YOUTUBE_DATA_API"));
  assert.equal(youtubeReaderFrom({ kind: "PUBLIC_SITE", credentialName: KEY_NAME, fetch: () => {} }).state, "REFUSED");
  assert.equal(youtubeReaderFrom({ kind: "YOUTUBE_DATA_API", credentialName: null, fetch: () => {} }).state, "REFUSED");
  assert.equal(youtubeReaderFrom({ kind: "YOUTUBE_DATA_API", credentialName: KEY_NAME, fetch: () => {} }, { env: {} }).state, "DEFERRED");
});

test("C1 · END TO END: a fake key + the declared connector → the channel's videos read through the API (replayed), the channel check printed; no key → DEFERRED; the key is never printed", () => {
  /* the connector's reach (the API's origin) is attached to the tenant, as a client's declared API connection is (QUESTION_SOURCE_API's) */
  const W = declaredWorld({ extra: [["SITE_ORIGIN", SITE], ["SITE_ORIGIN", API]] });
  const dir = mkdtempSync(join(tmpdir(), "rr302-yt-"));
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    mkdirSync(join(W.root, SUBJECT), { recursive: true });
    reg.subjects.push({ subjectId: SUBJECT, path: SUBJECT, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: SITE }],
      connectors: [{ connectorId: "youtube", kind: "YOUTUBE_DATA_API", credential: { mechanism: "ENV_REFERENCE", name: KEY_NAME }, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: API }] }] });
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    /* the three API answers, shaped as the YouTube Data API v3 answers them */
    const put = (name, body) => { const p = join(dir, name); writeFileSync(p, JSON.stringify(body)); return p; };
    const replay = {
      /* RR-306: the exact-handle lookup asks for the statistics too (the confirmation shows them) */ [href("channels", { part: "snippet,statistics,contentDetails", forHandle: "@fixture-channel" })]: put("channels.json", { items: [{ id: "UCfixturechannel01", contentDetails: { relatedPlaylists: { uploads: "UUfixturechannel01" } }, snippet: { customUrl: "@fixture-channel", title: "Fixture Channel" } }] }),
      [href("playlistItems", { part: "contentDetails", playlistId: "UUfixturechannel01", maxResults: "50" })]: put("playlist.json", { items: [{ contentDetails: { videoId: "fixv0000001" } }, { contentDetails: { videoId: "fixv0000002" } }] }),
      /* RR-306: the player size tells a Short from a long video */ [href("videos", { part: "snippet,contentDetails,statistics,player", id: "fixv0000001,fixv0000002", maxHeight: "360" })]: put("videos.json", { items: [
        { id: "fixv0000001", snippet: { title: "How the fixture pump is fitted", description: `0:00 Start\n1:10 Fitting\n2:30 Testing\nMore: ${SITE}/fit`, tags: ["pump fitting"], publishedAt: "2026-10-01T00:00:00Z", channelTitle: "Fixture Channel" }, contentDetails: { duration: "PT4M5S" }, statistics: { viewCount: "120" } },
        { id: "fixv0000002", snippet: { title: "Questions", description: "", publishedAt: "2026-10-08T00:00:00Z", channelTitle: "Fixture Channel" }, contentDetails: { duration: "PT1M" }, statistics: { viewCount: "30" } },
      ] }),
    };
    const map = join(dir, "replay.json");
    writeFileSync(map, JSON.stringify(replay));
    const log = join(dir, "egress.json");
    const run = (env, ...extra) => spawnSync(process.execPath, ["--import", PRELOAD, "bin/youtube-channel.mjs", ...W.argv([`--subject=${SUBJECT}`, "--channel=@fixture-channel", "--on=2026-10-20", `--product-url=${SITE}/fit`, ...extra])],
      { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), NO_EGRESS_MODE: "replay", NO_EGRESS_REPLAY: map, NO_EGRESS_LOG: log, ...env } });
    /* without --live: the plan only, no request */
    const plan = run({});
    assert.equal(plan.status, 0, plan.stdout + plan.stderr);
    assert.match(plan.stdout, /NOT RUN — no --live/);
    assert.equal(JSON.parse(readFileSync(log, "utf8")).fetch, 0);
    /* no key: DEFERRED, named — and still no request */
    const noKey = run({ [KEY_NAME]: "" }, "--live", "--confirm");
    assert.equal(noKey.status, 0, noKey.stdout + noKey.stderr);
    assert.match(noKey.stdout, new RegExp(`DEFERRED — no YouTube Data API key in the environment \\(${KEY_NAME}\\)`));
    assert.equal(JSON.parse(readFileSync(log, "utf8")).fetch, 0);
    /* with the fake key: the three API requests, all to the API's origin, all answered from the fixtures */
    const ok = run({ [KEY_NAME]: FAKE_KEY }, "--live", "--confirm");
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const egress = JSON.parse(readFileSync(log, "utf8"));
    assert.deepEqual([egress.fetch, egress.replayed, Object.keys(egress.hosts)], [3, 3, ["www.googleapis.com"]]);
    assert.match(ok.stdout, /videos {11}2 read through the API/);
    /* RR-306 B7 (owner, 21 Oct 2026): "read with your API key", never "in the export"; B6: the link check names the page it expected */
    assert.match(ok.stdout, /YouTube \(read with your API key, 2026-10-20\): 2 video\(s\), 150 views in total\./);
    assert.match(ok.stdout, /Video "Questions": no description; no link to your product's page \(https:\/\/fixture-channel\.invalid\/fit\)/);
    assert.ok(!(ok.stdout + ok.stderr + noKey.stdout + noKey.stderr).includes(FAKE_KEY), "the key was printed");
  } finally {
    W.cleanup();
  }
});
