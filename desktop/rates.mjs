/**
 * 🔴 RR-321 D5 · THE FEE IN THE READER'S OWN CURRENCY, FROM CENTRAL BANKS (owner: "PKR, AED, QAR, KES and TZS were shown only in AUD —
 * restore the PKR method of RR-257 (RBA × SBP); for the other currencies each country's central-bank official rate, always with its source
 * and date"):
 *   · the fee's currency (AUD) to US dollars by the Reserve Bank of Australia's own daily rates, then US dollars to the local currency by THAT
 *     country's central bank — the RR-257 chain (src/page/joined-page.mjs conversions: each step its source, link, date, recheck days);
 *   · a currency the RBA publishes itself (INR, PHP, NZD, GBP …) is one step, at the RBA's rate;
 *   · every rate shown stands, digit for digit, on its source (the verbatim check); a source that cannot be read (robots, a security page, no
 *     rate of a recent day) says so and NO converted figure is shown — never a guessed one.
 */
const RBA = Object.freeze({ url: "https://www.rba.gov.au/rss/rss-cb-exchange-rates.xml", page: "https://www.rba.gov.au/statistics/frequency/exchange-rates.html", source: "Reserve Bank of Australia — Exchange Rates", short: "RBA" });
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (d) => d.toISOString().slice(0, 10);
const back = (on, k) => { const d = new Date(`${String(on).slice(0, 10)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - k); return d; };
export const RECHECK_DAYS = 7;

/* each country's central bank: where its US-dollar rate stands, and how to read it (the number as written on the source) */
export const CENTRAL_BANKS = Object.freeze({
  PKR: { country: "Pakistan", source: "State Bank of Pakistan — M2M revaluation rates", short: "SBP",
    urls: (on) => [0, 1, 2, 3, 4, 5, 6].map((k) => { const d = back(on, k); return { url: `https://www.sbp.org.pk/ecodata/rates/m2m/${d.getUTCFullYear()}/${MON[d.getUTCMonth()]}/${String(d.getUTCDate()).padStart(2, "0")}-${MON[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}.pdf`, date: iso(d) }; }),
    rate: (text) => /\b(?:USD|US\s?Dollar)\b[^\d]{0,40}(\d{3}\.\d{2,4})/i.exec(text)?.[1] ?? null },
  KES: { country: "Kenya", source: "Central Bank of Kenya — daily KES exchange rates", short: "CBK", file: true,
    urls: () => [{ url: "https://www.centralbank.go.ke/uploads/fx_rates/historical_data.csv", date: null }],
    /* the CSV's latest US-dollar row: date, "US DOLLAR", mean, buy, sell (dates written two ways) */
    rows: (text) => String(text).split(/\r?\n/).map((l) => /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}),"?US DOLLAR"?,([\d.]+)/i.exec(l)).filter(Boolean).map((m) => ({ date: m[1].includes("/") ? m[1].split("/").reverse().join("-") : m[1], rate: m[2] })) },
  TZS: { country: "Tanzania", source: "Bank of Tanzania — exchange rates", short: "BoT",
    urls: () => [{ url: "https://www.bot.go.tz/ExchangeRate/excRates?lang=en", date: null }],
    /* a row: "USD <buying> <selling> <mean> <dd-Mon-yy>" — the mean */
    row: (text) => { const m = /\bUSD\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d{2})-([A-Z][a-z]{2})-(\d{2})\b/.exec(text); return m ? { rate: m[3], date: `20${m[6]}-${String(MON.indexOf(m[5]) + 1).padStart(2, "0")}-${m[4]}` } : null; } },
  AED: { country: "United Arab Emirates", source: "Central Bank of the UAE — exchange rates", short: "CBUAE",
    urls: () => [{ url: "https://www.centralbank.ae/en/forex-eibor/exchange-rates/", date: null }],
    rate: (text) => /\bUS\s?Dollar\b[^\d]{0,40}(3\.67\d{0,3})/i.exec(text)?.[1] ?? null },
  QAR: { country: "Qatar", source: "Qatar Central Bank — exchange rates", short: "QCB",
    urls: () => [{ url: "https://www.qcb.gov.qa/en/Pages/default.aspx", date: null }],
    rate: (text) => /\bUS\s?Dollar\b[^\d]{0,40}(3\.6\d{1,4})/i.exec(text)?.[1] ?? null },
});
/* a country's currency (the five above, and the ones the RBA publishes) */
export const CURRENCY_OF = Object.freeze({ Pakistan: "PKR", Kenya: "KES", Tanzania: "TZS", "United Arab Emirates": "AED", Qatar: "QAR", India: "INR", Philippines: "PHP", "New Zealand": "NZD", "United Kingdom": "GBP", "United States": "USD", Canada: "CAD", Singapore: "SGD", Malaysia: "MYR", Indonesia: "IDR", Thailand: "THB", Vietnam: "VND", China: "CNY", Japan: "JPY", "South Korea": "KRW", Taiwan: "TWD", Switzerland: "CHF", "Papua New Guinea": "PGK", Australia: "AUD",
  Ireland: "EUR", Germany: "EUR", France: "EUR", Italy: "EUR", Spain: "EUR", Portugal: "EUR", Netherlands: "EUR", Belgium: "EUR", Austria: "EUR", Finland: "EUR", Greece: "EUR", Malta: "EUR", Cyprus: "EUR", Croatia: "EUR", Slovakia: "EUR", Slovenia: "EUR", Estonia: "EUR", Latvia: "EUR", Lithuania: "EUR", Luxembourg: "EUR",
  Nigeria: "NGN", Ghana: "GHS", Bangladesh: "BDT", Nepal: "NPR", "Sri Lanka": "LKR", Egypt: "EGP", "Saudi Arabia": "SAR", Kuwait: "KWD", Oman: "OMR", Bahrain: "BHD", Jordan: "JOD", "South Africa": "ZAR", Uganda: "UGX", Zimbabwe: "ZWG", Ethiopia: "ETB", Brazil: "BRL", Mexico: "MXN" });

