/* ── RR-319 A3 · the fee as the subject's own site states it (moved here unchanged from page-count.mjs in RR-328, so the website's
 * country-facts collector reads it without the app's page counter) ── */
const PRICE = /(A\$|AU\$|AUD(?:\s?\$)?|US\$|USD(?:\s?\$)?|£|GBP|€|EUR)\s?(\d{2,4}(?:[.,]\d{2})?)/i; // RR-321: oet.com writes "AUD $587"
const CUR = { "A$": "AUD", "AU$": "AUD", AUD: "AUD", "US$": "USD", USD: "USD", "£": "GBP", GBP: "GBP", "€": "EUR", EUR: "EUR" };
const has = (text, word) => new RegExp(`(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu").test(text);
/** the subject's fee as its own site states it: the first price in a sentence that names the subject, on a page about fees, costs or booking */
export async function feeOf({ urls, subject, subjectName, reader }) {
  const pages = urls.filter((u) => /fee|cost|price|pricing|book-a-test|how-much|test-at-home|test-on-computer/i.test(new URL(u).pathname)).sort((a, b) => a.length - b.length).slice(0, 4);
  /* RR-321: the fee line on the subject's own page about taking it ("Test fee: AUD $587") names no subject in its own sentence — the page is
   * the subject's own page about a way to take it, so its fee line counts */
  for (const u of pages) { const r = await reader.read(u); if (!r.ok) continue; for (const s of r.text.split(/(?<=[.!?])\s+|\s+(?=Test fee:)/)) { if (!has(s, subject) && !/^Test fee:/i.test(s)) continue; const m = PRICE.exec(s); if (m) { const k = m[1].replace(/^(AUD|USD)\s?\$$/i, "$1"); return { ok: true, amount: Number(m[2].replace(",", ".")), currency: CUR[k.toUpperCase()] ?? CUR[k], source: { url: r.url, title: r.title }, checkedOn: r.checkedOn, said: m[0] }; } } }
  return { ok: false, why: `${subjectName}'s own pages about fees and booking (${pages.length} checked) state no fee Visibility could read — open them to see it.` };
}
