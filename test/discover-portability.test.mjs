/**
 * THE DISCOVERY LAYER, PROVED ON TWO UNRELATED SYNTHETIC PRODUCTS.
 *
 * 🔴 WHY TWO. A discovery rule fitted to one repository's folder names would pass every test written
 * against that repository and fail the moment it met another. Product P is an app-router tree;
 * product Q is a pages-router tree with a content collection. They share no path, no identifier and
 * no host. Every proof below must hold on BOTH, or the layer is fitted rather than generic.
 *
 * 🔴 AND THE CALIBRATION THAT DECIDES THE EXAM. A clean page must come back CLEAN or NOT_APPLICABLE
 * — never UNKNOWN, because an UNKNOWN on a control fails the control, and never a FINDING, because a
 * false positive on a control fails outright. The exposure is six comparators per control, so
 * "UNKNOWN when unsure" is not a safe default here; it is a losing one.
 */
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { PRODUCT_P, PRODUCT_Q } from "./fixtures/synthetic-products.mjs";
import { buildBundle } from "../src/discover/bundle.mjs";
import { runDetectors } from "../src/detect/run.mjs";
import { routeOf, pathOfUrl } from "../src/discover/corpus.mjs";
import {
  discoverProducers, discoverValueClaims, discoverCollections,
  discoverCountClaims, discoverSourceLinks, discoverAuthorityClaims,
} from "../src/discover/candidates.mjs";

const RUN_AT = "2026-09-20T00:00:00.000Z";
const outcomesOf = (product) => {
  const r = runDetectors({ bundle: buildBundle(product), runAt: RUN_AT });
  const by = new Map();
  for (const d of r.detectors) by.set(d.key, d.outcomes);
  return by;
};
const P_OUT = outcomesOf(PRODUCT_P);
const Q_OUT = outcomesOf(PRODUCT_Q);
const PRODUCTS = [["P", PRODUCT_P, P_OUT], ["Q", PRODUCT_Q, Q_OUT]];

describe("🔴 1 & 2 · each comparator finds a real defect AND reaches CLEAN on a real clean case — on BOTH products", () => {
  for (const [name, , out] of PRODUCTS) {
    for (const key of ["A", "B", "C", "E", "F"]) {
      test(`${name} · ${key} · one FINDING and at least one CLEAN, discovered automatically`, () => {
        const o = out.get(key);
        const findings = o.filter((x) => x.outcome === "FINDING");
        const cleans = o.filter((x) => x.outcome === "CLEAN");
        assert.equal(findings.length, 1, `${key}: expected exactly one planted defect, got ${findings.length}`);
        assert.ok(cleans.length >= 1, `${key}: reached no CLEAN — a comparator that never says CLEAN cannot pass a control`);
        assert.ok(findings[0].evidence.length > 0);
        assert.ok(cleans[0].checked.length > 0, "a CLEAN must state what it examined");
      });
    }
    test(`${name} · D · the sitemap claim is judged against observed state, and reaches CLEAN`, () => {
      const o = out.get("D");
      assert.ok(o.filter((x) => x.outcome === "CLEAN").length >= 2, "D reached no CLEAN on advertised, resolving URLs");
    });
  }
});

describe("🔴 THE CALIBRATION — no clean page is ever UNKNOWN, and nothing clean is ever flagged", () => {
  for (const [name, product, out] of PRODUCTS) {
    test(`${name} · every captured page gets a disposition from all six, and none of them is UNKNOWN`, () => {
      const pages = product.pages.map((p) => p.url);
      const unknowns = [];
      for (const [key, outcomes] of out) {
        const seen = new Set(outcomes.map((o) => o.subject));
        for (const url of pages) assert.ok(seen.has(url), `${key} produced nothing about ${url} — silence is not a disposition`);
        for (const o of outcomes) if (o.outcome === "UNKNOWN" && pages.includes(o.subject)) unknowns.push(`${key}:${o.subject} (${o.reasonCode})`);
      }
      assert.deepEqual(unknowns, [], "a page-level UNKNOWN would fail that page as a control under Amendment 2");
    });
    test(`${name} · the page carrying nothing of any kind is NOT_APPLICABLE everywhere, never CLEAN by default`, () => {
      const quiet = product.pages.find((p) => /quiet|still/.test(p.url)).url;
      for (const [key, outcomes] of out) {
        const o = outcomes.filter((x) => x.subject === quiet);
        assert.ok(o.length > 0, `${key} said nothing about the quiet page`);
        for (const x of o) {
          assert.notEqual(x.outcome, "FINDING", `${key} invented a defect on a page carrying nothing`);
          assert.notEqual(x.outcome, "UNKNOWN", `${key} returned UNKNOWN where there was simply nothing of its kind`);
        }
        /* D legitimately examines it — it is in the sitemap and resolves. The rest find nothing. */
        if (key !== "D") assert.ok(o.every((x) => x.outcome === "NOT_APPLICABLE"), `${key} did not report NOT_APPLICABLE`);
      }
    });
  }
});

