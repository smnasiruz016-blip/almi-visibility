/**
 * DISCOVERY → COMPARATOR BUNDLE. The seam between "what is here" and "is it right".
 *
 * 🔴 SUBJECTS ARE PAGE URLs WHEREVER A PAGE EXISTS. The contract scores a control AT THE PAGE LEVEL,
 * so a comparator's verdict has to be attributable to a page or it cannot be scored at all. Where a
 * candidate's source file maps to a route that a captured page serves, the candidate takes that
 * page's URL as its subject; otherwise it keeps its file path and is reported as a non-page subject.
 *
 * 🔴 AND EVERY PAGE GETS A DISPOSITION FROM EVERY COMPARATOR. `pageSubjects` below is the full list
 * of captured pages; the runner emits NOT_APPLICABLE for any (comparator, page) pair that produced
 * no outcome. Without that, a page nobody examined would simply be absent from the findings — and
 * absence is exactly what must never be readable as "clean".
 */
import { routeOf, pathOfUrl, sitemapUrlsOf, renderedLinksOf } from "./corpus.mjs";
import {
  discoverProducers, discoverValueClaims, discoverAuthorityClaims,
  discoverCollections, discoverCountClaims, discoverSourceLinks,
} from "./candidates.mjs";

/** Cache signals live in the archived headers record; the shape is HTTP's, not a product's. */
function responsesOf(headersRecord) {
  const requests = Array.isArray(headersRecord?.requests) ? headersRecord.requests : [];
  return requests.map((r) => ({ headers: r.headers ?? r.responseHeaders ?? {}, html: undefined }));
}

function observationOf(page) {
  const req = Array.isArray(page.headersRecord?.requests) ? page.headersRecord.requests[0] : null;
  const headers = req?.headers ?? req?.responseHeaders ?? {};
  const get = (n) => Object.entries(headers).find(([k]) => k.toLowerCase() === n)?.[1] ?? null;
  const canonical = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(page.html)?.[1] ?? null;
  const robots = /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i.exec(page.html)?.[1] ?? null;
  return {
    status: Number.isInteger(req?.status) ? req.status : Number.isInteger(page.headersRecord?.status) ? page.headersRecord.status : null,
    redirectTo: get("location"),
    robotsAllowed: true,
    noindexed: robots !== null && /noindex/i.test(robots),
    canonical,
    hasContent: page.html.length > 0,
  };
}

/**
 * @param {object} input
 * @param {{path:string,text:string}[]} input.files          the complete repository tree
 * @param {{url:string,html:string,headersRecord:object}[]} input.pages   archived responses
 * @param {string[]} input.sitemapXml                        sitemap documents
 * @param {object} input.registry                            the declared source registry
 * @param {number} input.missRunRequired                     declared, never defaulted
 */
