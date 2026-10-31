/**
 * 🔴 RR-315 C · THE KEY AND SIGN-IN GUIDES (owner, 22 Oct 2026: "a How to get it link next to each key — a guide in a NEW window, so the
 *   client can read it while pasting in the app").
 *   · Three guides: the Anthropic AI key, the YouTube key, the Google sign-in client. The same steps the owner did on 22 Oct 2026, in plain
 *     words, numbered, one step at a time with "← Back" and "Next →" (or all steps at once), each with a simple drawing of the screen.
 *   · Part of the app: served by the app itself, nothing from the internet — they open without a connection.
 *   · Each guide says: never send a key in chat or email.
 * Sources read 22 Oct 2026: Anthropic's help article "Creating and managing workspaces in the Claude Console" (workspaces, the Limits tab,
 * keys belong to their workspace); Google's YouTube Data API reference for channels.list ("mine" = the channels of the signed-in choice;
 * "managedByMe" is for YouTube content partners only).
 */
import { cssVariables } from "./theme.mjs";

const NEVER = "Never send a key in chat or email — not to AlmiWorld, not to anyone. You paste it only into Visibility, on your own computer.";

/* a simple drawing of the screen the step is about: a window, its path, and the button to press (highlighted) */
function draw({ title, path = [], press = null, fields = [] }) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rows = fields.map((f, i) => `<rect x="24" y="${92 + i * 34}" width="300" height="24" rx="6" fill="#fff" stroke="#E7CDB8"/><text x="32" y="${108 + i * 34}" font-size="12" fill="#6B5E52">${esc(f)}</text>`).join("");
  const by = 92 + fields.length * 34 + 6;
  return `<svg class="draw" viewBox="0 0 520 ${by + (press ? 52 : 14)}" role="img" aria-label="${esc(`${title}${press ? ` — press ${press}` : ""}`)}">
  <rect x="2" y="2" width="516" height="${by + (press ? 48 : 10)}" rx="12" fill="#FFF8EF" stroke="#E7CDB8" stroke-width="2"/>
  <rect x="2" y="2" width="516" height="30" rx="12" fill="#F6E3D4"/><circle cx="20" cy="17" r="5" fill="#E9967A"/><circle cx="36" cy="17" r="5" fill="#F3C38A"/><circle cx="52" cy="17" r="5" fill="#BFD8C8"/>
  <text x="70" y="22" font-size="13" font-weight="700" fill="#1A1A2E">${esc(title)}</text>
  <text x="24" y="64" font-size="13" fill="#1A1A2E">${esc(path.join("  ›  "))}</text>${rows}
  ${press ? `<rect x="24" y="${by}" width="${Math.max(120, press.length * 8 + 40)}" height="34" rx="17" fill="#E9967A" stroke="#1A1A2E" stroke-width="2"/><text x="${24 + 20}" y="${by + 22}" font-size="14" font-weight="700" fill="#1A1A2E">${esc(press)}</text><text x="${24 + Math.max(120, press.length * 8 + 40) + 12}" y="${by + 22}" font-size="13" fill="#9F1D1D">← press this</text>` : ""}</svg>`;
}