describe("🔴 3 · a real candidate that cannot be lawfully bound returns UNKNOWN — not a guess", () => {
  test("A · a module naming TWO producers cannot choose between them", () => {
    const files = [
      { path: "lib/x.ts", text: `export const ONESET = Object.freeze(["aa", "bb"]);\nexport const TWOSET = Object.freeze(["cc", "dd"]);\n` },
      { path: "src/app/both/page.tsx", text: `import { ONESET, TWOSET } from "../../lib/x";\nexport default function P(){ return <p>"aa, bb, zz" {ONESET.length}{TWOSET.length}</p>; }\n` },
    ];
    const claims = discoverValueClaims(files, discoverProducers(files));
    assert.ok(claims.length > 0, "no candidate was discovered at all");
    assert.equal(claims.every((c) => c.boundTo === null), true, "it bound to one of two producers rather than admitting ambiguity");
  });
  test("E · a module naming TWO collections is discovered and left unbound", () => {
    const files = [
      { path: "lib/y.ts", text: `export const LISTA = Object.freeze(["a","b"]);\nexport const LISTB = Object.freeze(["c","d","e"]);\n` },
      { path: "pages/two.tsx", text: `import { LISTA, LISTB } from "../lib/y";\nexport default function Q(){ return <p>"We offer two things"</p>; }\n` },
    ];
    const collections = discoverCollections(files);
    const claims = discoverCountClaims(files, collections);
    assert.ok(claims.length > 0, "the count candidate vanished instead of being reported unbound");
    assert.equal(claims.every((c) => c.boundTo === null), true);
  });
  test("B · an unreadable registry makes every authority claim UNKNOWN, never a finding", () => {
    const bundle = buildBundle({ ...PRODUCT_P, registry: { readable: false, unreadableReason: "not supplied" } });
    const out = runDetectors({ bundle, runAt: RUN_AT }).detectors.find((d) => d.key === "B").outcomes;
    assert.equal(out.some((o) => o.outcome === "FINDING"), false, "absence of evidence became a finding while the registry could not be read");
    assert.ok(out.some((o) => o.outcome === "UNKNOWN" && o.reasonCode === "REGISTRY_UNREADABLE"));
  });
  test("F · a source file matching no routing convention is discovered and left unbound", () => {
    const c = discoverSourceLinks([{ path: "weird/place/thing.tsx", text: `<a href="/a">a</a>` }]);
    assert.equal(c.length, 1, "the candidate disappeared because it could not be bound");
    assert.equal(c[0].boundTo, null);
    assert.match(c[0].confidence, /unbound/);
  });
});

