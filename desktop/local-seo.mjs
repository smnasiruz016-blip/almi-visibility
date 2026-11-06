/**
 * 🔴 RR-379 item 2 (owner, 6 Nov 2026) · LOCAL SEO, for any business with a place (a restaurant, a clinic, an office) and for the local
 * directories (AlmiHalal, AlmiHealth, AlmiArchitect). Generic: nothing here knows any product.
 *   · THE PROFILE: name, address, phone, hours, categories, website — the client's own words, kept once.
 *   · NAP CONSISTENCY: the profile against the client's own site (its pages and its LocalBusiness markup) and against Google's listing as
 *     DataForSEO's Google Maps data gives it (capped), and any listing the client pastes (Bing Places, Apple Business Connect, Facebook).
 *     A score, and each difference with its fix.
 *   · EXPORTS: LocalBusiness markup for the site, a Google Business Profile bulk-upload sheet, and where to go for Bing Places, Apple Business
 *     Connect and Facebook. The Google Business Profile API only if the client connects it himself (not in this version: import/export).
 *   · LOCAL RANK per city: where the business stands in Google's local (Maps) results for its words, by DataForSEO (capped).
 *   · REVIEWS: Google reviews by DataForSEO (capped) or pasted; grouped; polite reply drafts the client approves. Nothing is posted.
 *   · DIRECTORY MODE: places and professionals in a city from OpenStreetMap (open data, ODbL, named with its date), links only.
 * Pure: fetch and the paid buyer are handed in.
 */
