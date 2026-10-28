/**
 * RR-339 · A DIFFERENT IMAGE ON EVERY PUBLIC PAGE (owner decision, 28 Oct 2026), drawn inline in the style of the owner's pricing image
 * (AlmiVisibility_pricing_flow.svg): the site's colours, simple drawn icons, no other company's logo or trademark, no numbers.
 * Each image is drawn twice: wide (a row of cards) and narrow (cards stacked, for a phone). CSS shows one. Each carries its own light
 * background, so it reads the same in light and dark mode; role="img" with a label, plus a <title>.
 */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const C = Object.freeze({ coral: "#E8776A", ink: "#22203A", body: "#55536B", foot: "#7A7890", soft: "#FDECE8", line: "#F3D9C4", a: "#FFF8F1", b: "#FBE3CC" });

/* icons, centred on (x, y), about 60 px across; `c` the stroke colour */
const ICONS = {
  search: (x, y, c) => `<circle cx="${x - 7}" cy="${y - 6}" r="14" fill="none" stroke="${c}" stroke-width="5"/><line x1="${x + 3}" y1="${y + 4}" x2="${x + 15}" y2="${y + 16}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
  bars: (x, y, c) => `<rect x="${x - 19}" y="${y + 4}" width="9" height="14" fill="${c}"/><rect x="${x - 5}" y="${y - 8}" width="9" height="26" fill="${c}"/><rect x="${x + 9}" y="${y - 20}" width="9" height="38" fill="${c}"/>`,
  doc: (x, y, c) => `<rect x="${x - 17}" y="${y - 22}" width="34" height="44" rx="4" fill="none" stroke="${c}" stroke-width="4"/><line x1="${x - 10}" y1="${y - 10}" x2="${x + 10}" y2="${y - 10}" stroke="${c}" stroke-width="3"/><line x1="${x - 10}" y1="${y - 1}" x2="${x + 10}" y2="${y - 1}" stroke="${c}" stroke-width="3"/><line x1="${x - 10}" y1="${y + 8}" x2="${x + 3}" y2="${y + 8}" stroke="${c}" stroke-width="3"/>`,
  trend: (x, y, c) => `<polyline points="${x - 23},${y + 14} ${x - 7},${y} ${x + 5},${y + 8} ${x + 25},${y - 16}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${x + 15},${y - 16} ${x + 25},${y - 16} ${x + 25},${y - 6}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  question: (x, y, c) => `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${c}" stroke-width="4"/><path d="M${x - 7},${y - 6} q0,-9 8,-9 q8,0 8,8 q0,6 -8,9 v4" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cx="${x + 1}" cy="${y + 14}" r="2.6" fill="${c}"/>`,
  shield: (x, y, c) => `<path d="M${x},${y - 22} l18,7 v12 q0,16 -18,25 q-18,-9 -18,-25 v-12 z" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/><polyline points="${x - 8},${y + 1} ${x - 2},${y + 7} ${x + 9},${y - 5}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  link: (x, y, c) => `<rect x="${x - 24}" y="${y - 8}" width="26" height="16" rx="8" fill="none" stroke="${c}" stroke-width="4" transform="rotate(-35 ${x} ${y})"/><rect x="${x - 2}" y="${y - 8}" width="26" height="16" rx="8" fill="none" stroke="${c}" stroke-width="4" transform="rotate(-35 ${x} ${y})"/>`,
  person: (x, y, c) => `<circle cx="${x}" cy="${y - 13}" r="6" fill="${c}"/><line x1="${x - 16}" y1="${y - 3}" x2="${x + 16}" y2="${y - 3}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 8}" stroke="${c}" stroke-width="4"/><polyline points="${x - 9},${y + 20} ${x},${y + 7} ${x + 9},${y + 20}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  gear: (x, y, c) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${c}" stroke-width="4"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y - 20}" stroke="${c}" stroke-width="5" stroke-linecap="round" transform="rotate(${a} ${x} ${y})"/>`).join("")}`,
  type: (x, y, c) => `<rect x="${x - 24}" y="${y - 14}" width="48" height="28" rx="6" fill="none" stroke="${c}" stroke-width="4"/><line x1="${x - 12}" y1="${y - 6}" x2="${x - 12}" y2="${y + 6}" stroke="${c}" stroke-width="3"/><line x1="${x - 4}" y1="${y + 2}" x2="${x + 14}" y2="${y + 2}" stroke="${c}" stroke-width="3" stroke-dasharray="3 3"/>`,
  globe: (x, y, c) => `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${c}" stroke-width="4"/><ellipse cx="${x}" cy="${y}" rx="9" ry="20" fill="none" stroke="${c}" stroke-width="3"/><line x1="${x - 20}" y1="${y}" x2="${x + 20}" y2="${y}" stroke="${c}" stroke-width="3"/>`,
  download: (x, y, c) => `<line x1="${x}" y1="${y - 20}" x2="${x}" y2="${y + 4}" stroke="${c}" stroke-width="5" stroke-linecap="round"/><polyline points="${x - 10},${y - 6} ${x},${y + 5} ${x + 10},${y - 6}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${x - 20},${y + 6} ${x - 20},${y + 18} ${x + 20},${y + 18} ${x + 20},${y + 6}" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>`,
  screen: (x, y, c) => `<rect x="${x - 24}" y="${y - 18}" width="48" height="30" rx="4" fill="none" stroke="${c}" stroke-width="4"/><line x1="${x - 10}" y1="${y + 20}" x2="${x + 10}" y2="${y + 20}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><line x1="${x}" y1="${y + 12}" x2="${x}" y2="${y + 20}" stroke="${c}" stroke-width="4"/><polyline points="${x - 8},${y - 3} ${x - 2},${y + 3} ${x + 9},${y - 8}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  key: (x, y, c) => `<circle cx="${x - 10}" cy="${y}" r="10" fill="none" stroke="${c}" stroke-width="4"/><line x1="${x}" y1="${y}" x2="${x + 24}" y2="${y}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><line x1="${x + 17}" y1="${y}" x2="${x + 17}" y2="${y + 9}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><line x1="${x + 24}" y1="${y}" x2="${x + 24}" y2="${y + 7}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
  plus: (x, y, c) => `<rect x="${x - 20}" y="${y - 20}" width="40" height="40" rx="8" fill="none" stroke="${c}" stroke-width="4"/><line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y + 10}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><line x1="${x - 10}" y1="${y}" x2="${x + 10}" y2="${y}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
};

/** One image: a title, 3–5 steps { icon, title, lines: [two short lines] }, a footer; the last step coloured when `highlight`; arrows when `flow`. */
export function flowImage({ id, title, steps, foot, label, highlight = true, flow = true }) {
  const n = steps.length, W = 60 + n * 230 + (n - 1) * 55 + 60;
  const card = (s, i, x, y, w, h, wide) => {
    const hot = highlight && i === n - 1, fill = hot ? C.coral : "#fff", ink = hot ? "#fff" : C.ink, body = hot ? "#fff" : C.body, ic = hot ? "#fff" : C.coral;
    const ix = wide ? x + w / 2 : x + 52, iy = wide ? y + 62 : y + h / 2;
    const disc = `<circle cx="${ix}" cy="${iy}" r="34" fill="${hot ? "#fff" : C.soft}"${hot ? ' opacity="0.25"' : ""}/>`;
    const text = wide
      ? `<text x="${ix}" y="${y + 132}" text-anchor="middle" font-size="21" font-weight="700" fill="${ink}">${esc(s.title)}</text>${s.lines.map((l, k) => `<text x="${ix}" y="${y + 164 + k * 24}" text-anchor="middle" font-size="16" fill="${body}">${esc(l)}</text>`).join("")}`
      : `<text x="${x + 100}" y="${y + 36}" font-size="18" font-weight="700" fill="${ink}">${esc(s.title)}</text>${s.lines.map((l, k) => `<text x="${x + 100}" y="${y + 60 + k * 20}" font-size="14" fill="${body}">${esc(l)}</text>`).join("")}`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${wide ? 22 : 18}" fill="${fill}"${hot ? "" : ` stroke="${C.line}" stroke-width="2"`}/>${disc}${ICONS[s.icon](ix, iy, ic)}${text}`;
  };
  const arrowH = (x) => `<line x1="${x + 8}" y1="225" x2="${x + 48}" y2="225" stroke="${C.coral}" stroke-width="4" marker-end="url(#${id}-a)"/>`;
  const marker = `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.a}"/><stop offset="1" stop-color="${C.b}"/></linearGradient><marker id="${id}-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C.coral}"/></marker></defs>`;
  const wide = `<svg class="wide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 420" font-family="Segoe UI, Arial, sans-serif" role="img" aria-labelledby="${id}-t"><title id="${id}-t">${esc(label)}</title>${marker}<rect width="${W}" height="420" rx="28" fill="url(#${id}-g)"/><text x="${W / 2}" y="62" text-anchor="middle" font-size="30" font-weight="700" fill="${C.ink}">${esc(title)}</text>${steps.map((s, i) => { const x = 60 + i * 285; return card(s, i, x, 110, 230, 230, true) + (flow && i < n - 1 ? arrowH(x + 230) : ""); }).join("")}<text x="${W / 2}" y="390" text-anchor="middle" font-size="16" fill="${C.foot}">${esc(foot)}</text></svg>`;
  const footLines = String(foot).split(" · "), NW = 380, top = 64, rowH = 96, gap = flow ? 30 : 14, H = top + n * rowH + (n - 1) * gap + 24 + footLines.length * 20 + 16;
  const narrow = `<svg class="narrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NW} ${H}" font-family="Segoe UI, Arial, sans-serif" role="img" aria-labelledby="${id}-tn"><title id="${id}-tn">${esc(label)}</title><defs><linearGradient id="${id}-gn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.a}"/><stop offset="1" stop-color="${C.b}"/></linearGradient></defs><rect width="${NW}" height="${H}" rx="22" fill="url(#${id}-gn)"/><text x="${NW / 2}" y="40" text-anchor="middle" font-size="19" font-weight="700" fill="${C.ink}">${esc(title)}</text>${steps.map((s, i) => { const y = top + i * (rowH + gap); return card(s, i, 16, y, NW - 32, rowH, false) + (flow && i < n - 1 ? `<path d="M${NW / 2 - 8},${y + rowH + 9} L${NW / 2 + 8},${y + rowH + 9} L${NW / 2},${y + rowH + 21} z" fill="${C.coral}"/>` : ""); }).join("")}${footLines.map((l, k) => `<text x="${NW / 2}" y="${top + n * rowH + (n - 1) * gap + 30 + k * 20}" text-anchor="middle" font-size="13" fill="${C.foot}">${esc(l)}</text>`).join("")}</svg>`;
  return `<figure class="flowimg" data-image="${id}">${wide}${narrow}</figure>`;
}

