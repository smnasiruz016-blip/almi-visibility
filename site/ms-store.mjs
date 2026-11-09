/**
 * 🔴 RR-409 (owner, 9 Nov 2026: AlmiVisibility is live in the Microsoft Store). Its identity, from Partner Center — nothing here is a secret.
 * The Store is the MAIN download on the site: Microsoft's own Store badge (the command called it "Get it from Microsoft"; today's official artwork reads "Download from the Microsoft Store"), the file exactly as Microsoft serves it
 * (https://get.microsoft.com/images/en-us%20dark.svg, fetched 9 Nov 2026, sha256 0e0cd666…fa69 — never redrawn, recoloured or cropped),
 * linking to the Store listing. The direct installer stays as a SECOND choice, a small text link under the badge; the guide for the blue
 * "Windows protected your PC" window sits ONLY beside that link, because a Store install never shows that window.
 */
export const MS_STORE = Object.freeze({
  id: "9N1HKDNVTC7D",
  url: "https://apps.microsoft.com/detail/9N1HKDNVTC7D",
  deepLink: "ms-windows-store://pdp/?productid=9N1HKDNVTC7D",
  packageFamilyName: "Almiworld.AlmiVisibility_vx0w0v5schw1e",
  publisher: "Almiworld",
});
/* the badge file as served by this site (site/img, read at a literal path in app.mjs so the deploy bundle carries it) */
export const BADGE = Object.freeze({ src: "/img/ms-store-badge-en-us-dark.svg", file: "ms-store-badge-en-us-dark.svg", width: 161, height: 44, alt: "Download from the Microsoft Store" }); /* the words on Microsoft's badge itself (the older "Get it from Microsoft" artwork is no longer served: its CDN host does not resolve, 9 Nov 2026) */
export const INSTALLER = Object.freeze({ href: "/download/AlmiVisibility-Setup.exe", line: "Or download the installer (.exe)", guide: "/help/windows-protected-your-pc", guideLine: "If Windows shows a blue “Windows protected your PC” window" });

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Microsoft's badge, linking to the Store listing (shown a little larger than its own 161 x 44, never smaller, never changed) */
export const storeBadge = () => `<a class="ms-badge" href="${MS_STORE.url}" rel="noopener" data-store-badge><img src="${BADGE.src}" width="201" height="55" alt="${esc(BADGE.alt)}"></a>`;
/** the direct installer, the second choice — and the blue-window guide beside it (only here) */
export const installerLine = (href = INSTALLER.href) => `<p class="dl-alt" data-installer><a href="${esc(href)}"${href.startsWith("/download/") ? " download" : ""}>${esc(INSTALLER.line)}</a> · <a href="${INSTALLER.guide}" data-installer-guide>${esc(INSTALLER.guideLine)}</a></p>`;
/** badge first, then the installer link when the installer can be downloaded */
export const getTheApp = ({ installer = INSTALLER.href } = {}) => `<div class="ms-get" data-get-app>${storeBadge()}${installer ? installerLine(installer) : ""}</div>`;
export const MS_STORE_CSS = `.ms-get{margin:16px 0 0}.ms-badge{display:inline-block;line-height:0;border-radius:6px}.ms-badge img{display:block;width:auto;height:55px;max-width:100%}.ms-badge:focus-visible{outline:3px solid var(--coralText);outline-offset:3px}.dl-alt{margin:8px 0 0;font-size:14px}.dl-alt a{color:var(--coralText)}`;