export const LOCAL = Object.freeze({ mapsPath: "/serp/google/maps/live/advanced", reviewsPath: "/business_data/google/reviews", worstMaps: 0.01, worstReviews: 0.01, depth: 20, overpass: "https://overpass-api.de/api/interpreter", nominatim: "https://nominatim.openstreetmap.org/search" });
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const hostOf = (u) => { try { return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };
export const digits = (p) => { const d = String(p ?? "").replace(/\D+/g, ""); return d.length > 10 ? d.slice(-10) : d; };
const ADDR = Object.freeze({ street: "st", road: "rd", avenue: "ave", boulevard: "blvd", drive: "dr", lane: "ln", suite: "ste", floor: "fl", north: "n", south: "s", east: "e", west: "w", building: "bldg" });
export const addrKey = (a) => clean(a).toLowerCase().replace(/[.,#]/g, " ").split(/\s+/).filter(Boolean).map((w) => ADDR[w] ?? w).join(" ");
const nameKey = (n) => clean(n).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\b(the|ltd|llc|inc|pvt|limited|co)\b/g, "").replace(/\s+/g, " ").trim();

/** the client's profile, cleaned → { profile, missing } */
export function cleanProfile(p = {}) {
  const profile = { name: clean(p.name), street: clean(p.street), city: clean(p.city), region: clean(p.region), postcode: clean(p.postcode), country: clean(p.country), phone: clean(p.phone), website: clean(p.website), hours: clean(p.hours), categories: clean(p.categories), keywords: clean(p.keywords), cities: clean(p.cities) };
  const missing = ["name", "street", "city", "country", "phone"].filter((k) => !profile[k]);
  return { profile, missing };
}
export const fullAddress = (p) => [p.street, p.city, p.region, p.postcode, p.country].filter(Boolean).join(", ");

/** what the client's own site says: phones, the address lines that hold the profile's street, LocalBusiness markup */
export function siteNap(pages, profile) {
  const phones = new Set(), addresses = new Set(), names = new Set(), markup = [];
  const street = addrKey(profile.street);
  for (const p of pages ?? []) {
    const text = String(p.text ?? "");
    for (const m of text.match(/(?:\+?\d[\d ()-]{7,}\d)/g) ?? []) { const d = digits(m); if (d.length >= 7) phones.add(d); }
    if (street && addrKey(text).includes(street)) addresses.add(street);
    const re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi; let m;
    while ((m = re.exec(String(p.html ?? "")))) { try { const j = JSON.parse(m[1]); for (const n of [].concat(j["@graph"] ?? j)) if (n?.address || n?.telephone) markup.push({ page: p.url, name: clean(n.name), phone: clean(n.telephone), address: typeof n.address === "string" ? clean(n.address) : clean([n.address?.streetAddress, n.address?.addressLocality, n.address?.postalCode].filter(Boolean).join(", ")) }); } catch { /* the technical check says it */ } }
    if (nameKey(profile.name) && nameKey(text).includes(nameKey(profile.name))) names.add(profile.name);
  }
  return { phones: [...phones], addresses: [...addresses], names: [...names], markup };
}
/** Google's listing from DataForSEO's Google Maps result: the business found by its phone, site or name → { title, address, phone, url, rating, votes, category, cid, rank } */
export function mapsMatch(result, profile) {
  const items = (result ?? []).flatMap((r) => r?.items ?? []).filter((x) => x?.type === "maps_search" || x?.title);
  const ph = digits(profile.phone), host = hostOf(profile.website), nk = nameKey(profile.name);
  const hit = items.find((x) => (ph && digits(x.phone) === ph) || (host && hostOf(x.url ?? x.domain ?? "") === host)) ?? items.find((x) => nk && nameKey(x.title) === nk);
  return { found: hit ? { title: clean(hit.title), address: clean(hit.address), phone: clean(hit.phone), url: hit.url ?? null, rating: Number(hit.rating?.value) || null, votes: Number(hit.rating?.votes_count) || 0, category: clean(hit.category), cid: hit.cid ?? null, placeId: hit.place_id ?? null, claimed: hit.is_claimed ?? null, rank: hit.rank_group ?? null } : null,
    top: items.slice(0, 10).map((x) => ({ rank: x.rank_group, title: clean(x.title), rating: Number(x.rating?.value) || null, votes: Number(x.rating?.votes_count) || 0, category: clean(x.category) })) };
}
export const mapsTask = (keyword, { coordinate = null, location = null, language = "en", depth = LOCAL.depth }) => ({ keyword, ...(coordinate ? { location_coordinate: coordinate } : { location_name: location }), language_code: language, depth });

/**
 * NAP consistency: each source's name, address and phone against the profile → { score, rows:[{source, field, ok, said}], lines }
 * sources: [{ source, name, address, phone }] (the site, Google's listing, each pasted listing)
 */
export function napConsistency(profile, sources) {
  const rows = [], want = { name: nameKey(profile.name), address: addrKey(profile.street), phone: digits(profile.phone) };
  for (const s of sources) {
    if (s.name != null) rows.push({ source: s.source, field: "name", ok: nameKey(s.name) === want.name || nameKey(s.name).includes(want.name), said: s.name });
    if (s.address != null) rows.push({ source: s.source, field: "address", ok: Boolean(want.address) && addrKey(s.address).includes(want.address), said: s.address });
    if (s.phone != null) rows.push({ source: s.source, field: "phone", ok: Boolean(want.phone) && digits(s.phone) === want.phone, said: s.phone });
  }
  const score = rows.length ? Math.round((rows.filter((r) => r.ok).length / rows.length) * 100) : null;
  const lines = rows.map((r) => (r.ok ? { ok: true, area: "Name, address, phone", line: `${r.source}: the ${r.field} matches.` } : { ok: false, area: "Name, address, phone", line: `${r.source}: the ${r.field} is "${r.said || "(missing)"}".`, problem: `${r.source} shows a different ${r.field}: "${r.said || "(missing)"}".`, solution: `Change it on ${r.source} to exactly: ${r.field === "address" ? fullAddress(profile) : profile[r.field]}. The same name, address and phone everywhere helps Google trust the listing.`, ready: [{ label: `Your ${r.field}`, text: r.field === "address" ? fullAddress(profile) : profile[r.field], source: "your profile in Visibility" }] }));
  return { score, rows, lines };
}

/* ── exports (the client copies; nothing is sent) ── */
export function localBusinessJsonLd(p, { type = "LocalBusiness" } = {}) {
  const hours = parseHours(p.hours);
  return JSON.stringify({ "@context": "https://schema.org", "@type": type, name: p.name, ...(p.website ? { url: p.website } : {}), telephone: p.phone, address: { "@type": "PostalAddress", streetAddress: p.street, addressLocality: p.city, ...(p.region ? { addressRegion: p.region } : {}), ...(p.postcode ? { postalCode: p.postcode } : {}), addressCountry: p.country }, ...(hours.length ? { openingHoursSpecification: hours } : {}) }, null, 2);
}
const DAYS = Object.freeze({ mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" });
/** "Mon-Fri 09:00-17:00; Sat 10:00-14:00" → schema.org OpeningHoursSpecification rows (only what parses) */
export function parseHours(h) {
  const out = [], order = Object.keys(DAYS);
  for (const part of String(h ?? "").split(/[;\n]/)) {
    const m = /^\s*([a-z]{3})[a-z]*\s*(?:-\s*([a-z]{3})[a-z]*)?\s+(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})\s*$/i.exec(part); if (!m) continue;
    const a = order.indexOf(m[1].toLowerCase()), b = m[2] ? order.indexOf(m[2].toLowerCase()) : a; if (a < 0 || b < 0) continue;
    const days = []; for (let i = a; ; i = (i + 1) % 7) { days.push(DAYS[order[i]]); if (i === b) break; }
    out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: `${m[3].padStart(2, "0")}:${m[4]}`, closes: `${m[5].padStart(2, "0")}:${m[6]}` });
  }
  return out;
}
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
/** Google Business Profile's bulk-upload sheet (the columns of Google's own spreadsheet template) */
export const GBP_COLUMNS = Object.freeze(["Store code", "Business name", "Address line 1", "Locality", "Administrative area", "Country / Region", "Postal code", "Primary phone", "Website", "Primary category"]);
export const gbpSheet = (p) => [GBP_COLUMNS.map(csvCell).join(","), ["1", p.name, p.street, p.city, p.region, p.country, p.postcode, p.phone, p.website, (p.categories || "").split(",")[0]].map(csvCell).join(",")].join("\n");
export const LISTING_PLACES = Object.freeze([
  { name: "Google Business Profile", url: "https://business.google.com/", how: "Sign in, add or claim the business, and use the profile's exact name, address and phone. Several places: Business Profile Manager → Add business → Import businesses (the sheet below)." },
  { name: "Bing Places for Business", url: "https://www.bingplaces.com/", how: "Sign in and import your Google Business Profile, or add the business with the same name, address and phone." },
  { name: "Apple Business Connect", url: "https://businessconnect.apple.com/", how: "Sign in with an Apple Account, claim the place on Apple Maps, and use the same name, address, phone and hours." },
  { name: "Facebook page", url: "https://www.facebook.com/business/", how: "In the page's About section, use the same name, address, phone and hours." },
]);

/* ── directory mode: places from OpenStreetMap (open data) ── */
export const DIRECTORY_KINDS = Object.freeze({
  mosque: { label: "Mosques", q: 'nwr["amenity"="place_of_worship"]["religion"="muslim"]' },
  halal: { label: "Halal food", q: 'nwr["diet:halal"~"yes|only"]' },
  doctor: { label: "Doctors", q: 'nwr["amenity"="doctors"]' },
  hospital: { label: "Hospitals", q: 'nwr["amenity"="hospital"]' },
  clinic: { label: "Clinics", q: 'nwr["amenity"="clinic"]' },
  dentist: { label: "Dentists", q: 'nwr["amenity"="dentist"]' },
  architect: { label: "Architects", q: 'nwr["office"="architect"]' },
});
export const OSM_SOURCE = (on) => ({ name: "OpenStreetMap contributors (ODbL)", url: "https://www.openstreetmap.org/copyright", checked: on });
/** an Overpass query for one kind in a named city (area by name) */
export const overpassQuery = (kind, city) => `[out:json][timeout:60];area["name"="${String(city).replace(/"/g, "")}"]["boundary"="administrative"]->.a;(${DIRECTORY_KINDS[kind].q}(area.a););out center tags 200;`;
/** Overpass' documented answer → places [{ name, address, phone, website, lat, lon, osm }] — only places with a name */
export function placesOf(j) {
  return (j?.elements ?? []).map((e) => { const t = e.tags ?? {}; return { name: clean(t.name), address: clean([t["addr:housenumber"], t["addr:street"], t["addr:city"], t["addr:postcode"]].filter(Boolean).join(" ")), phone: clean(t.phone ?? t["contact:phone"]), website: clean(t.website ?? t["contact:website"]), lat: e.lat ?? e.center?.lat ?? null, lon: e.lon ?? e.center?.lon ?? null, osm: `https://www.openstreetmap.org/${e.type}/${e.id}` }; }).filter((p) => p.name).sort((a, b) => a.name.localeCompare(b.name));
}
/** a directory page draft for one city and kind: links only, every place with its source and date; noindex until it has enough places */
export function directoryPage({ kind, city, places, on, product }) {
  const k = DIRECTORY_KINDS[kind], src = OSM_SOURCE(on), enough = places.length >= 6, esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const title = `${k.label} in ${city}`;
  const rows = places.map((p) => `<li><b>${esc(p.name)}</b>${p.address ? ` — ${esc(p.address)}` : ""}${p.phone ? ` · ${esc(p.phone)}` : ""}${p.website ? ` · <a href="${esc(/^https?:/.test(p.website) ? p.website : `https://${p.website}`)}" rel="nofollow noopener">website</a>` : ""} · <a href="${esc(p.osm)}" rel="nofollow noopener">on the map</a></li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}${product ? ` | ${esc(product)}` : ""}</title><meta name="description" content="${esc(`${places.length} ${k.label.toLowerCase()} in ${city}, with address and links, from OpenStreetMap (checked ${on}).`)}">${enough ? "" : '<meta name="robots" content="noindex,follow">'}</head><body><h1>${esc(title)}</h1><p>${places.length} places listed. Source: <a href="${src.url}">${esc(src.name)}</a>, checked ${esc(on)}. Details can change: check with each place before you go.</p><ul>${rows}</ul></body></html>`;
  return { title, slug: `${kind}-in-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, places: places.length, indexable: enough, html, source: src };
}