/** the RBA's own daily file → { date, rates: { CUR: units per AUD, as written } } or null */
export function rbaRates(xml) {
  const out = {}; let date = null;
  for (const m of String(xml ?? "").matchAll(/<item\b[\s\S]*?<\/item>/g)) {
    const cur = /<cb:targetCurrency>([A-Z]{3})<\/cb:targetCurrency>/.exec(m[0])?.[1], val = /<cb:value[^>]*>([\d.]+)<\/cb:value>/.exec(m[0])?.[1], per = /<cb:period>(\d{4}-\d{2}-\d{2})<\/cb:period>/.exec(m[0])?.[1];
    if (cur && val && per) { out[cur] = val; date = date && date > per ? date : per; }
  }
  return date ? { date, rates: out } : null;
}

/**
 * Read the rates a set of countries needs, today: the RBA's file, then each named central bank (robots obeyed, through the official reader).
 * → { rba: { date, rates } | null, banks: { CUR: { rate, date, link, source, short } | { refused } }, on }
 */
export async function readRates({ reader, countries = [], on = new Date().toISOString() }) {
  const want = [...new Set(countries.map((c) => CURRENCY_OF[c]).filter(Boolean))];
  const x = await reader.raw?.(RBA.url); const rba = x ? rbaRates(x) : null;
  const banks = {};
  for (const cur of want.filter((c) => CENTRAL_BANKS[c])) {
    const b = CENTRAL_BANKS[cur]; let got = null, why = null;
    for (const { url, date } of b.urls(on)) {
      if (b.file) { const t = await reader.raw?.(url, "text/csv,text/plain"); if (!t) { why = "its rates file could not be read"; continue; } const rows = b.rows(t).sort((p, q) => q.date.localeCompare(p.date)); if (rows[0]) got = { rate: rows[0].rate, date: rows[0].date, link: url, said: t.includes(rows[0].rate) }; break; }
      const r = await reader.read(url);
      if (!r.ok) { why = r.why; if (r.blocked || r.robots || /answered 40[13]/.test(r.why ?? "")) break; continue; } // a refusal is not asked again for another day's file
      if (b.row) { const v = b.row(r.text); if (v) got = { ...v, link: r.url, said: r.text.includes(v.rate) }; else why = "no US-dollar rate stands on its page"; break; }
      const v = b.rate(r.text); if (v) { got = { rate: v, date: date ?? r.checkedOn, link: r.url, said: r.text.includes(v) }; break; } why = "no US-dollar rate stands on its page";
    }
    banks[cur] = got && got.said ? { rate: got.rate, date: got.date, link: got.link, source: b.source, short: b.short } : { refused: `${b.source}: ${why ?? "no rate read"} (checked ${String(on).slice(0, 10)})`, source: b.source, short: b.short, link: b.urls(on)[0].url };
  }
  return { rba, banks, on: String(on).slice(0, 10) };
}

