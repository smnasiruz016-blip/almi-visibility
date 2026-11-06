/**
 * RR-381 (owner, 6 Nov 2026: "ALL SEO, wave 2"): reviews and reputation, images, video, Pinterest, podcasts, brand facts (entity), news and
 * Discover, backlinks, shop and marketplaces; one monthly report of every kind; the AI Overview 40101 retry; the first screen and the Guide.
 * Every answer here is the services' DOCUMENTED shape (docs.dataforseo.com, Wikidata's API, Apple's Search API, Anthropic's Messages API);
 * nothing is paid and nothing leaves this machine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { trustpilotDomain, tripadvisorPath, businessReviewRows, businessSummary, pastedReviews, reputation, requestTexts, reviewWidget, imagesOf, imageLines, imageSitemap, imageObjectLd, altFromImage,
  videosOf, videoLines, vttCues, chapterFaults, videoObjectLd, videoSitemap, pinFaults, feedOf, podcastLines, podcastEpisodeLd, appleShowOf, siteEntity, wikidataMatch, entityLines, articleOf, newsLines, newsSitemap,
  linkGroups, linkIdeas, scLinkingSites, compareSites, disavowText, outreachFaults, feedRows, feedLines, productPageLines, amazonAsin, amazonListingOf, amazonRank, listingLines, listingFaults, RULES } from "../desktop/seo-more.mjs";
import { seoJobs, JOB_IDS, AIO_UNREAD } from "../desktop/seo-jobs.mjs";
import { MORE_IDS } from "../desktop/seo-jobs-more.mjs";
import { SEO_KINDS, SEO_KINDS_OPEN } from "../desktop/next-step.mjs";
import { FEATURES } from "../desktop/features.mjs";
import { guideList } from "../desktop/guides.mjs";
import { monthReport } from "../desktop/seo-pages.mjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = (url, html) => ({ url, html, title: /<title>([^<]*)/.exec(html)?.[1] ?? "", description: "", h1: "", text: html.replace(/<[^>]+>/g, " ") });
const res = (o, status = 200, headers = {}) => ({ ok: status < 400, status, json: async () => o, text: async () => (typeof o === "string" ? o : JSON.stringify(o)), headers: { get: (k) => headers[k.toLowerCase()] ?? null } });

/* ── reviews ── */
test("REVIEWS: Trustpilot and Tripadvisor links are read; DataForSEO's documented review items; one score weighted by each source's own total", () => {
  assert.equal(trustpilotDomain("https://uk.trustpilot.com/review/www.example.co.uk?page=2"), "www.example.co.uk");
  assert.equal(trustpilotDomain("example.com"), "example.com"); assert.equal(trustpilotDomain("not a domain"), null);
  assert.equal(tripadvisorPath("https://www.tripadvisor.co.uk/Restaurant_Review-g186338-d1234567-Reviews-Example-London_England.html"), "Restaurant_Review-g186338-d1234567-Reviews-Example-London_England.html");
  assert.equal(tripadvisorPath("https://www.tripadvisor.com/Tourism-g186338"), null);
  const result = [{ title: "Example", reviews_count: 900, rating: { value: 4.6, rating_max: 5 }, items: [{ review_id: "a", rating: { value: 2 }, review_text: "Slow delivery", timestamp: "2026-10-01 10:00:00 +00:00", user_profile: { name: "Ann" }, responses: [] }, { review_id: "b", rating: { value: 5 }, review_text: "Great", responses: [{ text: "Thanks" }] }] }];
  const rows = businessReviewRows(result); assert.equal(rows.length, 2); assert.equal(rows[0].name, "Ann"); assert.equal(rows[1].answered, true);
  const r = reputation([{ source: "Trustpilot", rows, summary: businessSummary(result) }, { source: "Google", rows: [{ stars: 3, text: "ok", answered: false }], summary: { rating: 3.0, total: 100 } }]);
  assert.equal(r.count, 1000); assert.equal(r.score, Math.round(((4.6 * 900 + 3 * 100) / 1000) * 10) / 10); assert.equal(r.unanswered, 2);
  const p = pastedReviews("Facebook | 1 | Rude staff\n4 | fine\nno stars here"); assert.deepEqual(p.map((x) => [x.source, x.stars]), [["Facebook", 1], ["pasted", 4], ["pasted", null]]);
});
test("REVIEWS: request texts ask everyone and offer nothing; the widget carries the date and no self-served review markup", () => {
  const t = requestTexts({ name: "Café X", link: "https://g.page/r/x" }).map((x) => x.text).join(" ");
  assert.doesNotMatch(t, /discount|free|gift|voucher|only if|5 star|five star/i); assert.match(t, /honest/i);
  const w = reviewWidget({ name: "Café X", score: 4.4, count: 120, bySource: [{ source: "Google", average: 4.4, count: 120 }], on: "2026-11-06" });
  assert.match(w, /2026-11-06/); assert.doesNotMatch(w, /AggregateRating|ld\+json/);
});