export const FLOW_CSS = ".flowimg{margin:28px auto 0;max-width:1100px}.flowimg svg{display:block;width:100%;height:auto}.flowimg .narrow{display:none;max-width:420px;margin:0 auto}@media (max-width:640px){.flowimg .wide{display:none}.flowimg .narrow{display:block}}";

/* the five images. The PRICING one is the owner's own image (AlmiVisibility_pricing_flow.svg, 28 Oct 2026), word for word. */
export const IMG = Object.freeze({
  pricing: flowImage({ id: "img-pricing", label: "How AlmiVisibility gets you found: check your site, real demand, pages that answer, get found", title: "How AlmiVisibility gets you found", foot: "Real Google data · No risky backlinks · Your data stays on your computer", steps: [
    { icon: "search", title: "1. Check your site", lines: ["Score, links, security", "and what to fix first"] },
    { icon: "bars", title: "2. Real demand", lines: ["Google keyword volumes", "and the questions people ask"] },
    { icon: "doc", title: "3. Pages that answer", lines: ["Plans and drafts,", "every fact with a source"] },
    { icon: "trend", title: "4. Get found", lines: ["Rank higher on Google,", "get cited in AI answers"] }] }),
  home: flowImage({ id: "img-home", label: "From your website to being found: your site today, what people search, pages that answer", title: "From your website to being found", foot: "Free score first · No card needed · Plans from $30 a month", steps: [
    { icon: "screen", title: "Your site today", lines: ["What search engines", "and AI assistants can read"] },
    { icon: "question", title: "What people search", lines: ["Real questions and", "Google's own search figures"] },
    { icon: "doc", title: "Pages that answer", lines: ["Drafts in your own design,", "each fact with its source"] }] }),
  score: flowImage({ id: "img-score", flow: false, highlight: false, label: "What the free score checks: technical basics, content, accessibility, links and security", title: "What the free score checks", foot: "Up to 10 public pages · robots.txt obeyed · Shown on screen, never stored", steps: [
    { icon: "gear", title: "Technical", lines: ["Canonical, language, mobile", "view and structured data"] },
    { icon: "doc", title: "Content", lines: ["Titles, descriptions", "and one main heading"] },
    { icon: "person", title: "Accessibility", lines: ["Text that describes", "each image"] },
    { icon: "link", title: "Links", lines: ["Links on your pages", "that do not open"] },
    { icon: "shield", title: "Security", lines: ["Your pages open", "only over HTTPS"] }] }),
  finder: flowImage({ id: "img-finder", label: "The free keyword finder: type a word, pick a country, see Google's searches", title: "How the keyword finder works", foot: "Google's own figures · No account needed · Nothing about you is stored", steps: [
    { icon: "type", title: "1. Type a word", lines: ["A product, a service", "or a topic"] },
    { icon: "globe", title: "2. Pick a country", lines: ["Or all countries", "together"] },
    { icon: "bars", title: "3. See the searches", lines: ["Keyword ideas with Google's", "average monthly searches"] }] }),
  download: flowImage({ id: "img-download", label: "Start in four steps: download, install, add your product, paste your key", title: "Start in four steps", foot: "Windows 10 or 11 · Your data stays on your computer", steps: [
    { icon: "download", title: "1. Download", lines: ["The installer for", "Windows"] },
    { icon: "screen", title: "2. Install", lines: ["Next, Install, Finish —", "like any program"] },
    { icon: "plus", title: "3. Add your product", lines: ["Your website, product", "or YouTube channel"] },
    { icon: "key", title: "4. Paste your key", lines: ["Your plan switches on", "within a minute"] }] }),
});