export const GUIDES = Object.freeze({
  "anthropic-key": {
    title: "Your AI key (Anthropic Claude)",
    for: "Visibility writes with YOUR AI — the cost is on your own Anthropic account, inside a limit you set.",
    steps: [
      { do: "Open platform.claude.com in your browser and sign in to your Anthropic account (the Claude Console; console.anthropic.com leads there too).", draw: { title: "Claude Console", path: ["platform.claude.com"], press: "Sign in" } },
      { do: "Make a workspace just for Visibility: Settings → Workspaces → Create workspace. Name it AlmiVisibility. (Only an admin of your Anthropic organization can do this.)", draw: { title: "Settings › Workspaces", path: ["Settings", "Workspaces"], fields: ["Name: AlmiVisibility"], press: "Create workspace" } },
      { do: "Set its spend limit: open the AlmiVisibility workspace → the Limits tab → Change limit. Choose a monthly amount you are happy with (for example $10). It must be lower than your organization's limit.", draw: { title: "AlmiVisibility › Limits", path: ["Workspaces", "AlmiVisibility", "Limits"], fields: ["Monthly spend limit: $10"], press: "Change limit" } },
      { do: "Create the key inside that workspace: API keys → Create key. Choose the workspace AlmiVisibility and give the key a name you will recognise, for example \"Visibility on my laptop\". A key belongs to its workspace and cannot be moved.", draw: { title: "API keys", path: ["API keys"], fields: ["Workspace: AlmiVisibility", "Name: Visibility on my laptop"], press: "Create key" } },
      { do: "Copy the key at once — the Console shows it only once. If you lose it, delete it and create a new one.", draw: { title: "Your new key", path: ["API keys", "Create key"], fields: ["sk-ant-… (shown once)"], press: "Copy" } },
      { do: "Paste it in Visibility: open your product → Settings → \"Your AI connection\" → choose Anthropic (Claude) → paste the key → Next →. Visibility keeps it in Windows' secure store and shows only \"saved ✓ (ends …1234)\". In the app you can also set Visibility's own monthly AI limit.", draw: { title: "Visibility › Your AI connection", path: ["Your product", "Settings", "Your AI connection"], fields: ["Your AI assistant: Anthropic (Claude)", "Paste your AI key here"], press: "Next →" } },
    ],
  },
  "youtube-key": {
    title: "Your YouTube key (free)",
    for: "Visibility reads public YouTube facts (your videos, your niche) through Google's own YouTube service. It is free: 10,000 units a day.",
    steps: [
      { do: "Open console.cloud.google.com and sign in with your Google account.", draw: { title: "Google Cloud", path: ["console.cloud.google.com"], press: "Sign in" } },
      { do: "Make a project: the project picker at the top → New project → name it AlmiVisibility → Create. Then pick it in the project picker.", draw: { title: "New project", path: ["Project picker", "New project"], fields: ["Project name: AlmiVisibility"], press: "Create" } },
      { do: "Turn on YouTube's service: ☰ menu → APIs & Services → Library → search for \"YouTube Data API v3\" → open it → Enable.", draw: { title: "Library › YouTube Data API v3", path: ["APIs & Services", "Library", "YouTube Data API v3"], press: "Enable" } },
      { do: "Create the key: APIs & Services → Credentials → + Create credentials → API key. Google shows the new key.", draw: { title: "Credentials", path: ["APIs & Services", "Credentials"], press: "+ Create credentials › API key" } },
      { do: "Restrict it to YouTube only: open the key (Edit API key) → API restrictions → Restrict key → tick only \"YouTube Data API v3\" → Save. (Application restrictions can stay \"None\": Visibility runs on your own computer.)", draw: { title: "Edit API key", path: ["Credentials", "your key"], fields: ["API restrictions: Restrict key", "☑ YouTube Data API v3"], press: "Save" } },
      { do: "Copy the key (Show key → copy) and paste it in Visibility: open your product → YouTube settings → \"Your YouTube key\" → Save key. Visibility shows only \"saved ✓ (ends …1234)\".", draw: { title: "Visibility › YouTube settings", path: ["Your product", "YouTube settings"], fields: ["Your YouTube key: paste it here"], press: "Save key" } },
    ],
  },
  "google-client": {
    title: "Google sign-in (for YouTube and Search Console)",
    for: "With it, the channel owner signs in to Google themselves, in their own browser, and Visibility reads the channel's own analytics and the site's Search Console. Visibility never sees the password.",
    steps: [
      { do: "Open console.cloud.google.com and pick the same project as your YouTube key (AlmiVisibility).", draw: { title: "Google Cloud", path: ["console.cloud.google.com", "AlmiVisibility"], press: "Select project" } },
      { do: "Turn on four services: APIs & Services → Library → search each and press Enable: \"YouTube Data API v3\" (already on), \"YouTube Analytics API\", \"YouTube Reporting API\", \"Google Search Console API\".", draw: { title: "Library", path: ["APIs & Services", "Library"], fields: ["YouTube Analytics API", "YouTube Reporting API", "Google Search Console API"], press: "Enable" } },
      { do: "The consent screen: ☰ → Google Auth Platform (also reached by APIs & Services → OAuth consent screen) → Get started. App name: AlmiVisibility; your support email; Audience: External; your contact email → Create.", draw: { title: "Google Auth Platform", path: ["Google Auth Platform", "Get started"], fields: ["App name: AlmiVisibility", "Audience: External"], press: "Create" } },
      { do: "Keep it in Testing and add yourself: Audience → Publishing status \"Testing\" → Test users → + Add users → the Gmail that owns your channel and your Search Console. A brand channel has no address of its own to add — add the Gmail that manages it. (An address that is not a Google account is refused by Google.)", draw: { title: "Audience › Test users", path: ["Google Auth Platform", "Audience"], fields: ["Publishing status: Testing", "Test users: you@gmail.com"], press: "+ Add users" } },
      { do: "The permissions (scopes): Data access → Add or remove scopes → tick …/auth/youtube.readonly, …/auth/yt-analytics.readonly and …/auth/webmasters.readonly. Only if you want \"Apply to YouTube\": also …/auth/youtube.force-ssl. Only if you want your sitemap sent to Google: also …/auth/webmasters. → Update → Save.", draw: { title: "Data access", path: ["Google Auth Platform", "Data access"], fields: ["☑ youtube.readonly", "☑ yt-analytics.readonly", "☑ webmasters.readonly"], press: "Save" } },
      { do: "The sign-in client: Clients → + Create client → Application type \"Desktop app\" → name it AlmiVisibility desktop → Create.", draw: { title: "Create client", path: ["Google Auth Platform", "Clients"], fields: ["Application type: Desktop app", "Name: AlmiVisibility desktop"], press: "Create" } },
      { do: "Download its file: in the window that opens press \"Download JSON\" (later: open the client → the download button). Keep the file on your own computer.", draw: { title: "Client created", path: ["Clients", "AlmiVisibility desktop"], press: "Download JSON" } },
      { do: "Add it in Visibility: All products → \"Google sign-in: switch it on\" → Way 1 → choose the downloaded file → Use this file. The screen says \"Google sign-in is ON ✓\".", draw: { title: "Visibility › Google sign-in", path: ["All products", "Google sign-in"], fields: ["The file Google Cloud downloaded"], press: "Use this file" } },
      { do: "Sign in, and CHOOSE THE RIGHT CHANNEL: your product → YouTube tab → Sign in to YouTube. Chrome opens Google. Choose your Google account. If your channel is a brand channel, Google then lists the account's channels (brand accounts under your email) — choose THIS product's channel, not your personal or default channel. Google says \"Google hasn't verified this app\" while you are in Testing: press Continue (or Advanced → Go to AlmiVisibility). Allow, and Visibility shows \"Signed in to YouTube ✓\". If another channel came back, Visibility says which one and offers \"Try again — choose …\".", draw: { title: "Google › Choose an account or brand account", path: ["accounts.google.com"], fields: ["Your personal channel", "Your brand channel  ← choose this one"], press: "Continue" } },
    ],
  },
});

