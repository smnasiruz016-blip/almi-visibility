/**
 * 🔴 THE ALMIWORLD FAMILY BAR AND FOOTER (RR-398, owner 8 Nov 2026: "i need this header and footer on every page as well as a home button").
 * Every AlmiWorld product shows the same family bar (the AlmiWorld logo and a clear Home button to https://almiworld.com/, then Exams,
 * Languages, Career & Study, AlmiVisibility, Products, Blog and About with the same menus as almiworld.com) and the same footer columns.
 * The links are site/almiworld-family.json, written ONLY by almiworld-site/tools/make-family-kit.mjs from almiworld.com's own header and
 * footer (one source for all 24 products; the live copy is https://almiworld.com/family-nav.json). Never typed here.
 *
 * It replaces RR-302/RR-303's strip from the almi-data package (Home · eBooks · …): eBooks no longer exists and those links pointed at the
 * old WordPress site. FAMILY (the package list) is still read for the product count the launch tests use.
 */
import { readFileSync } from "node:fs";

export const FAMILY = Object.freeze(JSON.parse(readFileSync(new URL("./family.generated.json", import.meta.url), "utf8")));
export const FAMILY_SOURCE = Object.freeze(FAMILY.source);
export const SELF_KEY = "visibility";
const selfListed = FAMILY.products.some((p) => p.key === SELF_KEY);
const own = (p) => !(selfListed && p.key === SELF_KEY);
export const FAMILY_PRODUCTS = Object.freeze(FAMILY.products.filter(own).map((p) => Object.freeze({ label: p.name, href: p.href })));

/** almiworld.com's own header and footer links (RR-398) */
export const ALMIWORLD = Object.freeze(JSON.parse(readFileSync(new URL("./almiworld-family.json", import.meta.url), "utf8")));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* the same look as the kit's AlmiWorldBar on every other product (scoped "awb-" classes, menus are <details>: no script) */
export const ALMIWORLD_BAR_CSS = `.awb{background:#2b1028;color:#fbeff8;font:600 14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;position:relative;z-index:60}
.awb a{color:#fbeff8;text-decoration:none}
.awb-in{max-width:1180px;margin:0 auto;padding:4px 16px;display:flex;align-items:center;gap:10px;min-height:44px}
.awb-logo img{display:block;height:34px;width:auto;background:#fff4e6;border-radius:8px;padding:2px 6px}
.awb-home{display:inline-flex;align-items:center;min-height:36px;padding:6px 14px;border-radius:999px;background:#c2412d;color:#fff!important;font-weight:800}
.awb-home:hover{background:#a63522}
.awb-nav{display:flex;align-items:center;gap:2px;margin-left:auto;flex-wrap:wrap}
.awb-nav>a,.awb-drop>summary{padding:8px 10px;border-radius:8px;cursor:pointer;list-style:none}
.awb-drop>summary::-webkit-details-marker{display:none}
.awb-drop>summary::after{content:" \\25BE";font-size:11px}
.awb-nav>a:hover,.awb-drop>summary:hover{background:#4d2a48}
.awb-drop{position:relative}
.awb-drop ul{position:absolute;right:0;top:100%;margin:4px 0 0;padding:8px;list-style:none;background:#fff7ee;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.25);min-width:220px;max-height:70vh;overflow:auto;z-index:70}
.awb-drop ul a{display:block;padding:7px 10px;border-radius:8px;color:#3d1838;font-weight:600}
.awb-drop ul a:hover{background:#fde7d3}
.awb-mob{display:none;margin-left:auto}
.awb-mob>summary{list-style:none;cursor:pointer;padding:8px 12px;border-radius:8px;border:1px solid #6b2d5c}
.awb-mob>summary::-webkit-details-marker{display:none}
.awb-mob[open]>summary{background:#4d2a48}
.awb-mob-panel{position:absolute;left:0;right:0;top:100%;background:#2b1028;padding:8px 16px 16px;max-height:80vh;overflow:auto;box-shadow:0 16px 32px rgba(0,0,0,.3)}
.awb-mob-panel p{margin:12px 0 4px;color:#ffc9a9;font-weight:800}
.awb-mob-panel a{display:block;padding:7px 0}
@media(max-width:900px){.awb-nav{display:none}.awb-mob{display:block}}`;

/** RR-400: on almivisibility.almiworld.com the family logo is served by this site (site/img/almi-latest.webp, the same file as
 * ALMIWORLD.logo.src, 240x160), because the site's CSP is img-src 'self' data: and blocked the almiworld.com copy (best practices 93). */
export const FAMILY_LOGO_PATH = "/brand/almi-latest.webp";

/** The AlmiWorld family bar, as HTML (on top of every page). RR-399 A7: a built guide passes `logo` (its own served copy of the AlmiWorld
 * logo file, already HTML) so the page fetches nothing from another site; without it, this site's own copy (RR-400). */