/* ── images ── */
test("IMAGES: alt, meaningless names, size, format and width/height each say their fix; the sitemap and ImageObject hold only given facts", () => {
  const p = page("https://ex.com/a", '<img src="/img/IMG_1234.JPG"><img src="/red-wool-scarf.webp" alt="A red wool scarf" width="400" height="300"><img src="/d.png" alt="" role="presentation" width="1" height="1">');
  const imgs = imagesOf(p); assert.equal(imgs.length, 3); assert.equal(imgs[0].src, "https://ex.com/img/IMG_1234.JPG");
  const l = imageLines(imgs, { "https://ex.com/img/IMG_1234.JPG": 900 * 1024 }), bad = l.filter((x) => x.ok === false).map((x) => x.area);
  for (const a of ["Alt text", "File name", "Size", "Width and height"]) assert.ok(bad.includes(a), a);
  assert.ok(!l.some((x) => x.ok === false && /red-wool-scarf/.test(x.line)), "a good image is not flagged");
  assert.match(imageSitemap(imgs), /<image:loc>https:\/\/ex\.com\/red-wool-scarf\.webp<\/image:loc>/);
  assert.equal(imageObjectLd({ src: "x" }), null, "no owner, no licence: no markup (never a made-up creator)");
  assert.match(imageObjectLd({ src: "https://ex.com/a.jpg", creator: "Ex Ltd" }), /"creditText": "Ex Ltd"/);
});
test("IMAGES: alt text is written by Sonnet looking at the image (Anthropic image input by URL); 'image of' and long text are refused", async () => {
  let sent = null; const fetchImpl = async (u, i) => { sent = JSON.parse(i.body); return res({ model: "claude-sonnet-5-5", usage: { input_tokens: 900, output_tokens: 30 }, content: [{ type: "text", text: JSON.stringify({ alt: "A red wool scarf folded on a table", decorative: false }) }] }); };
  const r = await altFromImage({ key: "k", imageUrl: "https://ex.com/a.jpg", fetchImpl });
  assert.equal(r.alt, "A red wool scarf folded on a table"); assert.equal(sent.model, "claude-sonnet-5-5"); assert.deepEqual(sent.messages[0].content[0], { type: "image", source: { type: "url", url: "https://ex.com/a.jpg" } });
  const bad = await altFromImage({ key: "k", imageUrl: "x", fetchImpl: async () => res({ content: [{ type: "text", text: JSON.stringify({ alt: "Image of a scarf", decorative: false }) }] }) }); assert.ok(bad.fail);
});

