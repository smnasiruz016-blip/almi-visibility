/**
 * 🔴 THE ALMIWORLD FAMILY LINKS (RR-302 A; RR-303 C: "make the Visibility site read that list — no hand copy"). The list is
 * site/family.generated.json, written ONLY by tools/family-from-almi-data.mjs from the built @smnasiruz016-blip/almi-data package (its
 * name, version and the sha256 of the file it read are inside it). This engine installs no packages (CI and the site build carry no
 * registry credentials), so the package is read where it is built and the result is generated — never typed.
 * The strip and the footer are built exactly as almi-oet's GlobalHeader/FamilyNav and GlobalFooter build them, with Visibility's own key
 * omitted (the package's familyStrip(selfKey) / footerProducts(selfKey)) once the package lists it (v0.8.0, prepared for launch).
 */
import { readFileSync } from "node:fs";

export const FAMILY = Object.freeze(JSON.parse(readFileSync(new URL("./family.generated.json", import.meta.url), "utf8")));
export const FAMILY_SOURCE = Object.freeze(FAMILY.source);
export const SELF_KEY = "visibility";
const selfListed = FAMILY.products.some((p) => p.key === SELF_KEY);
const own = (p) => !(selfListed && p.key === SELF_KEY);
export const FAMILY_PRODUCTS = Object.freeze(FAMILY.products.filter(own).map((p) => Object.freeze({ label: p.name, href: p.href })));
export const NETWORK_LINKS = Object.freeze(Object.fromEntries(Object.entries(FAMILY.network).map(([k, v]) => [k, Object.freeze({ label: v.name, href: v.href })])));
/** The family strip, as the package's familyStrip(selfKey) builds it: Home · eBooks · products · Contact Us · the foundation. */
export const familyStrip = () => Object.freeze([NETWORK_LINKS.home, NETWORK_LINKS.ebooks, ...FAMILY_PRODUCTS, NETWORK_LINKS.contact, Object.values(NETWORK_LINKS).at(-1)]);
/** The footer columns, as almi-oet's GlobalFooter has them (its own "Guides" link is AlmiOET's and is not copied). */
export const footerColumns = () => Object.freeze([
  { title: "AlmiWorld", links: [{ label: "Home", href: "https://almiworld.com/" }, { label: "Ebooks", href: "https://almiworld.com/ebooks-2/" }, Object.values(NETWORK_LINKS).at(-1)] },
  { title: "Products", links: [...FAMILY_PRODUCTS] },
  { title: "Legal & Contact", links: [{ label: "Contact Us", href: "https://almiworld.com/contact-us/" }, { label: "Refund and Return Policy", href: "https://almiworld.com/refund_returns/" }, { label: "Privacy Policy", href: "https://almiworld.com/privacy-policy/" }] },
]);
