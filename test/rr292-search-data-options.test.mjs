/**
 * RR-292 · the client's search-data options at setup (owner decisions 1 and 3; beta-g decision B). Fixtures with firing controls; REAL for
 * the declared client from its own stored records — nothing fetched.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { searchDataOptions, optionsLines, STATE, PRICE_NOT_MEASURED } from "../src/report/search-data-options.mjs";
import { setupSection, accessibilityFaults } from "../src/report/visibility-report-html.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("the three options, each with what it gives, its cost and its limits; none chosen is NOT CONNECTED, never zero demand", () => {
  const o = searchDataOptions();
  assert.deepEqual(o.options.map((x) => x.id), [1, 2, 3]);
  assert.ok(o.options.every((x) => x.gives && x.cost && x.limits && x.state === STATE.NOT_CONNECTED));
  assert.equal(o.discovery, STATE.NOT_CONNECTED);
  assert.match(o.note, /that is not zero demand/);
  assert.match(o.options[1].cost, /^Free\.$/);
  assert.match(o.options[2].cost, /your own AI plan/);
  assert.ok(!/\b0\b/.test(optionsLines(o).join(" ")), "a zero shown for an unconnected option");
});

test("option 1's cost: read from the provider's page on a stated day, else \"price not measured\" — never a guess", () => {
  assert.match(searchDataOptions().options[0].cost, new RegExp(`^${PRICE_NOT_MEASURED}`));
  assert.match(searchDataOptions({ price: { perThousand: 5, currency: "USD", readOn: "2026-10-19" } }).options[0].cost, /^5 USD per 1,000 searches \(read from the provider's own price page on 2026-10-19\)$/);
  /* FIRING CONTROL: a price with no date read is not shown — a figure without its day is a guess */
  assert.match(searchDataOptions({ price: { perThousand: 5, currency: "USD" } }).options[0].cost, new RegExp(`^${PRICE_NOT_MEASURED}`));
});

test("Search Console reads CONNECTED only from the client's own stored export, with its date and window; AI search only from its own connection", () => {
  const o = searchDataOptions({ searchConsole: { exportedOn: "2026-10-18", window: { from: "2026-06-26", to: "2026-10-15" } }, aiSearch: { state: "DISCONNECTED" } });
  assert.equal(o.options[1].state, "CONNECTED — your export of 2026-10-18 (data 2026-06-26 to 2026-10-15)");
  assert.equal(o.options[2].state, STATE.NOT_CONNECTED, "a disconnected AI account reads connected");
  assert.equal(o.discovery, STATE.CONNECTED);
  assert.equal(searchDataOptions({ aiSearch: { state: "CONNECTED" } }).options[2].state, STATE.CONNECTED);
  /* the report section is accessible */
  assert.deepEqual(accessibilityFaults(`<h1>t</h1>${setupSection(o)}`), []);
});

test("CENSUS · the options module fetches nothing", () => {
  const src = readFileSync(join(REPO, "src/report/search-data-options.mjs"), "utf8");
  assert.ok(!/fetch\(|openConnector|https?:\/\//.test(src));
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "search-console-exports.jsonl"));
test("REAL · the declared client's setup screen: all 3 options in plain words; option 1 price not measured; Search Console from its stored export; AI search NOT CONNECTED", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=setup-options", "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\(1\) Search API key \(your own key\) — NOT CONNECTED/);
  assert.match(r.stdout, /Cost: price not measured/);
  assert.match(r.stdout, /\(2\) Google Search Console \(your own connection\) — CONNECTED — your export of \d{4}-\d{2}-\d{2}/);
  assert.match(r.stdout, /\(3\) Your AI search .* — NOT CONNECTED/);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).filter((l) => /^\s+\(\d\)/.test(l)).map((l) => l.trim()).join(" | ")}`);
});
