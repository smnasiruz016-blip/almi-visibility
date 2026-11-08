/**
 * RR-399 A7 · A BUILT GUIDE OF AN ALMIWORLD PRODUCT WEARS THE ONE ALMIWORLD FAMILY HEADER AND FOOTER.
 *
 * RR-397 found that the client's built guides would, on their next publish, carry the navigation and footer FILED in the client's
 * questionnaire on 13 October (26 items, with "eBooks" and other old WordPress links). Since RR-398 every AlmiWorld product shows the
 * AlmiWorld family bar and footer from ONE source (almiworld-site/tools/make-family-kit.mjs → site/almiworld-family.json). The page
 * builder now renders that kit for a design whose company is AlmiWorld, and keeps the product's own logo, actions and call to action.
 *
 * Fixtures DRIVE the rule (a stand-in product of the AlmiWorld company, with a stale filed navigation); the REAL test renders a page in
 * the client's own filed design. Nothing is fetched and nothing is written.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { joinPages, joinedChecks, faqOf, ASSET_FOLDER } from "../src/page/joined-page.mjs";
import { STAMP } from "../src/page/test-exception.mjs";
import { CHECK } from "../src/page/draft-render.mjs";
import { ALMIWORLD, familyKitFor } from "../site/family.mjs";
import { readProductQuestionnaire } from "../src/questionnaire/product-questionnaire-reader.mjs";
import { designOf } from "../src/questionnaire/product-questionnaire.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const label = (claimId) => ({ claimId, label: "RESPONSIBLE BODY", source: "A Body — its page", link: "https://body.invalid/p", readOn: "2026-09-01", text: `Statement ${claimId}.`, central: true });
const built = (needId, wording) => ({ slug: `compiled-${needId}`, decision: { subject: { needId } },
  spec: { subject: needId, basis: { pageCandidate: JSON.stringify([["kind", "alpha"]]) }, sections: [{ questionId: `${needId}-q0`, heading: wording, tier: "OBSERVED" }], countrySections: [], answer: { state: "SUPPORTED", labels: [label(`${needId}-1`)], unknown: [] } } });
const passing = () => ({ state: "RENDERED", checks: { directAnswer: { state: CHECK.PASS }, everyClaimSourced: { state: CHECK.PASS }, headingsMatch: { state: CHECK.PASS }, internalLinks: { state: CHECK.NOT_MEASURED }, technical: { state: CHECK.NOT_MEASURED }, markup: { state: CHECK.PASS } } });
const RELATED3 = Object.freeze([{ href: "/guides", label: "All guides" }, { href: "/guides/related", label: "A related guide" }, { href: "/articles/one", label: "An article" }]);
const ITEMS = [built("n1", "How much does it cost?"), built("n2", "Where is it held?")];
const page = (design) => joinPages({ construction: ITEMS, renderNeed: passing, stamp: STAMP, design, productLine: design.productLine, recheckOf: () => 30, on: "2026-09-03", relatedFor: () => RELATED3 })[0];
const headOf = (html) => /<header[\s\S]*?<\/header>/.exec(html)?.[0] ?? "";
const footOf = (html) => /<footer[\s\S]*?<\/footer>/.exec(html)?.[0] ?? "";

const LOGO = { file: "design/group-logo.png", alt: "Group logo", sha256: "ab".repeat(32), width: 300, height: 200, focus: { x: 60, y: 50, w: 180, h: 100 } };
/* a stand-in product of the AlmiWorld company, with the stale navigation and footer a questionnaire filed before RR-398 */
const STALE = { label: "eBooks", href: "https://almiworld.com/ebooks-2/" };
const FAMILY_DESIGN = Object.freeze({ siteAddress: "https://client.invalid", brandName: "Standin", productLine: "Standin — a stand-in product line.", logo: { mark: "S", wordmark: "Standin" },
  company: { name: "AlmiWorld", href: ALMIWORLD.home, logo: LOGO }, actions: [{ label: "Practice", href: "/practice" }, { label: "Log in", href: "/login" }],
  colours: { background: "#FFFEF0", surface: "#FFFFFF", border: "#EEDDCC", primary: "#AA3322", ink: "#111122", text: "#333344", muted: "#555566", footerBackground: "#101010", footerAccent: "#CCAA55", onDark: "#FAFAFA" },
  fonts: { body: "Verdana, sans-serif" }, card: { radius: "14px" }, nav: [{ label: "Home", href: ALMIWORLD.home }, STALE, { label: "Old shop", href: "https://almiworld.com/?page_id=7" }], cta: { label: "Start now", href: "/start" },
  footer: { columns: [{ title: "AlmiWorld", links: [{ label: "Home", href: ALMIWORLD.home }, { label: "Ebooks", href: STALE.href }, { label: "Contact Us", href: "https://almiworld.com/contact-us/" }] }], notice: "© Old notice." }, basis: "CLIENT_DECLARED" });