/**
 * The fee in a country's currency — the RR-257 chain record (steps, each its source, link, date and recheck days) and its plain line; or the
 * plain reason none is shown. Rates older than RECHECK_DAYS are refused (as RR-257).
 */
export function feeInCurrency(fee, country, rates) {
  if (!fee?.ok) return { line: "no fee was read", steps: [] };
  const cur = CURRENCY_OF[country], said = `${fee.currency} ${fee.amount}`;
  if (!cur) return { line: `${said} — no official rate for ${country}'s currency is read by Visibility yet, so it is shown in ${fee.currency}`, steps: [] };
  if (cur === fee.currency) return { line: said, currency: cur, amount: fee.amount, steps: [] };
  const rba = rates?.rba, fresh = (d) => d && (Date.parse(rates.on) - Date.parse(d)) / 864e5 <= RECHECK_DAYS;
  if (!rba?.rates?.USD || fee.currency !== "AUD") return { line: `${said} — the Reserve Bank of Australia's rates could not be read today, so no ${cur} figure is shown`, steps: [] };
  const step = (from, to, rate, date, b) => ({ from, to, rate: Number(rate), said: rate, rateDate: date, source: b.source, short: b.short, link: b.link ?? b.page, recheckDays: RECHECK_DAYS });
  let steps;
  if (rba.rates[cur]) steps = [step("AUD", cur, rba.rates[cur], rba.date, { ...RBA, link: RBA.page })];
  else if (CENTRAL_BANKS[cur]) {
    const b = rates.banks?.[cur];
    if (!b || b.refused) return { line: `${said} — ${b?.refused ?? `${CENTRAL_BANKS[cur].source} was not read`}, so no ${cur} figure is shown`, steps: [], refused: b?.refused ?? null };
    if (!fresh(b.date)) return { line: `${said} — the latest rate in ${b.source} is of ${b.date}, more than ${RECHECK_DAYS} days old, so no ${cur} figure is shown`, steps: [], stale: b.date };
    steps = [step("AUD", "USD", rba.rates.USD, rba.date, { ...RBA, link: RBA.page }), step("USD", cur, b.rate, b.date, b)];
  } else return { line: `${said} — no central bank's official ${cur} rate is read by Visibility yet, so it is shown in ${fee.currency}`, steps: [] };
  if (!fresh(rba.date)) return { line: `${said} — the RBA's rate is more than ${RECHECK_DAYS} days old`, steps: [] };
  const amount = Math.round(steps.reduce((a, s) => a * s.rate, fee.amount));
  return { line: `${said} ≈ ${cur} ${amount.toLocaleString("en-US")} — an estimate from the ${steps.map((s) => `${s.short} rate of ${s.rateDate} (1 ${s.from} = ${s.said} ${s.to})`).join(" and the ")}, not an official price`, currency: cur, amount, steps };
}
