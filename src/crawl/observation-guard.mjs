/**
 * 🔴 THE GUARD THAT KEEPS REAL OBSERVATIONS OUT OF THE ENGINE REPOSITORY.
 *
 * A real crawl batch sat inside this product-neutral engine from 12 September until it was moved to
 * the external data repository. Nothing stopped it going in, so nothing would stop the next one. This
 * turns that into a test that fails.
 *
 * ── IT DOES NOT TRUST FILENAMES ────────────────────────────────────────────
 *
 * Renaming `bodies-2026-09-12.jsonl.br` to `fixture.bin` must not launder it, so classification reads
 * CONTENT: decompress if the bytes are brotli or gzip, then look at the record shapes. Location then
 * decides the verdict — the same bytes are forbidden here and expected in the external root.
 *
 * ── THE DISCRIMINATOR, AND WHY IT IS THIS ONE ──────────────────────────────
 *
 * Plenty of legitimate artifacts under runs/ carry `observation` records about real hosts — replays,
 * renders, evidence, audit findings. Measured on this tree, a rule of "observation record + real
 * host" would condemn fifteen files and take the suite down with it. Only a RAW CAPTURE carries
 * `crawl_run` records: the frontier, the seed source, the per-host request counts. That, and the
 * `{observation_id, body}` shape of a body archive, are what this guard looks for.
 *
 *   crawl_run records + a non-reserved host   -> a raw crawl batch
 *   {observation_id, body} records with real markup -> a body archive
 *   {from, to, from_observation_id} records   -> the link graph derived from that capture
 *   the same shapes with only example/reserved hosts -> a synthetic fixture, always allowed
 */
import { readFileSync } from "node:fs";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";

export const ARTIFACT_VERDICTS = Object.freeze({
  /** 1. a generic synthetic fixture — allowed anywhere */
  SYNTHETIC_FIXTURE: "SYNTHETIC_FIXTURE_ALLOWED",
  /** 2. a real observation artifact inside the engine — forbidden */
  REAL_IN_ENGINE: "REAL_OBSERVATION_ARTIFACT_IN_ENGINE_FORBIDDEN",
  /** 3. a real observation artifact in the external root — allowed, that is where it belongs */
  EXTERNAL_REFERENCE: "EXTERNAL_OBSERVATION_REFERENCE_ALLOWED",
  /** 4. the external data cannot be read — UNKNOWN, never silently clean */
  EXTERNAL_MISSING: "EXTERNAL_OBSERVATION_DATA_MISSING_UNKNOWN",
  /** anything that is not an observation artifact at all */
  NOT_AN_ARTIFACT: "NOT_AN_OBSERVATION_ARTIFACT",
});

/** Hosts that cannot belong to anyone, so material about them is by construction synthetic. */
const RESERVED_HOST = /(^|\.)(example\.(com|org|net)|example|invalid|test|localhost)$|^127\.|^0\.0\.0\.0$|^\[?::1\]?$/i;

const CRAWL_RUN_TYPES = new Set(["crawl_run", "crawl_run_correction"]);

/** brotli and gzip both get opened, so a compressed rename is classified on what it actually holds. */
export function decompressIfArchived(buf) {
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    try { return { bytes: gunzipSync(buf), compressed: true }; } catch { /* not really gzip */ }
  }
  try { return { bytes: brotliDecompressSync(buf), compressed: true }; } catch { /* not brotli */ }
  return { bytes: buf, compressed: false };
}

/**
 * What the bytes ARE, independent of where they sit or what they are called.
 * Returns `kind: null` for anything that is not an observation artifact.
 */
export function classifyBytes(raw) {
  const { bytes, compressed } = decompressIfArchived(raw);
  let text;
  try { text = bytes.toString("utf8"); } catch { return { kind: null, compressed }; }
  if (!text.includes("{")) return { kind: null, compressed };

  let crawlRuns = 0, bodyRecords = 0, observations = 0, edgeRecords = 0;
  const realHosts = new Set(), reservedHosts = new Set();

  const noteHost = (value) => {
    if (typeof value !== "string") return;
    try {
      const h = new URL(value).hostname;
      (RESERVED_HOST.test(h) ? reservedHosts : realHosts).add(h);
    } catch { /* not a URL */ }
  };

  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    let o;
    try { o = JSON.parse(t); } catch { continue; }

    if (CRAWL_RUN_TYPES.has(o?.record_type)) {
      crawlRuns++;
      for (const h of Object.keys(o?.perHostRequests ?? {})) {
        (RESERVED_HOST.test(h) ? reservedHosts : realHosts).add(h);
      }
    }
    if (o?.record_type === "observation") observations++;
    noteHost(o?.target?.ref ?? o?.canonical_url ?? o?.url);

    /* A link-graph record: one crawled link, carrying the observation it was seen on. */
    if (typeof o?.from_observation_id === "string" && typeof o?.from === "string" && typeof o?.to === "string") {
      edgeRecords++;
      noteHost(o.from);
      noteHost(o.to);
    }

    /* A body archive record: an id and the served markup. Its hosts live inside the markup. */
    if (typeof o?.observation_id === "string" && typeof o?.body === "string") {
      bodyRecords++;
      for (const m of o.body.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
        (RESERVED_HOST.test(m[1]) ? reservedHosts : realHosts).add(m[1]);
      }
    }
  }

  const kind = crawlRuns > 0 ? "raw-crawl-batch" : bodyRecords > 0 ? "body-archive" : edgeRecords > 0 ? "link-graph" : null;
  return { kind, compressed, crawlRuns, observations, bodyRecords, edgeRecords, realHosts: [...realHosts], reservedHosts: [...reservedHosts] };
}

/**
 * Content plus location gives the verdict. `location` is "engine" for a file tracked by this
 * repository and "external" for one read through a declared external root.
 */
export function classifyArtifact({ bytes, location }) {
  const shape = classifyBytes(bytes);
  if (shape.kind === null) return { ...shape, verdict: ARTIFACT_VERDICTS.NOT_AN_ARTIFACT };
  const real = shape.realHosts.length > 0;
  if (!real) return { ...shape, verdict: ARTIFACT_VERDICTS.SYNTHETIC_FIXTURE };
  return {
    ...shape,
    verdict: location === "engine" ? ARTIFACT_VERDICTS.REAL_IN_ENGINE : ARTIFACT_VERDICTS.EXTERNAL_REFERENCE,
  };
}

/**
 * Scan everything this repository tracks. Returns the forbidden list, which must be empty, together
 * with the population it scanned — a zero over nothing scanned proves nothing.
 */
export function scanEngineTree({ repo } = {}) {
  const root = repo ?? new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);

  const forbidden = [];
  let scanned = 0, artifacts = 0;
  for (const rel of tracked) {
    let bytes;
    try { bytes = readFileSync(`${root}/${rel}`); } catch { continue; }
    if (bytes.length === 0) continue;
    scanned++;
    const c = classifyArtifact({ bytes, location: "engine" });
    if (c.kind !== null) artifacts++;
    if (c.verdict === ARTIFACT_VERDICTS.REAL_IN_ENGINE) {
      forbidden.push({ path: rel, kind: c.kind, crawlRuns: c.crawlRuns, bodyRecords: c.bodyRecords, edgeRecords: c.edgeRecords, realHosts: c.realHosts.length, compressed: c.compressed });
    }
  }
  return { root, scanned, artifacts, forbidden };
}
