/**
 * RR-387 PART C · D6 "Whois / domain age" (ALMIWORLD_COLLECTORS_MAP_2026-11.md: MISSING → HAVE): RDAP, the registries' own protocol (free):
 * the IANA bootstrap names each TLD's server; each domain once in 180 days; at most 20 a run; its own switch; saved like every collector.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWhois, registrable, rdapBase, whoisRow, WHOIS } from "../site/more-collectors.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { MC_CRONS } from "../tools/bundle-site.mjs";

const boot = { services: [[["com", "net"], ["https://rdap.verisign.com/com/v1/"]], [["uk"], ["https://rdap.nominet.uk/uk/"]]] };
const rdap = (d) => ({ objectClassName: "domain", ldhName: d, events: [{ eventAction: "registration", eventDate: "2010-03-15T10:00:00Z" }, { eventAction: "expiration", eventDate: "2027-03-15T10:00:00Z" }], entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "Example Registrar, Inc."]]] }], status: ["active"] });
const fx = (asked) => async (u) => { asked.push(u); if (u === WHOIS.bootstrap) return new Response(JSON.stringify(boot), { status: 200 }); const d = u.split("/domain/")[1]; return d ? new Response(JSON.stringify(rdap(d)), { status: 200 }) : new Response("nf", { status: 404 }); };

test("1 · RDAP: the registry's own dates and registrar, the age in whole years, the source and the day kept; nothing guessed", async () => {
  const seo = seoMemoryStore(), asked = [];
  const r = await runWhois({ seo, fetchImpl: fx(asked), now: () => Date.parse("2026-11-07T08:00:00Z"), domains: ["www.example.com", "shop.example.com", "nhs.co.uk", "nope.zz"], paceMs: 0 });
  assert.equal(r.ok, true); assert.equal(r.kept, 2, "example.com once (two hosts, one registrable domain) + nhs.co.uk; .zz has no RDAP server");
  assert.ok(asked.includes("https://rdap.verisign.com/com/v1/domain/example.com")); assert.ok(asked.includes("https://rdap.nominet.uk/uk/domain/nhs.co.uk"));
  const row = whoisRow("example.com", rdap("example.com"), { on: "2026-11-07", url: "u" }); assert.deepEqual([row.data.registered, row.data.expires, row.data.ageYears, row.data.registrar], ["2010-03-15", "2027-03-15", 16, "Example Registrar, Inc."]);
  assert.equal(whoisRow("x.com", { events: [] }, { on: "2026-11-07", url: "u" }).data.registered, null, "no date given → none written");
  assert.equal(registrable("WWW.Sub.Example.COM."), "example.com"); assert.equal(registrable("a.b.co.uk"), "b.co.uk"); assert.equal(rdapBase(boot, "x.net"), "https://rdap.verisign.com/com/v1/");
});
test("2 · ITS CAPS: each domain once in 180 days, at most 20 a run, its own switch, $0; the cron is daily", async () => {
  const seo = seoMemoryStore(), asked = [], many = Array.from({ length: 30 }, (_, i) => `d${i}.com`);
  const a = await runWhois({ seo, fetchImpl: fx(asked), now: () => Date.parse("2026-11-07T08:00:00Z"), domains: many, paceMs: 0 }); assert.equal(a.read, WHOIS.perRun, "20 a run");
  const b = await runWhois({ seo, fetchImpl: fx(asked), now: () => Date.parse("2026-11-08T08:00:00Z"), domains: many, paceMs: 0 }); assert.equal(b.read, 10, "the next run takes the other 10, not the 20 again");
  const c = await runWhois({ seo, fetchImpl: fx(asked), now: () => Date.parse("2026-12-08T08:00:00Z"), domains: many, paceMs: 0 }); assert.equal(c.read, 0, "nothing again inside 180 days");
  assert.equal((await runWhois({ seo, env: { ALMISEO_WHOIS_OFF: "1" }, fetchImpl: fx([]), domains: many })).ok, false);
  assert.equal(a.usd, 0); assert.ok(MC_CRONS.some((x) => x.path === "/cron/whois"));
});
