/**
 * 🔴 RR-369b item 5 (owner: "84 of 133 top-page reads failed but were charged"). A paid page reading that fails is still charged. Measured on the owner's ledger of 833 reads: 362 failed and were charged, no address was ever paid twice,
 * and the waste is whole sites: facebook.com 179 failed and 3 good, youtube.com 34 and 2, instagram.com 27 and 0, and every document (7 of 7).
 * So before a read is bought: an address that failed before, a document, or a site that nearly always fails, is not paid for. The polite free read still tries it. What failed is remembered on the server, so neither the app on another computer nor the server collector pays for it.
 * A timeout was not charged and may pass another day: it counts for nothing. Pure.
 */
export const READ_RULE = Object.freeze({ minFails: 2, failsPerGood: 5 });
const DOCUMENT = /\.(?:pdf|docx?|xlsx?|pptx?|zip)(?:[?#]|$)/i, NOT_THE_PAGE = /took too long/i;
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };
/** a site that nearly always fails: two failures, and at most one good read for each five failed */
export const hostFails = (h) => Boolean(h) && h.fail >= READ_RULE.minFails && h.ok * READ_RULE.failsPerGood < h.fail;
/** what the ledger itself says: { urls, hosts } */
export function failuresOfLedger(ledger = {}) {
  const urls = new Map(), hosts = {};
  for (const r of ledger.spent ?? []) {
    if (r.what !== "top page read" || NOT_THE_PAGE.test(String(r.why ?? ""))) continue;
    const h = hostOf(r.q); if (h) { hosts[h] ??= { ok: 0, fail: 0 }; if (r.ok === false) hosts[h].fail++; else hosts[h].ok++; }
    if (r.ok === false) urls.set(r.q, { on: String(r.on).slice(0, 10), why: r.why ?? null });
  }
  return { urls, hosts };
}
/**
 * The check a run asks before paying. `own` = this app's or the collector's own counts; `shared` = the counts held on the server, from everyone else. → { skip(url) → why or null, note(url, { ok, why }), own(), skipped() }
 */
export function readFailures({ urls = new Map(), own = {}, shared = {} } = {}) {
  const failed = new Map(urls), mine = { ...own }, seen = new Set(); let skipped = 0;
  /* the server's counts already hold this app's own: the larger is the truth, never the sum: a sum would condemn a site on one failure */
  const countOf = (h) => { const a = mine[h], b = shared[h]; return { ok: Math.max(a?.ok ?? 0, b?.ok ?? 0), fail: Math.max(a?.fail ?? 0, b?.fail ?? 0) }; };
  return Object.freeze({
    skip(url) { const why = failed.has(url) ? "it failed before" : DOCUMENT.test(String(url)) ? "a document, which this reading cannot read" : hostFails(countOf(hostOf(url))) ? "this site nearly always refuses this reading" : null; if (why && !seen.has(url)) { seen.add(url); skipped++; } return why; },
    note(url, { ok, why = null }) { if (NOT_THE_PAGE.test(String(why ?? ""))) return; const h = hostOf(url); if (h) { mine[h] = { ok: (mine[h]?.ok ?? 0) + (ok ? 1 : 0), fail: (mine[h]?.fail ?? 0) + (ok ? 0 : 1) }; } if (!ok) failed.set(url, { why }); },
    own: () => ({ ...mine }), skipped: () => skipped, failedUrls: () => [...failed.keys()],
  });
}
/** a ledger's reads, replayed in their own order with this rule: how many paid failures it would have saved, and how many good reads it would have skipped (those still get the free read) */
export function replayRule(rows = []) {
  const f = readFailures(); let reads = 0, savedFails = 0, savedUsd = 0, skippedGood = 0, skippedGoodUsd = 0;
  for (const r of rows.filter((x) => x.what === "top page read")) { reads++; const cost = Number(r.cost) || 0; if (f.skip(r.q)) { if (r.ok === false) { if (cost > 0) { savedFails++; savedUsd += cost; } } else { skippedGood++; skippedGoodUsd += cost; } continue; } f.note(r.q, { ok: r.ok !== false, why: r.why }); }
  return { reads, savedFails, savedUsd, skippedGood, skippedGoodUsd };
}