/*
 * 🔴 RR-353 (owner, 31 Oct 2026) · HELP GUIDES — not key guides: no "never send a key" line, no "how to get it". The same page, the same
 * Back / Next. Both are on the AlmiVisibility site too (site/pages.mjs helpPage). Sources read 31 Oct 2026: Stripe's Checkout page shows
 * "Add promotion code" when the session allows promotion codes (site/billing.mjs: allow_promotion_codes); Microsoft Defender SmartScreen
 * shows "Windows protected your PC" for a program that is not yet known — "More info" shows "Run anyway".
 */
export const HELP_GUIDES = Object.freeze({
  "promotion-code": {
    title: "How to use a promotion code",
    for: "A promotion code from AlmiWorld lowers the price of your plan. You type it on the payment page, before you pay.",
    steps: [
      { do: "Open almivisibility.almiworld.com/pricing and press Buy under the plan you want.", draw: { title: "AlmiVisibility › Pricing", path: ["almivisibility.almiworld.com", "Pricing"], press: "Buy" } },
      { do: "The payment page opens (Stripe, our payment partner). Under the price, press \"Add promotion code\".", draw: { title: "Payment page", path: ["Your plan", "Subtotal"], press: "Add promotion code" } },
      { do: "Type the code exactly as you got it and press Apply. The new price is shown at once. A code that does not work says so — check its spelling; only AlmiWorld's own codes work.", draw: { title: "Promotion code", path: ["Subtotal", "Add promotion code"], fields: ["Your code"], press: "Apply" } },
      { do: "Fill in your card and press Subscribe. After paying, the next page shows your licence key (it starts with av_) — copy it.", draw: { title: "Thank you", path: ["Payment", "Your licence key"], fields: ["av_… (your key)"], press: "Copy" } },
      { do: "In Visibility: All products → Your plan → paste the key → Save. The plan is on, with the code's price.", draw: { title: "Visibility › Your plan", path: ["All products", "Your plan"], fields: ["Licence key: paste it here"], press: "Save" } },
    ],
  },
  "windows-protected": {
    title: "The blue \"Windows protected your PC\" window",
    for: "When you open the AlmiVisibility installer, Windows may show a blue window: \"Windows protected your PC\". Windows shows it for a program it does not know yet — our installer is not yet signed with a code-signing certificate. It is not a virus warning.",
    steps: [
      { do: "Download the installer only from almivisibility.almiworld.com/download — never from another site.", draw: { title: "AlmiVisibility › Download", path: ["almivisibility.almiworld.com", "Download"], press: "Download for Windows" } },
      { do: "Open the downloaded file. If the blue window \"Windows protected your PC\" appears, press the small words \"More info\" under the text.", draw: { title: "Windows protected your PC", path: ["Microsoft Defender SmartScreen"], press: "More info" } },
      { do: "The window now shows the program's name (AlmiVisibility Setup) and \"Publisher: Unknown publisher\". Press \"Run anyway\".", draw: { title: "Windows protected your PC", path: ["More info"], fields: ["App: AlmiVisibility Setup", "Publisher: Unknown publisher"], press: "Run anyway" } },
      { do: "Windows may then ask \"Do you want to allow this app to make changes?\" — press Yes. The installer opens; follow it. Your data stays on your own computer.", draw: { title: "User Account Control", path: ["AlmiVisibility Setup"], press: "Yes" } },
    ],
  },
});
const ALL_GUIDES = () => ({ ...GUIDES, ...HELP_GUIDES });
/** every guide the Help screen lists */
export const guideList = () => Object.entries(ALL_GUIDES()).map(([id, g]) => ({ id, title: g.title, help: id in HELP_GUIDES }));