/* ── video ── */
test("VIDEO: a site video without VideoObject or captions is said; markup needs Google's three fields; chapters must start on real captions", () => {
  const p = page("https://ex.com/v", '<video src="/v.mp4" poster="/p.jpg"></video><iframe src="https://www.youtube.com/embed/abc"></iframe>');
  const v = videosOf(p); assert.equal(v.videos.length, 2);
  const l = videoLines(p, v); assert.ok(l.some((x) => x.area === "Video markup" && x.ok === false)); assert.ok(l.some((x) => x.area === "Transcript" && x.ok === false));
  const ld = page("https://ex.com/w", `<script type="application/ld+json">${JSON.stringify({ "@type": "VideoObject", name: "How to", thumbnailUrl: "t.jpg" })}</script>`);
  assert.match(videoLines(ld, videosOf(ld)).find((x) => x.ok === false).line, /uploadDate/);
  const cues = vttCues("WEBVTT\n\n00:00.000 --> 00:05.000\nHello\n\n00:30.000 --> 00:35.000\nStep one\n\n01:10.500 --> 01:15.000\nStep two");
  assert.deepEqual(cues.map((c) => c.start), [0, 30, 70]);
  assert.deepEqual(chapterFaults([{ start: 0, title: "Intro" }, { start: 30, title: "Step one" }], cues), []);
  assert.ok(chapterFaults([{ start: 5, title: "x" }, { start: 31, title: "y" }], cues).length >= 2);
  assert.deepEqual(chapterFaults([{ start: 30, title: "Step one" }, { start: 70, title: "Step two" }], cues), ["the first chapter does not start at 0"], "real cue starts, but the video's start is missing");
  assert.deepEqual(videoObjectLd({ name: "x" }).needs, ["thumbnailUrl", "uploadDate"]);
  const ok = videoObjectLd({ name: "How to", thumbnailUrl: "https://ex.com/t.jpg", uploadDate: "2026-10-01", contentUrl: "https://ex.com/v.mp4", pageUrl: "https://ex.com/v", chapters: [{ start: 0, title: "Intro" }, { start: 30, title: "Step one" }] });
  assert.match(ok.json, /"@type": "Clip"/); assert.match(videoSitemap([{ page: "https://ex.com/v", name: "How to", thumbnailUrl: "t", contentUrl: "c" }]), /<video:content_loc>c<\/video:content_loc>/);
});

/* ── pinterest, podcast ── */
test("PINTEREST: Pinterest's own 100-character title limit (with its page); a number the page lacks or a promise is refused", () => {
  const p = { title: "Wool scarves", description: "", text: "Hand-knitted wool scarves in 3 colours." };
  assert.deepEqual(pinFaults({ title: "Hand-knitted wool scarves", description: "Three colours of soft wool." }, p), []);
  const f = pinFaults({ title: "x".repeat(101), description: "Guaranteed 50% warmer" }, p).join(" ");
  assert.match(f, /101 characters/); assert.match(f, /50/); assert.match(f, /promise/);
  assert.equal(RULES.pinterest.title, 100); assert.match(RULES.pinterest.url, /pinterest\.com/);
});
test("PODCAST: the feed's own tags; missing descriptions and transcripts; PodcastEpisode from the feed; Apple by its documented Search answer", () => {
  const xml = `<rss><channel><title>Exam Talk</title><description>About exams</description><itunes:author>Ann</itunes:author><itunes:image href="https://ex.com/a.jpg"/><itunes:category text="Education"/><language>en</language>
<item><title>Ep 1</title><description>short</description><pubDate>Tue, 01 Oct 2026 10:00:00 GMT</pubDate><enclosure url="https://ex.com/1.mp3"/></item>
<item><title>How to prepare for the speaking test</title><description><![CDATA[${"A long description. ".repeat(10)}]]></description><podcast:transcript url="https://ex.com/2.vtt" type="text/vtt"/></item></channel></rss>`;
  const f = feedOf(xml); assert.equal(f.show.title, "Exam Talk"); assert.equal(f.episodes.length, 2); assert.equal(f.episodes[1].transcript, "https://ex.com/2.vtt");
  const l = podcastLines(f); assert.ok(l.some((x) => x.area === "Episodes" && /1 of 2/.test(x.line))); assert.ok(l.some((x) => x.area === "Transcripts" && x.ok === false)); assert.ok(l.some((x) => /only a number/.test(x.line)));
  assert.match(podcastEpisodeLd(f.episodes[0], f.show), /"datePublished": "2026-10-01"/);
  assert.equal(appleShowOf({ results: [{ collectionName: "Other", feedUrl: "https://x/y" }, { collectionName: "Exam Talk", feedUrl: "https://ex.com/feed/", collectionViewUrl: "https://podcasts.apple.com/x" }] }, "https://ex.com/feed", "x").collectionViewUrl, "https://podcasts.apple.com/x");
});

