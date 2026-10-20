/**
 * 🔴 RR-303 B · THE FULL-REPORT EMAIL, THE ALMIWORLD WAY (Resend; the family's one sender almiworld@almiworld.com through the variable
 * named EMAIL_FROM; the key in the variable named RESEND_API_KEY — never printed, logged or hashed).
 *   · A visitor who gives an email gets the full free-test report by email. Marketing email is never sent from here, and is stored as a
 *     YES only when its own box was ticked. EVERY email carries an unsubscribe link (and a List-Unsubscribe header).
 *   · SENDING_ON is true only when the key exists: until then the site asks for no email at all — no promise it cannot keep.
 */
export const EMAIL_KEY_NAMES = Object.freeze({ resend: "RESEND_API_KEY", from: "EMAIL_FROM" });
export const DEFAULT_FROM = "AlmiVisibility <almiworld@almiworld.com>";
export const sendingOn = (env = process.env) => Boolean(env[EMAIL_KEY_NAMES.resend]);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const AREA = [["TECHNICAL", "Technical"], ["CONTENT", "Content"], ["ACCESSIBILITY", "Accessibility"], ["LINKS", "Links"], ["SECURITY", "Security"]];

/** The report email: subject, HTML and text — the same facts the visitor saw; "Not measured" never shown as zero. Pure. */
export function reportEmail({ result, unsubscribeUrl }) {
  const score = result.score === null || result.score === undefined ? "Not measured" : `${result.score} / 100`;
  const areas = AREA.map(([k, n]) => [n, result.byCategory?.[k] === null || result.byCategory?.[k] === undefined ? "Not measured" : `${result.byCategory[k]} / 100`]);
  const fixes = result.nextActions.map((a) => `${a.check} — ${a.action} (${a.pages} page${a.pages === 1 ? "" : "s"})`);
  const subject = `Your website report for ${result.url} — ${score}`;
  const text = [`Your full AlmiVisibility report for ${result.url}`, `Tested ${String(result.testedOn).slice(0, 16).replace("T", " ")} UTC · ${result.pagesRead} of up to ${result.pagesLimit} pages read`, "", `Score: ${score}`, ...areas.map(([n, v]) => `${n}: ${v}`), "", "What to fix first:", ...(fixes.length ? fixes.map((f, i) => `${i + 1}. ${f}`) : ["Nothing failed among the checks we measured."]), "", `Measured: ${result.measured.join(", ") || "nothing"}`, `Not measured: ${result.notMeasured.join("; ") || "none"}`, "", result.noPromise, "", `Unsubscribe: ${unsubscribeUrl}`, "AlmiVisibility by AlmiWorld · https://almivisibility.almiworld.com/"].join("\n");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#FFFBF5;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#334155"><div style="max-width:600px;margin:0 auto;padding:24px">
<p style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#E08E2A;margin:0">AlmiVisibility</p>
<h1 style="color:#1A1A2E;font-size:24px;margin:8px 0">Your full report for ${esc(result.url)}</h1>
<p style="color:#475569;font-size:14px">Tested ${esc(String(result.testedOn).slice(0, 16).replace("T", " "))} UTC · ${result.pagesRead} of up to ${result.pagesLimit} pages read</p>
<div style="background:#fff;border:1px solid #FFE8D6;border-radius:16px;padding:20px;margin:16px 0"><p style="font-size:36px;font-weight:700;color:#1A1A2E;margin:0">${esc(score)}</p>
<table style="width:100%;font-size:14px;margin-top:10px">${areas.map(([n, v]) => `<tr><td style="padding:4px 0;color:#1A1A2E;font-weight:600">${n}</td><td style="text-align:right">${esc(v)}</td></tr>`).join("")}</table></div>
<h2 style="color:#1A1A2E;font-size:18px">What to fix first</h2>${fixes.length ? `<ol>${fixes.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>` : "<p>Nothing failed among the checks we measured.</p>"}
<p style="font-size:14px"><b>Measured:</b> ${esc(result.measured.join(", ") || "nothing")}<br><b>Not measured:</b> ${esc(result.notMeasured.join("; ") || "none")}</p>
<p style="font-size:13px;color:#475569">${esc(result.noPromise)}</p>
<p style="font-size:12px;color:#475569;border-top:1px solid #FFE8D6;padding-top:12px">You asked for this report on almivisibility.almiworld.com. <a href="${esc(unsubscribeUrl)}" style="color:#1A1A2E">Unsubscribe</a> · AlmiVisibility by <a href="https://almiworld.com/" style="color:#1A1A2E">AlmiWorld</a></p></div></body></html>`;
  return { subject, text, html };
}

/** Send one email through Resend. Returns { sent: true, id } or { sent: false, why } — never throws, never prints the key. */
export async function sendEmail({ to, subject, html, text, unsubscribeUrl, env = process.env, fetchImpl = fetch }) {
  const key = env[EMAIL_KEY_NAMES.resend];
  if (!key) return { sent: false, why: `sending is off: no ${EMAIL_KEY_NAMES.resend} in the environment` };
  try {
    const r = await fetchImpl("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env[EMAIL_KEY_NAMES.from] || DEFAULT_FROM, to: [to], subject, html, text, headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }) });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.id ? { sent: true, id: j.id } : { sent: false, why: `Resend answered HTTP ${r.status}` };
  } catch { return { sent: false, why: "Resend could not be reached" }; }
}
