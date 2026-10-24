/**
 * 🔴 RR-318 · THE WORLD'S COUNTRIES, ONCE (owner: "196 countries → only the countries where OET is really accepted"). The list is AlmiWorld's
 * own canonical list (almi-data src/countries.ts: 197 countries, the family's reconciliation point), copied here as names only, so the app
 * ships it. Each country has the other ways people write it ("NZ", "UK", "Dubai") and the words that say someone COMES FROM it ("Pakistani")
 * — the owner's sameness rule: the country a person comes from never splits a question; the country they go to does.
 * Pure: names in, names out.
 */
export const COUNTRIES = Object.freeze("Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei Darussalam|Bulgaria|Burkina Faso|Burundi|Cabo Verde|Cambodia|Cameroon|Canada|Central African Republic|Chad|Chile|China|Colombia|Comoros|Costa Rica|Côte d'Ivoire|Croatia|Cuba|Cyprus|Czech Republic|Democratic Republic of the Congo|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Federated States of Micronesia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Republic of the Congo|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|São Tomé and Príncipe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Türkiye|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City (Holy See)|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe".split("|"));
export const COUNTRY_LIST_SOURCE = "AlmiWorld's own country list (almi-data, 197 countries)";
/* RR-320 D · Search Console's country dimension names a country by its ISO 3166-1 alpha-3 code ("pak"); the same order as COUNTRIES
 * (Kosovo is "XKK", the code Google uses) — checked against the UN's M49 list (unstats.un.org), 23 Oct 2026 */
const ISO3 = "AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN BOL BIH BWA BRA BRN BGR BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM CRI CIV HRV CUB CYP CZE COD DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST SWZ ETH FSM FJI FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN IRQ IRL ISR ITA JAM JPN JOR KAZ KEN KIR XKK KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX MDA MCO MNG MNE MAR MOZ MMR NAM NRU NPL NLD NZL NIC NER NGA PRK MKD NOR OMN PAK PLW PSE PAN PNG PRY PER PHL POL PRT QAT COG ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM ZAF KOR SSD ESP LKA SDN SUR SWE CHE SYR TWN TJK TZA THA TLS TGO TON TTO TUN TUR TKM TUV UGA UKR ARE GBR USA URY UZB VUT VAT VEN VNM YEM ZMB ZWE".split(" ");
/** a country's name from Search Console's code ("pak" → Pakistan), or null for a code outside the 197 (a territory) */
export const countryOfCode = (code) => { const i = ISO3.indexOf(String(code ?? "").toUpperCase()); return i >= 0 ? COUNTRIES[i] : null; };
export const ISO3_CODES = Object.freeze([...ISO3]);
/* the other ways a country is written — a city that stands for its country in a search ("OET score for Dubai") counts as that country */
const ALIASES = Object.freeze({ "United Kingdom": ["UK", "U.K.", "Britain", "Great Britain", "England", "Scotland", "Wales", "Northern Ireland", "NHS"], "United States": ["US", "U.S.", "USA", "America"], "United Arab Emirates": ["UAE", "Dubai", "Abu Dhabi", "Sharjah"], "New Zealand": ["NZ", "Aotearoa"], "Saudi Arabia": ["KSA", "Saudi", "Riyadh", "Jeddah"], "Australia": ["Aus"], "Türkiye": ["Turkey"], "Czech Republic": ["Czechia"], "Netherlands": ["Holland"], "South Korea": ["Korea"], "Ireland": ["Republic of Ireland", "Eire"], "Philippines": ["the Philippines"], "Qatar": ["Doha"], "Côte d'Ivoire": ["Ivory Coast"] });
/* who COMES FROM a country: these words never split a question (owner's sameness rule) */
const DEMONYMS = Object.freeze({ Pakistan: ["Pakistani", "Pakistanis"], India: ["Indian", "Indians"], Philippines: ["Filipino", "Filipinos", "Filipina", "Pinoy"], Nigeria: ["Nigerian", "Nigerians"], Bangladesh: ["Bangladeshi"], Nepal: ["Nepali", "Nepalese"], "Sri Lanka": ["Sri Lankan"], Kenya: ["Kenyan"], Ghana: ["Ghanaian"], Egypt: ["Egyptian"], Brazil: ["Brazilian"], Zimbabwe: ["Zimbabwean"], Iran: ["Iranian"], Jordan: ["Jordanian"], "Saudi Arabia": ["Saudi national"] });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAMES = [...COUNTRIES.map((c) => [c, c]), ...Object.entries(ALIASES).flatMap(([c, xs]) => xs.map((x) => [x, c]))].sort((a, b) => b[0].length - a[0].length);
/* a short capitalised alias (UK, US, NZ) counts only as written in capitals; a full name in any case */
const LOWER_OK = new Set(["UK", "USA", "UAE", "NZ", "KSA", "NHS"]);
const RE = NAMES.map(([w, c]) => [new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, w.length <= 3 ? "u" : "iu"), c, w]);