/** the guide's own page — offline, its own Back / Next, one step at a time (or all at once) */
export function guidePage(name) {
  const g = ALL_GUIDES()[name]; if (!g) return null;
  const help = name in HELP_GUIDES;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const n = g.steps.length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${help ? "Help" : "How to get it"} — ${esc(g.title)}</title>
<style>${cssVariables()}
body{margin:0;background:var(--cream);color:var(--text);font:15px/1.55 var(--font)} header{display:flex;align-items:center;gap:12px;padding:10px 20px;background:var(--white);border-bottom:3px solid var(--peach)} header img{height:36px}
main{max-width:760px;margin:18px auto;padding:0 16px} h1{font-size:21px;color:var(--ink);margin:0 0 4px} .never{background:#FDECEC;border:1px solid #C0392B;border-radius:12px;padding:10px 14px;font-weight:700;color:#7A1515;margin:10px 0}
.step{background:var(--white);border:1px solid var(--peach);border-radius:16px;padding:18px;margin:12px 0} .step h2{font-size:17px;color:var(--ink);margin:0 0 6px} .draw{width:100%;max-width:520px;height:auto;margin-top:10px}
.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0} button{font:inherit;font-weight:600;padding:10px 18px;border-radius:999px;border:0;background:var(--coral);color:var(--ink);cursor:pointer} button.ghost{background:transparent;border:1px solid var(--coral)} button[disabled]{opacity:.45;cursor:not-allowed}
.meta{color:var(--muted);font-size:13px} body.all .step{display:block!important}
@media (prefers-color-scheme:dark){body{background:var(--night);color:var(--cream)} .step,header{background:#1E1A15;border-color:#3A2F22} h1,.step h2{color:var(--cream)} .meta{color:#E7D9C3}}
</style></head><body>
<header><img src="/brand/almiworld-logo.png" alt="AlmiWorld"><b>Visibility — ${help ? "help" : "how to get it"}</b></header>
<main><h1>${esc(g.title)}</h1><p class="meta">${esc(g.for)}${help ? "" : " The steps the AlmiWorld owner followed on 22 October 2026. Keep this window open beside Visibility while you paste."}</p>
${help ? "" : `<p class="never" id="never">${esc(NEVER)}</p>`}
<div class="bar"><button class="ghost" id="prev" type="button">← Back</button><span id="count" class="meta"></span><button id="next" type="button">Next →</button><button class="ghost" id="all" type="button">Show all steps</button></div>
${g.steps.map((s, i) => `<section class="step" id="s${i + 1}" ${i ? "hidden" : ""}><h2>Step ${i + 1} of ${n}</h2><p>${esc(s.do)}</p>${draw(s.draw)}</section>`).join("\n")}
<div class="bar"><button class="ghost" id="prev2" type="button">← Back</button><button id="next2" type="button">Next →</button></div>
${help ? "" : `<p class="never">${esc(NEVER)}</p>`}</main>
<script>
let k = 1; const n = ${n};
const show = () => { for (let i = 1; i <= n; i++) document.getElementById("s" + i).hidden = i !== k; document.getElementById("count").textContent = "Step " + k + " of " + n;
  for (const id of ["prev", "prev2"]) document.getElementById(id).disabled = k === 1;
  for (const id of ["next", "next2"]) document.getElementById(id).textContent = k === n ? "Done — close this window" : "Next →"; };
const prev = () => { if (k > 1) { k--; show(); scrollTo(0, 0); } };
const next = () => { if (k < n) { k++; show(); scrollTo(0, 0); } else window.close(); };
document.getElementById("prev").onclick = document.getElementById("prev2").onclick = prev;
document.getElementById("next").onclick = document.getElementById("next2").onclick = next;
document.getElementById("all").onclick = () => { document.body.classList.toggle("all"); document.getElementById("all").textContent = document.body.classList.contains("all") ? "One step at a time" : "Show all steps"; };
addEventListener("keydown", (e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); });
show();
</script></body></html>`;
}
