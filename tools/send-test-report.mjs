#!/usr/bin/env node
/**
 * RR-303 B · FOR THE OWNER: send ONE test of the full-report email, to almiworld@almiworld.com only, through Resend — the key read from
 * the variable named RESEND_API_KEY (never printed). The report is a fixed sample, marked TEST.
 *   node tools/send-test-report.mjs
 * Prints: sent (with Resend's message id) — or why not. No other address can be given.
 */
import { reportEmail, sendEmail, EMAIL_KEY_NAMES } from "../site/email.mjs";

const TO = "almiworld@almiworld.com";
const result = { url: "https://almiworld.com/", testedOn: new Date().toISOString(), pagesRead: 8, pagesLimit: 10, score: 94, byCategory: { TECHNICAL: 95, CONTENT: 93, ACCESSIBILITY: 100, LINKS: null, SECURITY: null },
  nextActions: [{ check: "one-h1", action: "keep exactly one h1 that states the page's subject", pages: 1 }], measured: ["title", "one-h1"], notMeasured: ["https-only — needs a stored security read of the page"],
  noPromise: "This test measures what it can see today. It promises no ranking, traffic or citation by any search or AI engine." };
const unsubscribeUrl = "https://almivisibility.almiworld.com/unsubscribe?t=TEST";
const m = reportEmail({ result, unsubscribeUrl });
const r = await sendEmail({ to: TO, subject: `[TEST] ${m.subject}`, html: m.html, text: m.text, unsubscribeUrl });
console.log(r.sent ? `sent to ${TO} · Resend id ${r.id}` : `NOT sent — ${r.why}${process.env[EMAIL_KEY_NAMES.resend] ? "" : ` (add ${EMAIL_KEY_NAMES.resend} to this window first)`}`);
process.exit(r.sent ? 0 : 1);
