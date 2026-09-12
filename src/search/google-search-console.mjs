/**
 * THE ONE ADAPTER — Google Search Console, behind SearchDataProvider.
 *
 * ── 🔴 SECRETS: THE STANDING OWNER RULING, UNCHANGED ────────────────────────
 *
 * The key file is named by the env var GSC_SERVICE_ACCOUNT_KEY_FILE and is read
 * straight into the signer. NOTHING derived from it is printed, logged, hashed
 * or LENGTH-MEASURED — a length is a measurement of a secret and this file takes
 * none. The only identifiers that may appear in a log are the project id and the
 * property id, both of which the owner has published to us in plain text.
 *
 * 🔴 AND THE SCOPE IS READ-ONLY BY CONSTRUCTION, NOT BY CONVENTION.
 *
 * `SCOPE` is a frozen constant naming `webmasters.readonly` and there is no
 * parameter to change it. A token minted here CANNOT write, so "no production
 * write" is enforced by the credential rather than by everyone remembering.
 * The write scope is not imported, not referenced, and not spelled anywhere in
 * this repository.
 *
 * ── WHY `fetchImpl` IS INJECTABLE ───────────────────────────────────────────
 *
 * So the pagination law can be tested against a mock that returns full pages
 * for ever. A network call cannot be made to lie on demand, and an untested
 * cap-handler is how the 11 September defect shipped.
 */

import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";

import { costRecord, propertyRecord, assertProviderShape } from "./provider.mjs";
import { drainPages } from "./paginate.mjs";
import { createCostGovernor } from "../cost/governor.mjs";

/** 🔴 READ-ONLY. Least privilege. There is no setter for this. */
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://www.googleapis.com/webmasters/v3";

export const PROVIDER_ID = "google-search-console";

const b64u = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

/**
 * Mint an access token from the service-account key.
 *
 * 🔴 The catch block reports the STATUS and Google's own error CODE and nothing
 * else. A generic `JSON.stringify(err)` here would be the single most likely
 * place for key material to reach a log, because the request body contains the
 * signed assertion.
 */
