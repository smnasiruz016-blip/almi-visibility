/**
 * 🔴 RR-414 B · the admin panel's pages (owner-only, noindex). Plain HTML on the site's own frame; every value escaped; a licence is named
 * by its short ref, never its key — except ONCE, on the page right after the owner grants a free licence (he sends that key to the person).
 */
import { frame } from "./pages.mjs";
import { PLANS } from "../desktop/licence.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (c) => (c === null || c === undefined ? "—" : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const CSS = `<style>.ap h1{text-align:left;margin:0 0 12px} .ap h2{text-align:left;font-size:20px;margin:22px 0 10px} .ap nav.apnav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.ap nav.apnav a{padding:6px 14px;border:1px solid var(--peach);border-radius:999px;text-decoration:none} .ap nav.apnav a[aria-current]{background:var(--coral);color:#1A1A2E}
.ap form.inline{display:inline-flex;gap:6px;align-items:center;margin:0} .ap form.inline input{min-height:32px;padding:2px 6px} .ap .pill.sm{min-height:32px;padding:4px 12px;font-size:13px}
.ap .grant{display:flex;flex-wrap:wrap;gap:10px;align-items:end} .ap .grant label{display:flex;flex-direction:column;font-size:13px;gap:4px} .ap .grant input,.ap .grant select{min-height:38px;padding:4px 8px}
.ap .key{font-family:ui-monospace,Consolas,monospace;font-size:15px;background:#fff;border:1px dashed var(--coral);padding:10px;border-radius:10px;word-break:break-all;user-select:all}
.ap .st{display:inline-block;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:600;background:#eee;color:#333} .ap .st.active,.ap .st.free{background:#D9F2EE;color:#0b6e62} .ap .st.trial{background:#FFF2D6;color:#8a5a00}
.ap .st.cancelled,.ap .st.revoked,.ap .st.expired,.ap .st.past.due{background:#FCE3E3;color:#9F1D1D} .ap .pager{display:flex;gap:10px;align-items:center;margin:12px 0} .tablewrap{overflow-x:auto}</style>`;

const NAV = [["/admin", "Overview"], ["/admin/customers", "Customers & licences"], ["/admin/leads", "Leads"], ["/owner", "Collectors & AI cost ↗"]];
const shell = (path, title, inner) => frame({ path, lite: true, noindex: true, title: `${title} — AlmiVisibility admin`, description: "Private.",
  body: `<section class="page"><div class="wrap ap">${CSS}<nav class="apnav" aria-label="Admin">${NAV.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${esc(t)}</a>`).join("")}<form method="post" action="/owner/sign-out" class="inline" style="margin-left:auto"><button class="pill ghost sm" type="submit">Sign out</button></form></nav><h1>${esc(title)}</h1>${inner}</div></section>` });
const stat = (n, label) => `<span class="stat"><b>${esc(n)}</b>${esc(label)}</span>`;
const msg = (m) => (m ? `<p class="card" role="status" style="padding:12px 16px">${esc(m)}</p>` : "");
const err = (m) => (m ? `<p class="err" role="alert">${esc(m)}</p>` : "");

export function adminHome({ sales, salesWhy = null, licences = 0, activeLicences = 0, freeLicences = 0, leads = 0, tests = 0, spend = null }) {
  const s = sales ?? {};
  return shell("/admin", "Admin", `<p class="note">Read only from Stripe — this panel never creates a charge, a refund or a price change.</p>
<h2>Sales</h2>${salesWhy ? `<p class="err">Stripe: ${esc(salesWhy)}</p>` : ""}
<div>${stat(sales ? s.activePaid : "—", "active paid licences")}${stat(sales ? usd(s.mrrCents) : "—", "MRR")}${stat(sales ? s.trialing : "—", "trialing")}${stat(sales ? s.pastDue : "—", "past due")}</div>
<div class="tablewrap"><table class="t"><tr><th></th><th>Last 7 days</th><th>Last 30 days</th></tr><tr><td>New sales</td><td>${sales ? s.new7 : "—"}</td><td>${sales ? s.new30 : "—"}</td></tr><tr><td>Cancellations</td><td>${sales ? s.cancelled7 : "—"}</td><td>${sales ? s.cancelled30 : "—"}</td></tr></table></div>
<h2>Licences and leads</h2><div>${stat(licences, "licences in all")}${stat(activeLicences, "active (paid, trial, free)")}${stat(freeLicences, "free licences running")}${stat(leads, "lead emails")}${stat(tests, "free site tests")}</div>
<p><a class="pill sm" href="/admin/customers">Customers & licences</a> <a class="pill alt sm" href="/admin/leads">Leads</a></p>
<h2>Collectors and AI cost</h2>${spend ? `<p>AI spend today <b>$${esc(spend.today.toFixed(2))}</b> of the <b>$${esc(Number(spend.cap).toFixed(2))}</b> daily cap · this month <b>$${esc(Number(spend.month).toFixed(2))}</b>.</p>` : `<p class="note">The collectors' database is not connected here.</p>`}
<p>The collectors' status, their red lines and the full AI spend are on your owner page — not copied here: <a class="pill ghost sm" href="/owner">Open /owner</a> <a class="pill ghost sm" href="/owner/almiseo">AlmiSEO Data</a></p>`);
}

const statusPill = (s) => `<span class="st ${esc(s)}">${esc(s)}</span>`;
const planOptions = (sel = "visibility_1") => PLANS.map((p) => `<option value="${esc(p.id)}"${p.id === sel ? " selected" : ""}>${esc(p.words)}</option>`).join("");

export function adminCustomers({ view, message = null, error = null, granted = null, salesWhy = null, today }) {
  const { rows, total, page, pages, q } = view;
  const link = (p) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  const row = (r) => {
    const free = r.kind === "FREE", running = free && r.status === "free";
    const actions = free && r.status !== "revoked"
      ? `<form method="post" action="/admin/licences/extend" class="inline"><input type="hidden" name="ref" value="${esc(r.ref)}"><input type="date" name="until" min="${esc(today)}" required aria-label="New expiry"><button class="pill sm" type="submit">Extend</button></form>
${running ? ` <a class="pill ghost sm" href="/admin/licences/revoke?ref=${esc(r.ref)}">Revoke…</a>` : ""}`
      : r.kind === "OWNER" ? `<span class="fine">your own licence — not changed here</span>` : r.kind === "FREE" ? "" : `<span class="fine">follows Stripe</span>`;
    return `<tr><td>${esc(r.email ?? "—")}<br><span class="fine">licence ${esc(r.ref)}</span></td><td>${esc(r.plan)}</td><td>${statusPill(r.status)}${r.cancelAtPeriodEnd ? `<br><span class="fine">cancels at period end</span>` : ""}</td><td>${esc(r.start ?? "—")}</td><td>${esc(r.renews ?? "—")}</td><td>${esc(r.lastSeen ? r.lastSeen.slice(0, 16).replace("T", " ") : "never")}</td><td>${free ? `<span class="fine">${esc(r.grantedBy ?? "")} ${esc((r.grantedAt ?? "").slice(0, 10))}${r.reason ? ` — ${esc(r.reason)}` : ""}</span>` : ""}</td><td>${actions}</td></tr>`;
  };
  return shell("/admin/customers", "Customers & licences", `${msg(message)}${err(error)}${salesWhy ? `<p class="err">Stripe: ${esc(salesWhy)} — emails and renewal dates of paid licences are missing until it answers.</p>` : ""}
${granted ? `<div class="card" style="margin:0 0 16px"><h3>Free licence granted to ${esc(granted.email)}</h3><p>Until <b>${esc(granted.until)}</b>. Send this licence key to them — it is shown <b>only now</b>:</p><p class="key" data-testid="granted-key">${esc(granted.key)}</p></div>` : ""}
<h2>Grant a free licence</h2><form method="post" action="/admin/licences/grant" class="grant"><label>Email<input type="email" name="email" required autocomplete="off"></label><label>Plan<select name="plan">${planOptions()}</select></label><label>Expiry<input type="date" name="until" min="${esc(today)}" required></label><label>Reason (optional)<input name="reason" maxlength="300" autocomplete="off"></label><button class="pill" type="submit">Grant</button></form>
<h2>All licences (${total})</h2><form method="get" action="/admin/customers" class="inline"><input type="search" name="q" value="${esc(q)}" placeholder="email, plan, status, licence" aria-label="Search"><button class="pill sm" type="submit">Search</button>${q ? ` <a href="/admin/customers">clear</a>` : ""}</form>
<div class="tablewrap"><table class="t" data-testid="licences"><tr><th>Email</th><th>Plan</th><th>Status</th><th>Start</th><th>Renews / expires</th><th>Last app check</th><th>Free licence record</th><th></th></tr>${rows.map(row).join("") || '<tr><td colspan="8">No licence yet.</td></tr>'}</table></div>
<div class="pager">${page > 1 ? `<a href="${esc(link(page - 1))}">← newer</a>` : ""}<span class="fine">page ${page} of ${pages}</span>${page < pages ? `<a href="${esc(link(page + 1))}">older →</a>` : ""}</div>`);
}

export function adminRevokeConfirm({ row }) {
  return shell("/admin/customers", "Revoke a free licence?", `<div class="card"><p>Revoke the free licence of <b>${esc(row.email ?? "—")}</b> (${esc(row.plan)}, until ${esc(row.renews ?? "—")}, licence ${esc(row.ref)})?</p>
<p class="fine">The app stops new work at its next licence check. This cannot be undone — a new free licence can be granted later.</p>
<form method="post" action="/admin/licences/revoke" class="grant"><input type="hidden" name="ref" value="${esc(row.ref)}"><input type="hidden" name="confirm" value="yes"><label>Reason (optional)<input name="reason" maxlength="300" autocomplete="off"></label><button class="pill" type="submit">Yes, revoke it</button> <a class="pill ghost" href="/admin/customers">No, keep it</a></form></div>`);
}

export function adminLeadsPanel({ leads, tests, storeKind }) {
  return shell("/admin/leads", "Leads", `<p class="note">Store: ${esc(storeKind)}. A lead exists only when a visitor gave an email. A free site test records the site, its score and the date — never the visitor.</p>
<h2>Emails (${leads.length}) <a class="pill alt sm" href="/admin/leads.csv">Download CSV</a></h2>
<div class="tablewrap"><table class="t" data-testid="leads"><tr><th>Email</th><th>Site</th><th>Date</th><th>Marketing</th></tr>${leads.map((l) => `<tr><td>${esc(l.email)}</td><td>${esc(l.testedUrl ?? "")}</td><td>${esc(String(l.at).slice(0, 10))}</td><td>${l.marketing === true ? "yes" : "no"}</td></tr>`).join("") || '<tr><td colspan="4">No lead emails yet.</td></tr>'}</table></div>
<h2>Free site tests (${tests.length}) <a class="pill alt sm" href="/admin/tests.csv">Download CSV</a></h2>
<div class="tablewrap"><table class="t" data-testid="tests"><tr><th>Site</th><th>Score</th><th>Pages</th><th>Date</th></tr>${tests.slice(0, 500).map((t) => `<tr><td>${esc(t.site)}</td><td>${t.score === null || t.score === undefined ? "Not measured" : `${esc(t.score)} / 100`}</td><td>${esc(t.pages ?? "")}</td><td>${esc(String(t.at).slice(0, 16).replace("T", " "))}</td></tr>`).join("") || '<tr><td colspan="4">No tests yet.</td></tr>'}</table></div>${tests.length > 500 ? `<p class="fine">The newest 500 are shown; the CSV has all ${tests.length}.</p>` : ""}`);
}
