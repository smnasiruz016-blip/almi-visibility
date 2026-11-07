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
function draw(d) {
  /* 🔴 RR-382 (found by starting the built 1.15.37): a help guide's steps are plain sentences with no drawing; every help page answered 500 since RR-375 */
  if (!d) return "";
  const { title, path = [], press = null, fields = [] } = d;
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
      { do: "A new client secret later (Google says \"The provided client secret is invalid\"): open console.cloud.google.com/auth/clients → AlmiVisibility desktop → Add secret → copy it → in Visibility: All products → Google sign-in → change the client → paste the Client ID and the new Client secret. Then disable and delete the old secret in Google Cloud.", draw: { title: "Clients › AlmiVisibility desktop", path: ["Google Auth Platform", "Clients"], press: "Add secret" } },
      { do: "Sign in, and CHOOSE THE RIGHT CHANNEL: your product → YouTube tab → Sign in to YouTube. Chrome opens Google. Choose your Google account. If your channel is a brand channel, Google then lists the account's channels (brand accounts under your email) — choose THIS product's channel, not your personal or default channel. Google says \"Google hasn't verified this app\" while you are in Testing: press Continue (or Advanced → Go to AlmiVisibility). Allow, and Visibility shows \"Signed in to YouTube ✓\". If another channel came back, Visibility says which one and offers \"Try again — choose …\".", draw: { title: "Google › Choose an account or brand account", path: ["accounts.google.com"], fields: ["Your personal channel", "Your brand channel  ← choose this one"], press: "Continue" } },
    ],
  },
  /* 🔴 RR-389 PART 5.3 (owner, 7 Nov: "which token, which branch"): every field that needs outside knowledge has its guide: where to get it, a few short steps, the exact address */
  "github-token": {
    title: "Your GitHub token (for publishing your pages)",
    for: "Visibility writes your pages into your site's GitHub repository and opens the pull request that takes them live. The token lets it do only that, on the repositories you choose.",
    steps: [
      { do: "Open github.com/settings/personal-access-tokens/new (GitHub → your picture → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token).", draw: { title: "Fine-grained tokens", path: ["Settings", "Developer settings", "Personal access tokens"], press: "Generate new token" } },
      { do: "Token name: AlmiVisibility. Expiration: the longest GitHub offers you (or none, if it offers that). Visibility reads the date from GitHub and warns you 7 days before it ends.", draw: { title: "New token", path: ["Fine-grained tokens", "New"], fields: ["Token name: AlmiVisibility", "Expiration: the longest offered"] } },
      { do: "Repository access: Only select repositories → your site's repository (and your pages repository, if you have one).", draw: { title: "Repository access", path: ["New token", "Repository access"], fields: ["Only select repositories", "your site's repository"] } },
      { do: "Permissions → Repository permissions: Contents: Read and write; Pull requests: Read and write. Nothing else is needed.", draw: { title: "Repository permissions", path: ["New token", "Permissions"], fields: ["Contents: Read and write", "Pull requests: Read and write"] } },
      { do: "Generate token → copy it (GitHub shows it once) → in Visibility: Publish settings → \"Paste your GitHub access token here\" → Save → Test connection. It should say \"All good\".", draw: { title: "Visibility › Publish settings", path: ["Your product", "Publish settings"], fields: ["Paste your GitHub access token here"], press: "Test connection" } },
    ],
  },
  "publish-branch": {
    title: "Repository, branch and folder (Publish settings)",
    for: "Where your pages are written. The branch is a preview branch of its own, so nothing reaches your live site before the preview passes the checks.",
    steps: [
      { do: "Repository: owner/name as it appears in the address github.com/owner/name (for example smnasiruz016-blip/almi-oet).", draw: { title: "Visibility › Publish settings", path: ["Publish settings", "GitHub + Vercel"], fields: ["Repository (owner/name)"] } },
      { do: "Branch: a preview branch for the pages, for example visibility-pages. Do not use main: the app takes pages to main itself, through a pull request, after the preview passes. If the branch is missing, Visibility makes it again from main by itself.", draw: { title: "Visibility › Publish settings", path: ["Publish settings"], fields: ["Branch: visibility-pages"] } },
      { do: "Folder for new pages: the folder in the repository your site serves the pages from, for example visibility-pages. Leave it as Visibility suggests unless your web developer says otherwise.", draw: { title: "Visibility › Publish settings", path: ["Publish settings"], fields: ["Folder for new pages: visibility-pages"] } },
      { do: "Press Save, then Test connection: it checks the token, the repository, the branch and the right to write, and writes nothing.", draw: { title: "Visibility › Publish settings", path: ["Publish settings"], press: "Test connection" } },
    ],
  },
  "vercel-bypass": {
    title: "Vercel's \"Protection Bypass for Automation\" secret",
    for: "Your previews on Vercel are protected. With this secret, Visibility's scan can read your preview before anything goes live. It reads only; it changes nothing on Vercel.",
    steps: [
      { do: "Open vercel.com, sign in, and open the project of your site.", draw: { title: "Vercel", path: ["vercel.com", "your project"], press: "Sign in" } },
      { do: "Settings → Deployment Protection → Protection Bypass for Automation → Add (or Create) secret.", draw: { title: "Deployment Protection", path: ["Settings", "Deployment Protection"], press: "Add secret" } },
      { do: "Copy the secret Vercel shows.", draw: { title: "Protection Bypass for Automation", path: ["Deployment Protection"], fields: ["the secret"], press: "Copy" } },
      { do: "In Visibility: Pages → Autopilot → \"While this computer is off\" → paste it in the Vercel box → Turn on our server (or Save the keys). The scan then reads your preview by itself.", draw: { title: "Visibility › Autopilot", path: ["Pages", "Autopilot", "While this computer is off"], fields: ["Vercel's Protection Bypass secret"], press: "Turn on our server" } },
    ],
  },
  "dataforseo-login": {
    title: "Your DataForSEO login and password for apps (optional, paid)",
    for: "Only if you want Google's results from your own DataForSEO account. AlmiSEO Data and the free sources need no other service.",
    steps: [
      { do: "Open app.dataforseo.com and sign in (or press Try for free: a new account gets a small free credit for testing).", draw: { title: "DataForSEO", path: ["app.dataforseo.com"], press: "Sign in" } },
      { do: "Open app.dataforseo.com/api-access. The login and the password shown there are the ones for apps: they are NOT your sign-in e-mail and password.", draw: { title: "API Access", path: ["app.dataforseo.com", "api-access"], fields: ["API login", "API password"] } },
      { do: "In Visibility: Search results data → paste the login and the password → Save → set the most it may spend → switch it on.", draw: { title: "Visibility › Search results data", path: ["Search results data"], fields: ["DataForSEO login for apps", "DataForSEO password for apps"], press: "Save" } },
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
  "data-screen": {
    title: "The Data screen: money, answers, pages to read",
    for: "One place to see what things cost, which answers changed and which pages need your own browser.",
    steps: [
      "Press Data. The money lines show each service: spent today, spent this month, and its limit. At a limit the work stops, keeps what it found, and tells you. Visibility never raises a limit.",
      "Your monthly AI limit is in Settings, under Your AI assistant. Only you change it.",
      "Needs rebuild: a saved answer changed at its source. The pages that use it are rebuilt by themselves, and wait for you to press Publish. Nothing goes live by itself.",
      "Read these pages myself: sites that refused our reader. Copy the instruction, give it to your own AI in your own browser (with your VPN if the site needs it), then add the file it gives you. It stops at any captcha.",
      "Add your free key: optional. Each one gives some free searches a month, and each has its own counter that stops before any bill. Everything works without them.",
      "Research report: once a week, what the top products in each market offer. A target for us, never a fact on our pages. AlmiPrep and AlmiPTE come first.",
      "AlmiPathway: official facts for each study corridor. A blocked official page is marked verify on official, and is listed for your own browser.",
      "Rank chart: under each published page in Pages. It shows clicks, how often Google showed it, and its average position, from your Search Console. It is free.",
    ],
  },
  /* 🔴 RR-379: one guide per new kind of SEO (each job screen links "How this works") */
  "seo-aso": { title: "App stores (ASO): get your app found", for: "For an app on Google Play, the Apple App Store or the Microsoft Store. Visibility never changes your store listing: you copy what you like.", steps: [
    "Open your product → Every kind of SEO → App stores (ASO). Paste your app's store link and press Read my listing. Apple's listing is read free from Apple's own Lookup service; Google Play's through your search-data account (about a cent). The Microsoft Store has no listing service, so paste its title, description and keywords.",
    "Read the listing score. Each problem says what is wrong, how to fix it, and the store's own limit (with the store page it comes from).",
    "Type the words people search for your app (or let Visibility pick them from your keywords) and press Check my words and competitors: your rank for each word, the apps above you, and which words are worth going for.",
    "Press Write a better listing with AI: a new title, subtitle or short description, description, Apple keyword field, screenshot captions and What's new, inside the limits, only from what your listing already says. Check it, then copy it into the store's own console.",
    "Press Read reviews and draft replies: reviews grouped (bugs, prices, wishes, praise) and polite reply drafts. Post the ones you approve in the store's console.",
    "Press Check my words again each week to follow your rank; the chart shows the trend.",
  ] },
  "seo-local": { title: "Local SEO: be found nearby", for: "For a business with a place customers visit, and for directories of places (mosques, halal food, doctors, architects).", steps: [
    "Open your product → Every kind of SEO → Local SEO. Fill in your business's name, address, phone, hours and categories exactly as you want them everywhere, and press Save my business.",
    "Press Check my name, address and phone. Visibility compares your website, its markup and your Google listing (Google's map data through your search-data account), plus any listing you paste (Bing Places, Apple Business Connect, Facebook). Each difference says what to change.",
    "Copy the LocalBusiness markup to your site, and the Google Business Profile sheet if you have several places. Bing Places can import your Google profile; Apple Business Connect and Facebook are linked with what to fill in.",
    "Type the words customers search and your cities, and press Where am I on the map? to see your place in Google's local results per city.",
    "Press Read reviews and draft replies (your Google reviews, or paste them). Answer the ones you approve in Google Business Profile.",
    "Directory: choose what to list and a city, and press Make a directory page. The places come from OpenStreetMap (open data, named with its date), links only. A page with fewer than 6 places stays out of Google.",
  ] },
  "seo-tech": { title: "Technical SEO: speed, markup, redirects, indexed", for: "Free: Google's PageSpeed Insights and your own Search Console.", steps: [
    "Open your product → Every kind of SEO → Technical SEO and press Test my pages. Your home page and main pages are tested (about a minute each).",
    "Speed: Core Web Vitals from real Chrome users (where Google has them) and the lab test's score on a phone, with the biggest fixes.",
    "Structured data: every markup block checked against the fields Google needs, with the fix.",
    "Redirects: chains, temporary redirects, http without https, dead ends.",
    "Indexed: whether Google has each page (needs Search Console connected). Canonical, robots, sitemap and hreflang stay in SEO check and Languages.",
  ] },
  "seo-rank": { title: "Rank tracking: follow your words", for: "Your position for the words you choose, each week (or each day), on Google and Bing, per country.", steps: [
    "Open your product → Every kind of SEO → Rank tracking. Press Suggest from Search Console, or type your words, one per line: words | country (e.g. oet for nurses | gb).",
    "Press Check my positions. Google's own average position comes free from your Search Console; the live position on Google and Bing comes from your search-data account (under a cent a word).",
    "The chart shows each word over time; the table shows the change and who is above you. Visibility checks again by itself each week (or day) while it is open, inside your caps.",
  ] },
  "seo-ctr": { title: "Click-rate fixes: more clicks from the same searches", for: "Pages Google shows often but people rarely click.", steps: [
    "Open your product → Every kind of SEO → Click-rate fixes and press Find pages to fix. Each page is compared with your OWN pages at the same position, from your Search Console (free).",
    "Give a page and press Write a better title and description: three of each, from the page's own words (no promises, no number the page does not hold).",
    "Change the title and description on your site, then give the page and the day and press I changed it. After 28 days press Compare before and after.",
  ] },
  "seo-aiv": { title: "AI search visibility: do the assistants name you?", for: "ChatGPT, Claude, Perplexity, Gemini and Google's AI Overviews, asked real questions. What they say is an observation on that day, never a promise.", steps: [
    "Open your product → Every kind of SEO → AI search visibility. Check your brand's name, other names, your domain and your competitors.",
    "Press Suggest questions (from the searches and questions Visibility holds), or type your own: real questions your customers ask.",
    "Add your own keys for ChatGPT (OpenAI), Perplexity and Gemini on this screen; Claude uses your AI connection; Google's AI Overviews use your search-data account. An assistant with no key is skipped and said.",
    "Press Ask the assistants. You get a score (half for being named, half for being cited), each answer with the sites it cited, and for each answer you are missing, what page would win it (Create SEO pages makes it).",
    "Ask again each month to see the trend.",
  ] },
  /* 🔴 RR-381: one guide per kind of SEO of wave 2 (each job screen links "How this works") */
  "seo-reviews": { title: "Reviews and reputation: one score from every source", for: "Google, Trustpilot, Tripadvisor, the app stores and reviews you paste (Facebook, others). Visibility never changes, hides or posts a review.", steps: [
    "Open your product → Every kind of SEO → More kinds of SEO → Reviews and reputation. Fill in your business name and city (to find your Google listing), and your Trustpilot or Tripadvisor page if you have one.",
    "Press Read my reviews: one score across every source, each source's own average and total, and what people write about (problems, prices, wishes, praise). Reading uses your search-data account (a cent or two a source).",
    "Press Draft replies: polite reply drafts for the low reviews without an answer. Approve each one, then post it where the review is.",
    "After the first read, Visibility reads your reviews once a day while it is open (Daily watch: on). A new 1–2 star review shows on the first screen and in a Windows notification, with a reply draft ready. Each daily read costs a cent or two per source.",
    "Copy the review-request texts (email, SMS, in-store card). Ask every customer, never only the happy ones, and offer nothing in return: Google's rules forbid both.",
    "Copy the review box to your site: it shows your numbers with the date they were read. Read again each month for the trend.",
  ] },
  "seo-image": { title: "Images: alt text, names, size and image sitemap", for: "For any website with pictures. Free; alt text uses your AI.", steps: [
    "Open Every kind of SEO → More kinds of SEO → Images and press Check my images: alt text, file names, size, format, width and height on your main pages.",
    "Press Write alt text with AI: your AI looks at each image without alt text and describes only what it shows. Check it, then paste it in your site.",
    "Copy the image sitemap to your site and add it in Search Console.",
    "For your own photos, give the owner (and licence page) and copy the ImageObject markup.",
  ] },
  "seo-video": { title: "Video: markup, sitemap, transcripts and chapters", for: "For videos on your own website (YouTube channels have their own job).", steps: [
    "Open Every kind of SEO → More kinds of SEO → Video and press Check my videos: each video's markup and captions.",
    "Paste the video's captions (WebVTT) or their address and press Make chapters from captions: chapters and a transcript, only from what is said.",
    "Fill in the video's title, thumbnail and first publish date and press Make my video markup; copy it and the video sitemap to your site.",
    "Visibility does not turn speech into text: transcripts and chapters come only from captions you give (a WebVTT file or its address).",
  ] },
  "seo-pinterest": { title: "Pinterest: a pin for each page", for: "Visibility writes the text; you post the pins (or connect Pinterest's own scheduler).", steps: [
    "Open Every kind of SEO → More kinds of SEO → Pinterest. Give up to 6 pages (or leave it empty for your main pages) and press Write my pins.",
    "Each page gets a pin title (Pinterest allows 100 characters), a description, a board name and image alt text, with the words people search where they are true.",
    "Make a tall image (2:3) for each pin and post it with the page's link.",
  ] },
  "seo-podcast": { title: "Podcasts: feed, episodes and listings", for: "For a podcast with an RSS feed.", steps: [
    "Open Every kind of SEO → More kinds of SEO → Podcasts. Paste your feed address (your host shows it) and your Spotify show link, and press Check my podcast.",
    "Fix what the feed lacks (artwork, category, descriptions, transcripts). Apple Podcasts is checked through Apple's own search; Spotify by your link.",
    "Copy the PodcastEpisode markup to each episode's page on your site.",
    "Visibility does not turn speech into text: a transcript comes from your podcast host (most can make one and add it to the feed as podcast:transcript).",
  ] },
  "seo-entity": { title: "Brand facts: help search engines know who you are", for: "Your markup, your profiles and Wikidata, with the same facts everywhere. Never a fact you cannot source.", steps: [
    "Open Every kind of SEO → More kinds of SEO → Brand facts. Check your exact name, website, logo, a one-line description and your official profiles, then press Check my brand facts.",
    "Fix each gap: Organization markup on your home page, profile links that open (sameAs), one name everywhere.",
    "Wikidata: if it has your item, link it from your markup. If not, it accepts an item only for something notable with serious public sources; create it only with those sources.",
  ] },
  "seo-news": { title: "News and Discover: articles Google can show", for: "For sites that publish articles or news.", steps: [
    "Open Every kind of SEO → More kinds of SEO → News and Discover. Give your article pages and your publication's name, and press Check my articles.",
    "Fix each article: Article markup with headline, image, dates and author; large image previews allowed; an image at least 1200 px wide; a title that says what the article is.",
    "If you publish news, copy the news sitemap (only articles of the last two days) and submit it in Search Console.",
  ] },
  "seo-backlinks": { title: "Backlinks: who links to you", for: "New, lost and suspicious links, and link ideas. You write to sites yourself; nothing is offered for a link.", steps: [
    "Open Every kind of SEO → More kinds of SEO → Backlinks and press Check my links (DataForSEO's links data, about 4 cents). For free data, paste Search Console's Top linking sites export, and add your Bing key in Bing's screen.",
    "Read the new and lost links. Suspicious links: Google ignores most by itself; use the disavow file only after a manual action.",
    "Give up to 5 competitors and press Find link ideas: sites that link to them and not to you.",
    "Give your best page on the topic and press Draft outreach emails. Read each one and send it yourself.",
  ] },
  "seo-shop": { title: "Shop and marketplaces: feed, product pages, listings", for: "Google Merchant Center, Amazon, Etsy, eBay and others.", steps: [
    "Merchant Center: in Settings → Google press Also connect Merchant Center (your own sign-in), then Read my Merchant Center: every product and Google's own problems for it. Visibility changes nothing there.",
    "Open Every kind of SEO → More kinds of SEO → Shop and marketplaces. Or give your Merchant Center feed's address (or paste it) and press Check my feed: every product against Google's product data rules.",
    "Give product pages and press Check my product pages: the Product markup Google reads.",
    "Give your Amazon product link (or ASIN) and the words buyers search, and press Read my listing: the listing and where it stands. Etsy is read with your own Etsy app key; eBay and others are pasted.",
    "Press Write a better listing: title, bullet points, description and tags from your own listing only. Copy what you like into the marketplace.",
  ] },
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
${g.steps.map((s, i) => `<section class="step" id="s${i + 1}" ${i ? "hidden" : ""}><h2>Step ${i + 1} of ${n}</h2><p>${esc(typeof s === "string" ? s : s.do)}</p>${typeof s === "string" ? "" : draw(s.draw)}</section>`).join("\n")}
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