const OTHER_DESIGN = Object.freeze({ ...FAMILY_DESIGN, company: { name: "Standin Group", href: "https://group.invalid/", logo: LOGO }, nav: [{ label: "Try it", href: "/try" }],
  footer: { columns: [{ title: "Company", links: [{ label: "Contact", href: "https://client.invalid/contact" }] }], notice: "© Standin." } });

test("RR-399 A7 · a guide of an AlmiWorld product shows the AlmiWorld family bar and footer from the one kit — never the filed navigation, never eBooks — and keeps the product's own logo, actions and call to action", () => {
  const p = page(FAMILY_DESIGN), head = headOf(p.html), foot = footOf(p.html);
  assert.equal(p.checks.headerAndLogos.state, "PASS", p.checks.headerAndLogos.why);
  /* the bar: on top of the header, the AlmiWorld logo (the guide's own served file — nothing fetched from another site) and the Home button */
  assert.ok(head.startsWith('<header class="site-head"><div class="awb" data-almiworld-bar="">'), "the family bar is not on top of the header");
  assert.ok(head.includes(`<a class="awb-logo" href="${ALMIWORLD.home}" aria-label="AlmiWorld home"><span class="logo-file"`) && head.includes(`<img src="${ASSET_FOLDER}/group-logo.png"`), "the bar's logo is not the guide's own logo file");
  assert.ok(head.includes(`<a class="awb-home" href="${ALMIWORLD.home}">Home</a>`), "no Home button to almiworld.com");
  for (const m of ALMIWORLD.menus) for (const i of m.items) assert.ok(head.includes(`<li><a href="${esc(i.href)}">${esc(i.label)}</a></li>`), `the bar lacks ${m.label} › ${i.label}`);
  for (const l of ALMIWORLD.links) assert.ok(head.includes(`<a href="${esc(l.href)}">${esc(l.label)}</a>`), `the bar lacks ${l.label}`);
  /* the product's own controls stay */
  assert.ok(head.includes('<a class="brand" href="https://client.invalid/"><span class="mark" aria-hidden="true">S</span><span>Standin</span></a>'), "the product's own logo and name are gone");
  assert.ok(head.includes('<a href="https://client.invalid/practice">Practice</a><a href="https://client.invalid/login">Log in</a><a class="cta" href="https://client.invalid/start">Start now</a>'), "the product's actions or its call to action are gone");
  /* the footer: the kit's columns, every link, in order */
  assert.ok(foot.startsWith('<footer class="awf" data-almiworld-footer="">'), "the footer is not the family footer");
  for (const c of ALMIWORLD.footer.columns) {
    assert.ok(foot.includes(`<p class="awf-h">${esc(c.title)}</p><ul>${c.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul>`), `the footer column ${c.title} is not the kit's`);
  }
  /* the filed navigation and footer are not shown: no eBooks, no old WordPress links, no old notice */
  assert.doesNotMatch(p.html, /ebook|\?page_id=|Old shop|Old notice/i, "a link of the stale filed navigation or footer is on the page");
  /* the page stays self-contained: no picture from another site (the kit's live logo address is not used on a built guide) */
  assert.ok(!p.html.includes(ALMIWORLD.logo.src), "the guide fetches the bar's logo from another site");
  /* the bar's styles travel in the page's one stylesheet (the hub and the 410 page copy the guides' style, header and footer) */
  assert.equal((p.html.match(/<style>/g) ?? []).length, 1);
  assert.ok(p.html.includes(familyKitFor(FAMILY_DESIGN).css), "the bar's and the footer's styles are not in the page");
});