export function almiworldBar({ logo = null } = {}) {
  const F = ALMIWORLD;
  const items = (m) => m.items.map((i) => `<li><a href="${esc(i.href)}">${esc(i.label)}</a></li>`).join("");
  return `<div class="awb" data-almiworld-bar=""><div class="awb-in">`
    + `<a class="awb-logo" href="${esc(F.home)}" aria-label="AlmiWorld home">${logo ?? `<img src="${FAMILY_LOGO_PATH}" alt="${esc(F.logo.alt)}" width="${F.logo.width}" height="${F.logo.height}">`}</a>`
    + `<a class="awb-home" href="${esc(F.home)}">Home</a>`
    + `<nav class="awb-nav" aria-label="AlmiWorld family">${F.menus.map((m) => `<details class="awb-drop"><summary>${esc(m.label)}</summary><ul>${items(m)}</ul></details>`).join("")}${F.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}</nav>`
    + `<details class="awb-mob"><summary aria-label="AlmiWorld menu">AlmiWorld ☰</summary><div class="awb-mob-panel">${F.menus.map((m) => `<p>${esc(m.label)}</p>${m.items.map((i) => `<a href="${esc(i.href)}">${esc(i.label)}</a>`).join("")}`).join("")}<p>AlmiWorld</p>${F.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}</div></details>`
    + `</div></div>`;
}

/** The footer columns: almiworld.com's own (RR-398). AlmiVisibility's own privacy and terms are added by the page frame. */
export const footerColumns = () => Object.freeze(ALMIWORLD.footer.columns.map((c) => Object.freeze({ title: c.title, links: [...c.links] })));

/* RR-399 A7 · the kit's footer look (AlmiWorldFooter on every other product: scoped "awf-" classes, no script) */
export const ALMIWORLD_FOOTER_CSS = `.awf{background:#2b1028;color:#e6d9e6;font:400 15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;border-top:8px solid #e8604c;padding:36px 0 28px;margin-top:40px}
.awf a{color:#fbeff8;text-decoration:none;display:inline-block;padding:3px 0;min-height:28px}
.awf a:hover{text-decoration:underline}
.awf-in{max-width:1180px;margin:0 auto;padding:0 16px}
.awf-cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:20px}
.awf-h{color:#ffc9a9;font-weight:800;margin:0 0 8px}
.awf ul{list-style:none;margin:0;padding:0}
.awf-copy{border-top:1px solid #4d2a48;margin-top:16px;padding-top:12px;font-size:14px}
.awf-copy a{text-decoration:underline}`;

/* RR-399 A7 · a built guide's own stylesheet styles every <details>/<summary> as a question card; the bar's menus are not question cards,
 * and its logo is the guide's own cropped logo file (a frame holding a positioned picture) */
const GUIDE_RESET_CSS = `.awb details{background:none;border:0;border-radius:0;margin:0;padding:0}.awb summary{font-size:inherit;font-weight:inherit;color:inherit}.awb details[open] summary{border-bottom:0}
.awb-logo .logo-file{background:#fff4e6;border-radius:8px}.awb-logo .logo-file img{padding:0;background:none;border-radius:0}
.awb nav{justify-content:flex-start}`;

/**
 * RR-399 A7 (RR-397 found AlmiOET's built guides would carry the old filed navigation — eBooks, old WordPress links — on their next publish).
 * The family kit a BUILT PAGE wears, or null: a page whose filed design names AlmiWorld as its company (the company's address is the kit's
 * home) shows the AlmiWorld family bar on top of its header and the AlmiWorld footer, from this one kit, in place of the navigation and
 * footer filed in its questionnaire. The product keeps its own logo, actions and call to action. Any other company's page is unchanged.
 */
export function familyKitFor(design) {
  if (design?.company?.href !== ALMIWORLD.home) return null;
  return Object.freeze({
    home: ALMIWORLD.home,
    css: `${ALMIWORLD_BAR_CSS}\n${GUIDE_RESET_CSS}\n${ALMIWORLD_FOOTER_CSS}`,
    bar: (logo) => almiworldBar({ logo }),
    footer: almiworldFooter,
    /* the bar's links in the order the bar shows them (its menus' links, then its own links), and its footer columns: what a page check holds the page to */
    nav: Object.freeze([...ALMIWORLD.menus.flatMap((m) => m.items), ...ALMIWORLD.links]),
    columns: footerColumns(),
  });
}

/** RR-399 A7 · the AlmiWorld family footer, as HTML: the kit's columns and its copy line (no year: a built page is the same whenever it is rebuilt). */
export function almiworldFooter() {
  const F = ALMIWORLD;
  return `<footer class="awf" data-almiworld-footer=""><div class="awf-in"><div class="awf-cols">`
    + F.footer.columns.map((c) => `<div><p class="awf-h">${esc(c.title)}</p><ul>${c.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")
    + `</div><p class="awf-copy">© ${esc(F.footer.copy)} · <a href="mailto:${esc(F.footer.email)}">${esc(F.footer.email)}</a></p></div></footer>`;
}