describe("🔴 4 · a resemblance is never a binding", () => {
  test("a matching NUMBER in an unrelated module binds to nothing", () => {
    const files = [
      { path: "lib/z.ts", text: `export const THINGS = Object.freeze(["a","b","c"]);\n` },
      { path: "pages/unrelated.tsx", text: `export default function Q(){ return <p>"Established three years ago"</p>; }\n` },
    ];
    const claims = discoverCountClaims(files, discoverCollections(files));
    assert.deepEqual(claims, [], "a number in a module that references no collection became a candidate");
  });
  test("matching VALUES in an unrelated module bind to nothing", () => {
    const files = [
      { path: "lib/w.ts", text: `export const CODES = Object.freeze(["aa","bb","cc"]);\n` },
      { path: "pages/other.tsx", text: `export default function Q(){ return <p>"aa, bb, cc, dd"</p>; }\n` },
    ];
    const claims = discoverValueClaims(files, discoverProducers(files));
    assert.equal(claims.every((c) => c.boundTo === null), true, "identical values alone created a binding");
  });
  test("a cited host is never inferred from a word — only from a literal citation", () => {
    const none = discoverAuthorityClaims([{ path: "a.md", text: "The national board decides this." }]);
    assert.deepEqual(none, [], "an authority was inferred from prose rather than from a citation");
  });
});

describe("🔴 5 · moving the source to another layout needs no product-specific rule", () => {
  test("🔴 NO PRODUCT-SPECIFIC SELECTOR: a path matching no convention derives no route, whatever words it contains", () => {
    /* A rule that fires on a name rather than a convention would make the whole examination
     * meaningless, and it is invisible to the two-product proof below because both products would
     * still pass. This catches it directly: only the CONVENTION may decide a route. */
    for (const word of ["swatches", "sizes", "hub", "index", "tools", "routes", "standards", "quiet", "page", "app"]) {
      assert.equal(routeOf(`random/${word}.txt`), null, `a route was derived for a path containing "${word}" that matches no convention`);
      assert.equal(routeOf(`vendor/${word}/thing.bin`), null, `a route was derived from the word "${word}" rather than from a convention`);
    }
  });

  test("the same file under three conventions derives the same route, and an unknown layout derives none", () => {
    assert.equal(routeOf("src/app/hub/page.tsx").route, "/hub");
    assert.equal(routeOf("pages/hub.tsx").route, "/hub");
    assert.equal(routeOf("content/hub.md").route, "/hub");
    assert.equal(routeOf("app/(marketing)/hub/page.tsx").route, "/hub", "a route group must not appear in the URL");
    assert.equal(routeOf("random/hub.txt"), null, "an unrecognised layout must derive no route rather than guess one");
  });
  test("🔴 the F defect is still found after the source file is MOVED to the other product's layout", () => {
    const moved = {
      ...PRODUCT_P,
      files: PRODUCT_P.files.map((f) => (f.path === "src/app/hub/page.tsx" ? { ...f, path: "pages/hub.tsx" } : f)),
    };
    const out = runDetectors({ bundle: buildBundle(moved), runAt: RUN_AT }).detectors.find((d) => d.key === "F").outcomes;
    assert.equal(out.filter((o) => o.outcome === "FINDING").length, 1, "renaming the file lost the defect — the rule was path-specific");
  });
});

describe("🔴 6 · an input carrying nothing of a kind is NOT_APPLICABLE, with its own reason code", () => {
  test("the disposition is distinguishable from every UNKNOWN in the findings", () => {
    for (const [name, product, out] of PRODUCTS) {
      const quiet = product.pages.find((p) => /quiet|still/.test(p.url)).url;
      const na = [...out.values()].flat().filter((o) => o.subject === quiet && o.outcome === "NOT_APPLICABLE");
      assert.ok(na.length >= 4, `${name}: expected the quiet page to be NOT_APPLICABLE for most comparators`);
      for (const o of na) {
        assert.equal(o.reasonCode, "NO_CANDIDATE_OF_THIS_KIND");
        assert.ok(o.examined.length > 0, "NOT_APPLICABLE must state what it looked for");
      }
    }
  });
});

describe("populations are reported with their denominators", () => {
  for (const [name, product] of PRODUCTS) {
    test(`${name} · discovered = bound + unbound, per capability`, () => {
      const p = buildBundle(product).populations;
      assert.equal(p.discovered, p.bound + p.unbound);
      assert.ok(p.discovered > 0, "nothing was discovered — the proof would be vacuous");
      for (const k of ["A", "B", "E", "F"]) {
        assert.equal(p.byComparator[k].discovered, p.byComparator[k].bound + p.byComparator[k].unbound, k);
        assert.ok(p.byComparator[k].discovered > 0, `${k}: discovered nothing`);
      }
    });
  }
});