/** The countries a text names — each once, as its canonical name, in the order they stand. "oet nz" → New Zealand (searches are lower case). */
export function countriesIn(text, { lowerCaseShort = true } = {}) {
  let s = ` ${String(text ?? "")} `;
  const found = [];
  for (const [re, c, w] of RE) {
    const r = lowerCaseShort && LOWER_OK.has(w) ? new RegExp(re.source, "iu") : re; // "us" and "aus" are words; "nz", "uk", "uae" are not
    const m = r.exec(s); if (!m) continue;
    if (!found.some((f) => f.c === c)) found.push({ c, at: m.index });
    s = s.slice(0, m.index) + " ".repeat(m[0].length) + s.slice(m.index + m[0].length); // "Northern Ireland" is not also Ireland
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.c);
}
/** The countries a person COMES FROM in a text ("Pakistani nurses", "from India") — never where they go. */
export function originsIn(text) {
  const s = String(text ?? ""), out = new Set();
  for (const [c, xs] of Object.entries(DEMONYMS)) for (const x of xs) if (new RegExp(`(?<![\\p{L}])${esc(x)}(?![\\p{L}])`, "iu").test(s)) out.add(c);
  for (const m of s.matchAll(/\bfrom\s+((?:the\s+)?[\p{L}' .-]{2,40})/giu)) for (const c of countriesIn(m[1]).slice(0, 1)) out.add(c);
  return [...out];
}
/** Where a search is about: the countries it names that are NOT where the person comes from. */
export const destinationsIn = (text) => { const o = new Set(originsIn(text)); return countriesIn(text).filter((c) => !o.has(c)); };
/** the ways a country is written, for finding it on a page */
export const namesOf = (country) => [country, ...(ALIASES[country] ?? [])];
export const slugOf = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* RR-321 D7 ("no venue there: say so and give the NEAREST venues"): the UN's M49 sub-regions (unstats.un.org/unsd/methodology/m49) — the
 * nearest venues to a country are those in its own sub-region; Kosovo and Taiwan are placed with their neighbours, which M49 lists apart */
export const REGIONS_SOURCE = "the UN's M49 sub-regions (unstats.un.org/unsd/methodology/m49)";
const REGION_LIST = Object.freeze({
  "Southern Asia": "Afghanistan|Bangladesh|Bhutan|India|Iran|Maldives|Nepal|Pakistan|Sri Lanka",
  "South-eastern Asia": "Brunei Darussalam|Cambodia|Indonesia|Laos|Malaysia|Myanmar|Philippines|Singapore|Thailand|Timor-Leste|Vietnam",
  "Eastern Asia": "China|Japan|Mongolia|North Korea|South Korea|Taiwan",
  "Central Asia": "Kazakhstan|Kyrgyzstan|Tajikistan|Turkmenistan|Uzbekistan",
  "Western Asia": "Armenia|Azerbaijan|Bahrain|Cyprus|Georgia|Iraq|Israel|Jordan|Kuwait|Lebanon|Oman|Palestine|Qatar|Saudi Arabia|Syria|Türkiye|United Arab Emirates|Yemen",
  "Northern Africa": "Algeria|Egypt|Libya|Morocco|Sudan|Tunisia",
  "Eastern Africa": "Burundi|Comoros|Djibouti|Eritrea|Ethiopia|Kenya|Madagascar|Malawi|Mauritius|Mozambique|Rwanda|Seychelles|Somalia|South Sudan|Tanzania|Uganda|Zambia|Zimbabwe",
  "Middle Africa": "Angola|Cameroon|Central African Republic|Chad|Democratic Republic of the Congo|Equatorial Guinea|Gabon|Republic of the Congo|São Tomé and Príncipe",
  "Southern Africa": "Botswana|Eswatini|Lesotho|Namibia|South Africa",
  "Western Africa": "Benin|Burkina Faso|Cabo Verde|Côte d'Ivoire|Gambia|Ghana|Guinea|Guinea-Bissau|Liberia|Mali|Mauritania|Niger|Nigeria|Senegal|Sierra Leone|Togo",
  "Northern Europe": "Denmark|Estonia|Finland|Iceland|Ireland|Latvia|Lithuania|Norway|Sweden|United Kingdom",
  "Western Europe": "Austria|Belgium|France|Germany|Liechtenstein|Luxembourg|Monaco|Netherlands|Switzerland",
  "Southern Europe": "Albania|Andorra|Bosnia and Herzegovina|Croatia|Greece|Italy|Kosovo|Malta|Montenegro|North Macedonia|Portugal|San Marino|Serbia|Slovenia|Spain|Vatican City (Holy See)",
  "Eastern Europe": "Belarus|Bulgaria|Czech Republic|Hungary|Moldova|Poland|Romania|Russia|Slovakia|Ukraine",
  "Northern America": "Canada|United States",
  "Central America": "Belize|Costa Rica|El Salvador|Guatemala|Honduras|Mexico|Nicaragua|Panama",
  "Caribbean": "Antigua and Barbuda|Bahamas|Barbados|Cuba|Dominica|Dominican Republic|Grenada|Haiti|Jamaica|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Trinidad and Tobago",
  "South America": "Argentina|Bolivia|Brazil|Chile|Colombia|Ecuador|Guyana|Paraguay|Peru|Suriname|Uruguay|Venezuela",
  "Australia and New Zealand": "Australia|New Zealand",
  "Melanesia": "Fiji|Papua New Guinea|Solomon Islands|Vanuatu",
  "Micronesia": "Federated States of Micronesia|Kiribati|Marshall Islands|Nauru|Palau",
  "Polynesia": "Samoa|Tonga|Tuvalu",
});
export const REGION_OF = Object.freeze(Object.fromEntries(Object.entries(REGION_LIST).flatMap(([r, cs]) => cs.split("|").map((c) => [c, r]))));
/** the countries of a country's own sub-region (itself left out) */
export const neighboursOf = (country) => Object.entries(REGION_OF).filter(([c, r]) => r === REGION_OF[country] && c !== country).map(([c]) => c);