test("RR-399 A7 · FIRING CONTROL: the header check fails when the family bar is missing, when the stale filed navigation stands in its place, or when the footer is the filed one — each alone; another company's page is unchanged", () => {
  const p = page(FAMILY_DESIGN);
  const base = { items: p.itemList, stamp: STAMP, title: p.title, titleTrace: p.titleTrace, composed: true, phrases: [], lastChecked: p.lastChecked, design: FAMILY_DESIGN, faq: faqOf(p.itemList), converted: p.conversions, tables: p.comparisons, recheck: p.recheck, on: "2026-09-03" };
  const check = (html) => joinedChecks({ ...base, html }).headerAndLogos;
  assert.equal(check(p.html).state, "PASS", check(p.html).why);
  const bar = /<div class="awb" data-almiworld-bar="">[\s\S]*?<\/details><\/div><\/div>/.exec(p.html)[0];
  const noBar = check(p.html.replace(bar, ""));
  assert.deepEqual([noBar.state, /family bar/.test(noBar.why)], ["FAIL", true], "a guide without the family bar passed");
  const filedNav = check(p.html.replace(bar, `<nav aria-label="AlmiWorld">${FAMILY_DESIGN.nav.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}</nav>`));
  assert.equal(filedNav.state, "FAIL", "the stale filed navigation passed in place of the family bar");
  const filedFoot = check(p.html.replace(footOf(p.html), '<footer class="site-foot"><div class="foot"><div><h3>AlmiWorld</h3><ul><li><a href="https://almiworld.com/">Home</a></li><li><a href="https://almiworld.com/ebooks-2/">Ebooks</a></li></ul></div></div></footer>'));
  assert.deepEqual([filedFoot.state, /footer/.test(filedFoot.why)], ["FAIL", true], "the filed footer passed in place of the family footer");
  /* another company: its own filed navigation and footer, as before, and no family bar */
  const o = page(OTHER_DESIGN);
  assert.equal(o.checks.headerAndLogos.state, "PASS", o.checks.headerAndLogos.why);
  assert.ok(!o.html.includes("data-almiworld-bar") && !o.html.includes("data-almiworld-footer") && headOf(o.html).includes('<a href="https://client.invalid/try">Try it</a>') && footOf(o.html).includes("© Standin."));
  assert.equal(familyKitFor(OTHER_DESIGN), null);
});

test("RR-399 A7 · REAL: the declared product's own filed design (it still files eBooks) builds a guide with the AlmiWorld family bar and footer and no eBooks link", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const filed = await readProductQuestionnaire(product);
  assert.equal(filed.state, "READ", "the declared product's questionnaire could not be read");
  const design = designOf(filed.questionnaire);
  assert.ok(design && familyKitFor(design), "the filed design does not name the AlmiWorld company");
  const p = page(design);
  assert.equal(p.checks.headerAndLogos.state, "PASS", p.checks.headerAndLogos.why);
  assert.ok(headOf(p.html).includes('data-almiworld-bar=""') && footOf(p.html).includes('data-almiworld-footer=""'));
  assert.doesNotMatch(p.html, /ebook/i, "an eBooks link is on the built guide");
  for (const a of design.actions) assert.ok(headOf(p.html).includes(`>${esc(a.label)}</a>`), `the product's own ${a.label} is gone`);
  assert.ok(headOf(p.html).includes(`<a class="cta" href="${esc(new URL(design.cta.href, design.siteAddress).href)}">${esc(design.cta.label)}</a>`), "the product's call to action is gone");
});