/* ── entity ── */
test("ENTITY: the site's own Organization markup and sameAs; Wikidata's item is ours only when its official website (P856) is our domain", () => {
  const s = siteEntity(page("https://ex.com/", `<title>Ex | Home</title><script type="application/ld+json">${JSON.stringify({ "@type": "Organization", name: "Ex", url: "https://ex.com", sameAs: ["https://www.linkedin.com/company/ex"] })}</script>`));
  assert.equal(s.name, "Ex"); assert.deepEqual(s.sameAs, ["https://www.linkedin.com/company/ex"]);
  const j = { entities: { Q1: { id: "Q1", labels: { en: { value: "Ex" } }, claims: { P856: [{ mainsnak: { datavalue: { value: "https://other.org" } } }] } }, Q2: { id: "Q2", labels: { en: { value: "Ex Ltd" } }, claims: { P856: [{ mainsnak: { datavalue: { value: "https://www.ex.com/" } } }] } } } };
  const w = wikidataMatch(j, "ex.com"); assert.equal(w.item.id, "Q2"); assert.equal(w.candidates[0].id, "Q1");
  const l = entityLines({ site: s, sameAsOpen: { "https://www.linkedin.com/company/ex": false }, wikidata: w, brand: "Ex", domain: "ex.com" });
  assert.ok(l.some((x) => /does not open/.test(x.line))); assert.ok(l.some((x) => /Wikidata's label is "Ex Ltd"/.test(x.line))); assert.ok(l.some((x) => /does not link to your Wikidata item/.test(x.line)));
  const refused = entityLines({ site: s, sameAsOpen: { "https://uk.linkedin.com/company/ex": null, "pinterest.co.uk/ex": false }, wikidata: w, brand: "Ex", domain: "ex.com" });
  assert.equal(refused.find((x) => /linkedin/.test(x.line)).ok, null, "RR-381 proof: LinkedIn's 999 to readers is never 'broken'");
  assert.match(refused.find((x) => /pinterest/.test(x.line)).solution, /full address, starting with https/);
  const none = entityLines({ site: s, wikidata: { item: null, candidates: [] }, brand: "Ex", domain: "ex.com" }).find((x) => x.area === "Wikidata");
  assert.match(none.solution, /never add a fact you cannot source/); assert.match(none.solution, /Notability/);
});

/* ── news ── */
test("NEWS: Article markup, author url, large previews, image width (Google's 1200 px, with its page), clickbait; the news sitemap keeps only 2 days", () => {
  const a = articleOf(page("https://ex.com/n", `<title>You won't believe this exam!!</title><script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: "You won't believe this exam!!", image: { url: "i.jpg", width: 800 }, datePublished: "2026-11-05T10:00:00Z", author: { "@type": "Person", name: "Ann" } })}</script>`));
  const l = newsLines(a), bad = l.filter((x) => x.ok === false).map((x) => x.area);
  for (const k of ["Author", "Discover", "Honest title"]) assert.ok(bad.includes(k), k);
  assert.ok(l.some((x) => /800 px/.test(x.line)));
  const sm = newsSitemap([a, { ...a, url: "https://ex.com/old", published: "2026-10-01T00:00:00Z" }], { name: "Ex News", language: "en", now: Date.parse("2026-11-06T12:00:00Z") });
  assert.equal(sm.count, 1); assert.match(sm.xml, /<news:name>Ex News<\/news:name>/); assert.equal(RULES.newsSitemap.days, 2);
});

/* ── backlinks ── */
test("BACKLINKS: DataForSEO's documented items → new, lost, suspicious; link ideas from domain_intersection; Search Console exports compared; disavow only after a manual action", () => {
  const items = [{ url_from: "https://a.com/x", domain_from: "a.com", url_to: "https://me.com", anchor: "me", dofollow: true, first_seen: "2026-10-20 00:00:00 +00:00", is_lost: false, backlink_spam_score: 3 }, { url_from: "https://b.com/y", domain_from: "b.com", first_seen: "2025-01-01", is_lost: true, backlink_spam_score: 1 }, { url_from: "https://spam.xyz/z", domain_from: "spam.xyz", first_seen: "2024-01-01", is_lost: false, backlink_spam_score: 88 }];
  const g = linkGroups([{ items }], { today: "2026-11-06" }); assert.deepEqual([g.fresh.length, g.lost.length, g.suspicious.length], [1, 1, 1]);
  const ideas = linkIdeas([{ items: [{ domain_intersection: { 1: { target: "blog.org", rank: 40, backlinks_spam_score: 2 }, 2: { target: "blog.org", rank: 40, backlinks_spam_score: 2 } }, summary: { intersections_count: 2 } }, { domain_intersection: { 1: { target: "junk.biz", rank: 5, backlinks_spam_score: 90 } } }] }]);
  assert.deepEqual(ideas.map((i) => [i.domain, i.competitors]), [["blog.org", 2]], "a spammy site is never an idea");
  assert.deepEqual(scLinkingSites('Site,Linking pages\n"www.a.com",3\nb.org,1\n'), ["a.com", "b.org"]);
  assert.deepEqual(compareSites(["a.com", "c.net"], ["a.com", "b.org"]), { fresh: ["b.org"], lost: ["c.net"] });
  assert.match(disavowText(g.suspicious), /manual action[\s\S]*domain:spam\.xyz/);
  assert.match(outreachFaults({ subject: "Hi", body: "We can pay $50 for a link" }, { title: "", description: "", text: "" }).join(" "), /offers something|50/);
});

/* ── shop ── */
test("SHOP: a Merchant Center feed is checked against Google's own product data rules (with the page); product markup; Amazon's documented items; listing advice never adds a fact", () => {
  const tsv = "id\ttitle\tdescription\tlink\timage_link\tavailability\tprice\tbrand\tgtin\n1\tScarf\tWool\thttps://ex.com/1\thttps://ex.com/1.jpg\tin_stock\t15.00 USD\tEx\t0123456789012\n2\t" + "T".repeat(151) + "\t\thttps://ex.com/2\t\tavailable\t15 dollars\t\t";
  const rows = feedRows(tsv); assert.equal(rows.length, 2);
  const l = feedLines(rows).filter((x) => x.ok === false).map((x) => x.line).join(" | ");
  for (const re of [/no description/, /no image_link/, /longer than 150/, /price/i, /availability/i, /GTIN/]) assert.match(l, re);
  assert.match(feedLines(rows).find((x) => x.ok === false).solution, /support\.google\.com\/merchants\/answer\/7052112/);
  const xml = '<rss><channel><item><g:id>9</g:id><title>Hat</title><g:price>9.00 GBP</g:price></item></channel></rss>'; assert.equal(feedRows(xml)[0].id, "9");
  assert.match(productPageLines(page("https://ex.com/p", `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Scarf", offers: { price: 15 } })}</script>`))[0].line, /priceCurrency/);
  assert.equal(amazonAsin("https://www.amazon.com/Some-Thing/dp/B0ABCDEF12?ref=x"), "B0ABCDEF12");
  const L = amazonListingOf([{ items: [{ type: "amazon_product_info", data_asin: "B0ABCDEF12", title: "Wool Scarf", description: "Soft", rating: { value: 3.9, votes_count: 40 }, product_information: [{ contents: ["Wool"] }] }] }]);
  assert.equal(L.title, "Wool Scarf"); assert.ok(listingLines(L).some((x) => x.area === "Ratings" && x.ok === false));
  assert.equal(amazonRank([{ items: [{ data_asin: "X", rank_absolute: 1, title: "a" }, { data_asin: "B0ABCDEF12", rank_absolute: 7, title: "b" }] }], "B0ABCDEF12").rank, 7);
  assert.match(listingFaults({ title: "Wool Scarf 100% cashmere", bullets: [], description: "" }, L).join(" "), /100/);
});

/* ── the jobs in seoJobs, with documented answers ── */
function deps(over = {}) {
  const files = {}, ledger = { spent: [] }, calls = [];
  const d = { pread: (id, f, dflt = null) => (f in files ? JSON.parse(JSON.stringify(files[f])) : dflt), pwrite: (id, f, x) => { files[f] = x; },
    productOf: () => ({ name: "Ex", site: "https://ex.com/" }), sitePages: () => [], gscSite: () => null, phrases: () => [{ text: "wool scarf", volume: 900 }], asked: () => [],
    keys: { get: () => "k", saved: () => false }, ai: { key: () => "k", allowed: () => true, add: () => {} },
    dfs: { ledger: () => ledger, save: () => {}, settings: () => ({ on: true, capDay: 1, capMonth: 31 }), creds: { login: () => "l", password: () => "p" } },
    engines: { read: () => ({ spent: [] }), write: () => {}, cap: () => 5 }, pace: () => Promise.resolve(), dfsWait: { waitMs: 0, everyMs: 0 }, now: () => Date.parse("2026-11-06T12:00:00Z"), ...over };
  return { d, files, ledger, calls };
}
test("IN THE JOBS: Reviews reads Google and Trustpilot through the capped buyer (booked per job), drafts replies with Sonnet; every new job has a screen with a guide id", async () => {
  const asked = [];
  const fetchImpl = async (u, i) => { const p = new URL(u).pathname;
    if (/task_post$/.test(p)) return res({ status_code: 20000, tasks: [{ id: `t-${p.split("/")[3]}`, status_code: 20100, cost: 0.0015 }] });
    if (/google\/reviews\/task_get\//.test(p)) return res({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ reviews_count: 50, rating: { value: 4.2 }, items: [{ review_id: "g1", rating: { value: 1 }, review_text: "Never again, rude", responses: [] }] }] }] });
    if (/trustpilot\/reviews\/task_get\//.test(p)) return res({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ reviews_count: 10, rating: { value: 3 }, items: [{ review_id: "t1", rating: { value: 2 }, review_text: "Late order" }] }] }] });
    return res({}, 404); };
  const { d, ledger } = deps({ fetchImpl, askJson: async (o) => { asked.push(o); return { data: { replies: o.body.reviews.map((r) => ({ id: r.id, reply: "Sorry to hear this; we will look into it." })) }, usage: { input: 10, output: 10, model: o.model } }; } });
  const J = seoJobs(d);
  const r = await J.press("p", "reviews", "read", { name: "Ex", city: "Leeds", country: "gb", trustpilot: "https://www.trustpilot.com/review/ex.com" });
  assert.ok(r.ok, r.refused); assert.match(r.line, /across 60 reviews from 2 sources/);
  assert.ok(ledger.spent.every((s) => s.job === "reviews") && ledger.spent.length === 2, "each purchase booked with its job");
  const rep = await J.press("p", "reviews", "replies", {}); assert.ok(rep.ok); assert.equal(asked[0].model, "claude-sonnet-5-5");
  const v = J.view("p", "reviews"); assert.ok(v.sections.some((s) => /Reputation: 4 ★ from 60 reviews/.test(s.title))); assert.ok(v.sections.some((s) => s.title === "Ask for reviews"));
  for (const id of MORE_IDS) { const w = J.view("p", id); assert.ok(w && w.title && w.buttons.length && w.money, id); }
  assert.ok(J.moneyLines().some((l) => /Reviews and reputation/.test(l.what)));
});
test("IN THE JOBS: Backlinks says plainly when DataForSEO refuses (e.g. no Backlinks access) and takes the free Search Console export instead", async () => {
  const fetchImpl = async (u) => (/backlinks/.test(u) ? res({ status_code: 20000, tasks: [{ status_code: 40204, status_message: "Access denied. Visit Plans and Subscriptions", cost: 0 }] }) : res({}, 404));
  const { d, ledger } = deps({ fetchImpl }); const J = seoJobs(d);
  const r = await J.press("p", "backlinks", "check", { scCsv: "Site,Linking pages\na.com,2\nb.org,1" });
  assert.ok(r.ok); assert.match(r.line, /40204/); assert.equal(ledger.spent.reduce((t, s) => t + s.cost, 0), 0);
  assert.ok(J.view("p", "backlinks").sections.some((s) => /Search Console/.test(s.title)));
});
test("AI TRACKER (item 11): an AI Overview that meets DataForSEO's 40101 is asked once more later; a second failure is 'could not be read today' and never counted as not mentioned", async () => {
  let n = 0; const fetchImpl = async (u) => { if (/organic\/live/.test(u)) { n++; return n === 2 ? res({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.004, result: [{ items: [{ type: "ai_overview", items: [{ text: "Exwool is a site about scarves." }], references: [{ url: "https://ex.com/a", title: "Ex" }] }] }] }] }) : res({ status_code: 20000, tasks: [{ status_code: 40101, status_message: "Internal Error", cost: 0 }] }); } return res({}, 404); };
  const { d } = deps({ fetchImpl, aioRetryMs: 0 }); const J = seoJobs(d);
  const r = await J.press("p", "aiv", "run", { brand: "Exwool", domain: "ex.com", questions: "best wool scarf shop\nwhere to buy wool scarves", engines: "aio" });
  assert.ok(r.ok, r.refused); assert.equal(n, 3, "the first question met 40101 and was asked once more; the second answered at once");
  const run = JSON.parse(JSON.stringify(d.pread("p", "seo-aiv.json"))).runs[0];
  const unread = run.rows.filter((x) => x.unread); assert.equal(unread.length, 1); assert.equal(unread[0].fail, AIO_UNREAD);
  assert.equal(run.rows.filter((x) => x.mentioned).length, 1); assert.equal(run.score, 100, "the unread one is not counted as 'not mentioned'");
  assert.ok(J.view("p", "aiv").sections.find((s) => s.title === "Each answer").table.rows.some((row) => row.includes(AIO_UNREAD)));
});
test("REAL PROOF FIXES: an SVG image is never sent to the AI (Gymshark's missing alts were SVG flags) and is named; a site answering 403 is said, not only 'could not be opened' (britishmuseum.org)", async () => {
  let aiCalls = 0; const fetchImpl = async (u, i) => { if (/anthropic/.test(u)) { aiCalls++; return res({ content: [{ type: "text", text: JSON.stringify({ alt: "x", decorative: false }) }] }); } if (/blocked\.org/.test(u)) return res("no", 403); if (i?.method === "HEAD") return res("", 200, { "content-length": "1000" }); return res('<title>Shop</title><img src="/_next/static/media/us.bc5e2f3b.svg"><img src="/flags/fr.svg">'); };
  const { d } = deps({ fetchImpl, productOf: (id) => ({ name: "X", site: id === "b" ? "https://blocked.org/" : "https://shop.com/" }) }); const J = seoJobs(d);
  assert.ok((await J.press("s", "image", "check", {})).ok);
  const r = await J.press("s", "image", "alt", {}); assert.equal(aiCalls, 0, "nothing the AI cannot read is sent (and paid)"); assert.match(r.refused, /2 images without alt text are SVG files/);
  const b = await J.press("b", "image", "check", {}); assert.match(b.refused, /answered 403: the site turns automatic readers away/); assert.doesNotMatch(b.refused, /\.\)\./);
  assert.match((await J.press("b", "entity", "check", {})).refused, /answered 403/);
});
test("MONTHLY REPORT (item 10): every kind of SEO has its line (never run = 'not run yet', never zero); the day's articles are listed", () => {
  const { d } = deps(); const J = seoJobs(d), kinds = J.kinds("p");
  assert.equal(kinds.length, 15); assert.ok(kinds.every((k) => /not run yet\.$/.test(k)));
  const rep = monthReport({ product: "Ex", month: "2026-11", drafts: [], articles: [{ url: "https://ex.com/a", title: "How to wash wool", day: "2026-11-03" }, { url: "https://ex.com/old", title: "Old", day: "2026-10-03" }], kinds });
  assert.ok(rep.lines.includes("## Every kind of SEO")); assert.ok(rep.lines.some((l) => /Article \(2026-11-03\): How to wash wool/.test(l))); assert.ok(!rep.lines.some((l) => /Old/.test(l)));
  assert.match(rep.html, /width=device-width/);
});
test("HOME + GUIDE (item 12): the fifteen kinds are jobs; six open on the first screen, nine one click away; each has its guide; the app routes every job id", () => {
  assert.equal(JOB_IDS.length, 15); assert.deepEqual([...SEO_KINDS].sort(), [...JOB_IDS].sort()); assert.equal(SEO_KINDS_OPEN, 6);
  for (const f of FEATURES.filter((x) => JOB_IDS.includes(x.id))) assert.doesNotMatch(`${f.title} ${f.does} ${f.youGet} ${f.time}`, /Google Ads|Keyword Planner|DataForSEO|Ads API|keyword service|search volumes?/i, `${f.id}: a card never names a data source (RR-361 ruling 3)`);
  for (const id of JOB_IDS) { assert.ok(FEATURES.some((f) => f.id === id), id); assert.ok(guideList().some((g) => g.id === `seo-${id}`), `guide seo-${id}`); }
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), build = readFileSync(join(REPO, "desktop", "build.mjs"), "utf8");
  assert.match(ui, /More kinds of SEO/); assert.match(ui, /const SEO_KINDS_OPEN = 6/); assert.match(main, /job\/\(\$\{JOB_IDS\.join\("\|"\)\}\)/);
  for (const f of ["seo-more.mjs", "seo-jobs-more.mjs"]) assert.ok(build.includes(`"${f}"`), `${f} is packed into the app`);
});
