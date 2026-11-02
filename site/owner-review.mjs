/**
 * 🔴 RR-362 items 11 + 12 (owner, 2 Nov 2026: "after each Approve the page jumps and I must find the next one. The whole list stays visible; I just tick") · THE OWNER'S REVIEW LIST.
 * Every fact waiting for him (desktop/country-facts.mjs stillWaiting: a decided fact never comes back), a tick box on each, "Approve ticked" and "Reject ticked", Edit per fact; saved at once with no
 * page jump; a decided fact leaves the list where it stands; "12 of 184 left"; a filter by country and by part; one "Next country" button. Without its script the page still lists the facts and each
 * country's page still decides them. Recipe: R2 (a fact is shown with its source), R12 (truth).
 */
import { stillWaiting } from "../desktop/country-facts.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const REVIEW_ACTIONS = Object.freeze(["approve", "reject", "edit"]);

/** the owner's word on the ticked facts: each decided through the store's own rule. → { ok, decided: [key], refused: [{ key, why }] } */
export async function decideTicked({ cf, keys, action, at, values = {}, valueOf }) {
  if (!REVIEW_ACTIONS.includes(action) || !Array.isArray(keys) || !keys.length) return { ok: false, why: "Tick a fact first.", decided: [], refused: [] };
  const decided = [], refused = [];
  for (const key of keys.slice(0, 500).map(String)) {
    const old = await cf.fact(key); if (!old) { refused.push({ key, why: "No such fact." }); continue; }
    const value = action === "edit" ? JSON.parse(JSON.stringify(valueOf(old, values ?? {}))) : null;
    if (value && old.part === "councils" && value.website && !/^https?:\/\//.test(value.website)) { refused.push({ key, why: "The website must start with https://" }); continue; }
    const r = await cf.decide(key, { action, value, at });
    if (r.ok) decided.push(key); else refused.push({ key, why: r.why });
  }
  return { ok: decided.length > 0 || !refused.length, decided, refused };
}

/** the page */
export function ownerReview({ facts = [], product = "oet", products = [], order = [], menu = "", frame, editOf, lineOf, names = {} }) {
  const list = stillWaiting(facts), rank = (c) => { const i = order.indexOf(c); return i < 0 ? 1e6 : i; };
  const sorted = [...list].sort((a, b) => rank(a.country) - rank(b.country) || String(a.part).localeCompare(String(b.part))), countries = [...new Set(sorted.map((f) => f.country))], parts = [...new Set(sorted.map((f) => f.part))];
  const row = (f) => `<li class="fact" data-review data-key="${esc(f.key)}" data-country="${esc(f.country)}" data-part="${esc(f.part)}"><label class="check"><input type="checkbox" data-tick> <b>${esc(f.country)}</b> · ${esc(names[f.part] ?? f.part)}${f.profession ? ` · ${esc(f.profession)}` : ""}</label>
<p>${esc(lineOf(f))}${f.why ? `<br><span class="fine">${esc(f.why)}</span>` : ""}</p><p class="fine">${f.sourceUrl ? `<a href="${esc(f.sourceUrl)}" rel="nofollow noopener" target="_blank">${esc(f.sourceTitle || f.sourceUrl)}</a>` : "—"}${f.readOn ? ` · read ${esc(f.readOn)}` : ""}</p>
<details><summary>Edit</summary><form data-edit>${editOf(f)}<button class="pill" type="submit">Save my version</button></form></details></li>`;
  return frame("Review facts", `${menu}<h1>Review facts</h1>
<p class="row">${products.map((p) => (p.key === product ? `<span class="chip"><b>${esc(p.name)}</b></span>` : `<a class="chip" href="/owner/review?p=${encodeURIComponent(p.key)}">${esc(p.name)}</a>`)).join(" ")}</p>
<div class="card" id="reviewbar" data-product="${esc(product)}" data-total="${list.length}" style="position:sticky;top:0;z-index:5"><p><b id="reviewleft">${list.length} of ${list.length} left</b> <span id="reviewmsg" role="status"></span></p>
<p class="row"><label>Country <select id="reviewcountry"><option value="">All countries</option>${countries.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label> <label>Part <select id="reviewpart"><option value="">All parts</option>${parts.map((p) => `<option value="${esc(p)}">${esc(names[p] ?? p)}</option>`).join("")}</select></label> <button class="pill ghost" type="button" id="reviewnext">Next country</button></p>
<p class="row"><label class="check"><input type="checkbox" id="reviewall"> Tick all shown</label> <button class="pill" type="button" id="reviewapprove">Approve ticked</button> <button class="pill ghost" type="button" id="reviewreject">Reject ticked</button></p></div>
${list.length ? `<ul class="plain" id="reviewlist">${sorted.map(row).join("")}</ul>` : `<p class="note" id="reviewdone">Nothing is waiting for you.</p>`}<script src="/review.js" defer></script>`);
}

/* the page's script (the site's Content-Security-Policy allows its own scripts only) */
export const REVIEW_JS = `(function () {
  var bar = document.getElementById("reviewbar"); if (!bar) return;
  var total = Number(bar.getAttribute("data-total")), product = bar.getAttribute("data-product");
  var $ = function (id) { return document.getElementById(id); }, rows = function () { return [].slice.call(document.querySelectorAll("[data-review]")); };
  function say(t) { $("reviewmsg").textContent = t; }
  function count(left) { $("reviewleft").textContent = left + " of " + total + " left"; if (!left) say("Nothing is waiting for you now."); }
  function shown(r) { var c = $("reviewcountry").value, p = $("reviewpart").value; return (!c || r.getAttribute("data-country") === c) && (!p || r.getAttribute("data-part") === p); }
  function filter() { rows().forEach(function (r) { r.hidden = !shown(r); if (r.hidden) r.querySelector("[data-tick]").checked = false; }); $("reviewall").checked = false; }
  function send(body) { return fetch("/owner/review/decide?p=" + encodeURIComponent(product), { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function done(x) { (x.decided || []).forEach(function (k) { var r = rows().filter(function (y) { return y.getAttribute("data-key") === k; })[0]; if (r) r.remove(); }); if (typeof x.left === "number") count(x.left); say(x.refused && x.refused.length ? "Not saved: " + x.refused[0].why : x.why || "Saved."); }
  function act(action) { var keys = rows().filter(function (r) { return !r.hidden && r.querySelector("[data-tick]").checked; }).map(function (r) { return r.getAttribute("data-key"); }); if (!keys.length) return say("Tick a fact first."); say("Saving…"); send({ keys: keys, action: action }).then(done).catch(function () { say("Not saved: the site did not answer. Nothing changed; try again."); }); $("reviewall").checked = false; }
  $("reviewapprove").onclick = function () { act("approve"); }; $("reviewreject").onclick = function () { act("reject"); };
  $("reviewcountry").onchange = filter; $("reviewpart").onchange = filter;
  $("reviewall").onchange = function () { var on = this.checked; rows().forEach(function (r) { if (!r.hidden) r.querySelector("[data-tick]").checked = on; }); };
  $("reviewnext").onclick = function () { var left = rows().map(function (r) { return r.getAttribute("data-country"); }).filter(function (c, i, a) { return a.indexOf(c) === i; }), at = left.indexOf($("reviewcountry").value), next = left[(at + 1) % left.length]; if (!next) return say("Nothing is waiting for you now."); $("reviewcountry").value = next; filter(); window.scrollTo(0, 0); };
  document.addEventListener("submit", function (e) { var f = e.target; if (!f.hasAttribute("data-edit")) return; e.preventDefault(); var r = f.closest("[data-review]"), v = {}; [].slice.call(f.elements).forEach(function (x) { if (x.name) v[x.name] = x.value; }); say("Saving…"); send({ keys: [r.getAttribute("data-key")], action: "edit", values: v }).then(done).catch(function () { say("Not saved: the site did not answer. Nothing changed; try again."); }); });
})();`;
