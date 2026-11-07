/**
 * 🔴 RR-389 PART 5 (owner, 7 Nov 18:14: "guidance ki bhi kami nazar aa rahi hai"; tonight he needed beta-g for every step). A client has nobody:
 * the app itself says, on every screen, what to do next.
 *   · THE GUIDED SETUP (5.2): website → Search Console or Bing → publish connection (with Test connection) → what it is about → research file
 *     (optional) → autopilot on, running with the PC off. Each step done or not, with its tick; the product's Home shows the list until every
 *     needed step is done. The ONE next step is the first one not done.
 *   · EVERY REFUSAL SAYS ITS FIX (5.4): what happened, why, the one step, and the screen to open for it.
 * Names are the app's own screen and button names (a test reads them against ui.html). Pure.
 */
export const SETUP_STEPS = Object.freeze([
  { id: "website", title: "Your website", step: "Add your product's website and press Check now", screen: "Settings", go: "setup" },
  { id: "searchData", title: "Google Search Console or Bing", step: "Connect Google Search Console (or Bing Webmaster Tools): the searches that already reach your site", screen: "Google Search Console", go: "googleScreen" },
  { id: "publish", title: "Where your site is built", step: "Connect where your site is built, then press Test connection", screen: "Publish settings", go: "publishScreen" },
  { id: "subject", title: "What it is about", step: "Say what your product is about (the short name people search) and set your offer button", screen: "Settings", go: "setup" },
  { id: "research", title: "Your research file (optional)", step: "Add your research or facts file, if you have one", screen: "Pages", go: "addFile", optional: true },
  { id: "autopilot", title: "Autopilot, also with your PC off", step: "Turn autopilot on, then press Turn on our server so it runs with your PC off", screen: "Pages", go: "autopilot" },
]);

/**
 * state: { site, checked, searchConsole, bing, publishKind, publishTested, subject, cta, research, autopilot, server }
 * → { steps: [{ id, title, step, screen, go, optional, done }], next: the first needed step not done (or null), done: every needed step done }
 */
export function setupSteps(s = {}) {
  const done = {
    website: Boolean(s.site && s.checked),
    searchData: Boolean(s.searchConsole || s.bing),
    publish: Boolean(s.publishKind && s.publishTested),
    subject: Boolean(s.subject && s.cta),
    research: Boolean(s.research),
    autopilot: Boolean(s.autopilot && s.server),
  };
  const steps = SETUP_STEPS.map((x) => ({ ...x, done: done[x.id] }));
  const next = steps.find((x) => !x.done && !x.optional) ?? null;
  return { steps, next, done: !next, line: next ? `Next: ${next.step.charAt(0).toLowerCase()}${next.step.slice(1)} → ${next.screen}` : "Setup done: autopilot runs with your PC off ✓" };
}

/* 5.4 · a refusal's words → the one step and the screen it is done on. The words are the app's own refusals (main.mjs, setup.mjs) */
const FIXES = [
  [/no offer button|offer button|button's words|NO_CTA/i, { step: "Set your offer button: its words and the page it opens", screen: "Settings", go: "setup" }],
  [/what (?:it|this product) is about|no subject|subject/i, { step: "Say what your product is about", screen: "Settings", go: "setup" }],
  [/website|web address|could not be opened|does not open/i, { step: "Check your website's address", screen: "Settings", go: "setup" }],
  [/publish connection|connect (?:your|a) site|No publish|publish settings|token|repository|branch/i, { step: "Open Publish settings and press Test connection", screen: "Publish settings", go: "publishScreen" }],
  [/AI (?:key|connection)|connect your AI|Your AI/i, { step: "Connect your AI (your own Anthropic key)", screen: "Settings", go: "setup" }],
  [/Monthly AI limit|AI limit/i, { step: "The month's AI limit is used: the rest waits for next month, or change the limit yourself", screen: "Settings", go: "setup" }],
  [/Search Console|Google sign-in|Google/i, { step: "Connect Google Search Console", screen: "Google Search Console", go: "googleScreen" }],
  [/Bing/i, { step: "Connect Bing Webmaster Tools", screen: "Bing Webmaster Tools", go: "bingScreen" }],
  [/DataForSEO|search results data|Paid Google search/i, { step: "Open Search results data", screen: "Search results data", go: "searchDataScreen" }],
  [/licen[cs]e|your plan/i, { step: "Add your licence key", screen: "Your plan", go: "planScreen" }],
  [/file/i, { step: "Choose the file again: a research document (.odt, .docx, .txt, .md) or a facts file (.json)", screen: "Pages", go: "addFile" }],
];
/** → { step, screen, go } or null (a refusal the app cannot point to a screen for) */
export function refusalFix(text) { const t = String(text ?? ""); for (const [re, fix] of FIXES) if (re.test(t)) return fix; return null; }

/* 5.1 · every screen's ONE line: what it is for (the app's SCREEN_GUIDE says the rest); kept here so the proof can list every screen */
export const SCREEN_LINES = Object.freeze({
  home: "Your products, each with its one next step.",
  "work:Overview": "Your score, what to fix, and the jobs Visibility does for you.",
  "work:Pages and articles": "The pages Visibility made for you, autopilot, and your research or facts file.",
  "work:Approvals": "Pages waiting for your yes.",
  "work:YouTube": "Advice for your channel and each video.",
  "work:Monthly report": "The month in one report, bad news first.",
  setup: "Your product's details: its name, website, what it is about and your offer button.",
  publishScreen: "Where your pages are published: your site, connected once.",
  googleScreen: "Connect Google Search Console: what people search to find you.",
  bingScreen: "Connect Bing Webmaster Tools: what people search on Bing.",
  searchDataScreen: "Optional: Google's results from your own DataForSEO account.",
  almiSeoScreen: "What Visibility knows about this product.",
  enginesScreen: "Tell Google and Bing about your published pages.",
});