async function mintToken(key, fetchImpl) {
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${b64u({ alg: "RS256", typ: "JWT" })}.${b64u({
    iss: key.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(key.private_key, "base64url")}`;

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`token exchange failed: HTTP ${res.status} ${body.error ?? "(no code)"}`);
  }
  return body.access_token;
}

/** Search Console's own spelling of a property id tells you its kind. */
function propertyTypeOf(siteUrl) {
  return siteUrl.startsWith("sc-domain:") ? "DOMAIN" : "URL_PREFIX";
}

/**
 * A DOMAIN property covers a hostname and every subdomain of it. A URL_PREFIX
 * property covers only its own host. Used to tell "measured zero" from
 * "never queried" — see query-state.mjs.
 */
export function propertyCovers(propertyId, hostname) {
  if (propertyId.startsWith("sc-domain:")) {
    const apex = propertyId.slice("sc-domain:".length).toLowerCase();
    const h = hostname.toLowerCase();
    return h === apex || h.endsWith(`.${apex}`);
  }
  try {
    return new URL(propertyId).hostname.toLowerCase() === hostname.toLowerCase();
  } catch {
    return false;
  }
}

export function createGoogleSearchConsoleProvider({
  keyFilePath,
  fetchImpl = fetch,
  now = () => new Date(),
  // 🔴 ITEM 45 — every call this adapter issues is charged to the run's
  // governor BEFORE it is issued. The default bounds a run at
  // DEFAULT_MAX_API_CALLS_PER_RUN calls and DEFAULT_MAX_WALL_CLOCK_MS.
  governor = createCostGovernor({ label: "google-search-console ingest run" }),
} = {}) {
  const path = keyFilePath ?? process.env.GSC_SERVICE_ACCOUNT_KEY_FILE;
  if (!path) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_KEY_FILE is not set. The adapter takes a PATH, never a key value — " +
        "a credential passed as a string ends up in shell history and process listings.",
    );
  }

  let tokenPromise = null;
  let apiCalls = 0;

  async function token() {
    if (!tokenPromise) {
      tokenPromise = (async () => {
        const key = JSON.parse(await readFile(path, "utf8"));
        governor.charge();
        apiCalls += 1;
        return mintToken(key, fetchImpl);
      })();
    }
    return tokenPromise;
  }

  async function authed(url, init = {}) {
    const t = await token();
    governor.charge();
    apiCalls += 1;
    return fetchImpl(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` },
    });
  }

  /**
   * 🔴 `pullCalls` is what THIS pull issued; `apiCalls` (the closure counter)
   * is the whole run. They were one field until 12 September 2026, and the
   * per-pull record carried the run's total under the per-pull name.
   */
  function cost(pullCalls, basisSuffix = "") {
    return costRecord({
      provider: PROVIDER_ID,
      apiCalls: pullCalls,
      apiCallsCumulative: apiCalls,
      billableUnits: 0,
      currency: "USD",
      amount: 0,
      amountState: "ZERO_BY_TARIFF",
      basis:
        "Search Console API is free; no billing account attached to almiworld-hq-502102" + basisSuffix,
    });
  }

  const provider = {
    providerId: PROVIDER_ID,

    async listProperties() {
      const observedAt = now().toISOString();
      const res = await authed(`${API_ROOT}/sites`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`sites.list failed: HTTP ${res.status} ${body.error?.message ?? "(no message)"}`);
      }
      return (body.siteEntry ?? []).map((e) =>
        propertyRecord({
          propertyId: e.siteUrl,
          propertyType: propertyTypeOf(e.siteUrl),
          permissionLevel: e.permissionLevel,
          // 🔴 GRANTED because sites.list RETURNED it, which is evidence. We do
          // not upgrade anything to GRANTED on the strength of a 200 elsewhere.
          authState: "GRANTED",
          observedAt,
        }),
      );
    },

    async queryRows({ propertyId, startDate, endDate, dimensions = [], filters = [], rowLimitPerRequest = 25000, maxRequests = 20 }) {
      const observedAt = now().toISOString();
      const url = `${API_ROOT}/sites/${encodeURIComponent(propertyId)}/searchAnalytics/query`;
      let lastStatus = null;
      const callsBefore = apiCalls;

      const fetchPage = async ({ startRow, rowLimit }) => {
        const bearer = await token();
        governor.charge();
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearer}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions,
            rowLimit,
            startRow,
            ...(filters.length ? { dimensionFilterGroups: [{ filters }] } : {}),
          }),
        });
        apiCalls += 1;
        lastStatus = res.status;
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(`searchAnalytics HTTP ${res.status}: ${body.error?.message ?? "(no message)"}`);
          err.httpStatus = res.status;
          throw err;
        }
        return { rows: Array.isArray(body.rows) ? body.rows : [] };
      };

      const drained = await drainPages(fetchPage, { rowLimitPerRequest, maxRequests });

      return {
        ...drained,
        propertyId,
        httpStatus: lastStatus,
        // 🔴 LAW-BOUND-1. PR #35 returned requestCount and exhausted without
        // these, so "one request drained 1,527 rows" could not be checked
        // against the limit that made it possible. The bounds travel WITH the
        // result, so a report can never be printed without them.
        rowLimitPerRequest,
        maxRequests,
        // 🔴 NOT MEASURED and said so. Deriving it from the returned rows would
        // report the last day WE happened to receive, not the last day Google
        // holds — and GSC lags by two to three days.
        latestDateWithData: null,
        // Calls THIS pull issued: its requests, plus the token exchange if this
        // was the pull that minted it. Counted from the counter, not assumed.
        cost: cost(
          apiCalls - callsBefore,
          drained.truncationReason === "API_ERROR" ? "; call count includes the failed request" : "",
        ),
        observedAt,
      };
    },
  };

  return assertProviderShape(provider);
}