export function buildBundle({ files, pages, sitemapXml, registry, missRunRequired } = {}) {
  if (!Array.isArray(files) || !Array.isArray(pages)) {
    throw new TypeError("buildBundle: files and pages are both required — there is no empty default, because an empty input would examine nothing and report no failures");
  }

  const routeToPage = new Map();
  for (const p of pages) routeToPage.set(pathOfUrl(p.url), p);
  const subjectFor = (filePath, fallback) => {
    const r = routeOf(filePath);
    const page = r ? routeToPage.get(r.route) : null;
    return page ? page.url : fallback;
  };

  /* ---- A ---- */
  const producers = discoverProducers(files);
  const valueClaims = discoverValueClaims(files, producers);
  const aClaims = valueClaims.map((c, i) => ({
    id: subjectFor(c.origin, `${c.origin}#value-${i}`), locator: c.location, statedValues: c.value, _c: c,
  }));
  const aProducers = producers.map((p) => ({ id: p.boundTo, locator: p.location, producedValues: p.value }));
  const aBindings = {};
  for (const c of aClaims) if (c._c.boundTo) (aBindings[c.id] ??= []).push(c._c.boundTo);

  /* ---- B ---- */
  const authorityClaims = discoverAuthorityClaims(files);
  const bClaims = authorityClaims.map((c, i) => ({
    id: subjectFor(c.origin, `${c.origin}#authority-${i}`), locator: c.location,
    authority: c.value.host, predicate: "cited-as-authority", statedValue: c.value.host,
  }));

  /* ---- C ---- */
  const routes = pages.map((p) => ({
    id: p.url, locator: p.url,
    declaredMode: declaredModeOf(files, pathOfUrl(p.url)),
    responses: responsesOf(p.headersRecord),
  }));

  /* ---- D ---- */
  const sitemapUrls = [...new Set((sitemapXml ?? []).flatMap((x) => sitemapUrlsOf(x)))];
  const observations = {};
  for (const p of pages) observations[p.url] = observationOf(p);

  /* ---- E ---- */
  const collections = discoverCollections(files);
  const countClaims = discoverCountClaims(files, collections);
  const eStatements = countClaims.map((c, i) => ({
    id: subjectFor(c.origin, `${c.origin}#count-${i}`), locator: c.location, statedCount: c.value, collectionRef: c.boundTo,
  }));
  const eCollections = {};
  for (const c of collections) eCollections[c.boundTo] = Array.from({ length: c.value }, (_, i) => i);

  /* ---- F ---- */
  const sourceLinks = discoverSourceLinks(files);
  const byRoute = new Map(sourceLinks.filter((c) => c.boundTo).map((c) => [c.boundTo, c]));
  const fPages = pages.map((p) => {
    const src = byRoute.get(pathOfUrl(p.url)) ?? null;
    return {
      id: p.url, locator: p.url,
      sourceLinks: src ? src.value : null,
      renderedLinks: renderedLinksOf(p.html),
      renderState: p.renderState ?? "COMPLETE",
      renderReason: p.renderReason,
    };
  }).filter((x) => x.sourceLinks !== null);

  const allCandidates = [...producers, ...valueClaims, ...authorityClaims, ...collections, ...countClaims, ...sourceLinks];
  return {
    pageSubjects: pages.map((p) => p.url),
    claimProducer: { claims: aClaims.map(({ _c, ...rest }) => rest), producers: aProducers, bindings: aBindings },
    claimRegistry: { claims: bClaims, registry },
    declaredServed: { routes, missRunRequired },
    sitemapObserved: { sitemapUrls, observations },
    countData: { statements: eStatements, collections: eCollections },
    linkRender: { pages: fPages },
    populations: {
      discovered: allCandidates.length,
      bound: allCandidates.filter((c) => c.bound).length,
      unbound: allCandidates.filter((c) => !c.bound).length,
      byComparator: ["A", "B", "E", "F"].reduce((acc, k) => {
        const of = allCandidates.filter((c) => c.comparator === k);
        acc[k] = { discovered: of.length, bound: of.filter((c) => c.bound).length, unbound: of.filter((c) => !c.bound).length };
        return acc;
      }, {}),
    },
    candidates: allCandidates,
  };
}

/**
 * A route's DECLARED delivery mode, read from the source that serves it.
 *
 * 🔴 DECLARED BY THE SOURCE OR NOT AT ALL. `dynamic`/`revalidate`/`fetchCache` are framework
 * exports with published meanings. Where the serving file declares none, this returns null and the
 * comparator answers UNKNOWN — it does not assume a default, because a framework's default is a
 * fact about the framework version, not about this route.
 */
export function declaredModeOf(files, path) {
  const f = files.find((x) => routeOf(x.path)?.route === path);
  if (!f) return null;
  if (/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(f.text)) return "UNCACHED";
  if (/export\s+const\s+dynamic\s*=\s*["']force-static["']/.test(f.text)) return "CACHED";
  if (/export\s+const\s+revalidate\s*=\s*\d+/.test(f.text)) return "CACHED";
  return null;
}
