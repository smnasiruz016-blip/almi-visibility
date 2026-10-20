/**
 * 🔴 THE ALMIWORLD FAMILY LINKS (RR-302 A: "the same AlmiWorld products link row as AlmiOET … same source list"). AlmiOET reads them from
 * the package @smnasiruz016-blip/almi-data (src/family.ts). This engine has no dependencies, so the list below is that package's list,
 * COPIED VERBATIM from its version 0.5.0 (as installed in almi-oet, read on 20 Oct 2026), in its order — the family strip (Home · eBooks ·
 * products · Contact Us · Shamool Foundation) and the footer (AlmiWorld · Products · Legal & Contact) built exactly as almi-oet's
 * GlobalHeader/FamilyNav and GlobalFooter build them.
 * ⚠️ A COPY DRIFTS (the package's own warning): when the package adds a product, this list must be updated by hand. AlmiVisibility is not in
 * the package's list yet, so no product key is omitted here (every product is shown) and the other products do not link to Visibility.
 */
export const FAMILY_SOURCE = Object.freeze({ package: "@smnasiruz016-blip/almi-data", version: "0.5.0", readOn: "2026-10-20" });
export const FAMILY_PRODUCTS = Object.freeze([
  ["AlmiJob", "https://almijob.almiworld.com/"], ["Salary Checker", "https://almisalary.almiworld.com/"], ["AlmiCV", "https://almicv.almiworld.com/"],
  ["AlmiStudy", "https://almistudy.almiworld.com/"], ["AlmiPrep", "https://almiprep.almiworld.com/"], ["AlmiPTE", "https://almipte.almiworld.com/"],
  ["AlmiTOEFL", "https://almitoefl.almiworld.com/"], ["AlmiOET", "https://almioet.almiworld.com/"], ["AlmiDET", "https://almidet.almiworld.com/"],
  ["AlmiCELPIP", "https://almicelpip.almiworld.com/"], ["AlmiFrench", "https://almifrench.almiworld.com/"], ["AlmiSpanish", "https://almispanish.almiworld.com/"],
  ["AlmiJapanese", "https://almijapanese.almiworld.com/"], ["AlmiKorean", "https://almikorean.almiworld.com/"], ["AlmiGoethe", "https://almigoethe.almiworld.com/"],
  ["AlmiPortuguese", "https://almiportuguese.almiworld.com/"], ["AlmiItalian", "https://almiitalian.almiworld.com/"], ["AlmiDutch", "https://almidutch.almiworld.com/"],
  ["AlmiIcelandic", "https://almiicelandic.almiworld.com/"], ["AlmiDanish", "https://almidanish.almiworld.com/"], ["AlmiNorwegian", "https://alminorwegian.almiworld.com/"],
  ["AlmiSwedish", "https://almiswedish.almiworld.com/"], ["AlmiSwiss", "https://almiswiss.almiworld.com/"],
].map(([label, href]) => Object.freeze({ label, href })));
export const NETWORK_LINKS = Object.freeze({
  home: { label: "Home", href: "https://almiworld.com/" }, ebooks: { label: "eBooks", href: "https://almiworld.com/ebooks-2/" },
  contact: { label: "Contact Us", href: "https://almiworld.com/contact-us/" }, shamool: { label: "Shamool Foundation", href: "https://shamoolfoundation.com/" },
});
/** The family strip, as the package's familyStrip() builds it (no product omitted: Visibility has no key in the list). */
export const familyStrip = () => Object.freeze([NETWORK_LINKS.home, NETWORK_LINKS.ebooks, ...FAMILY_PRODUCTS, NETWORK_LINKS.contact, NETWORK_LINKS.shamool]);
/** The footer columns, as almi-oet's GlobalFooter has them (its own "Guides" link is AlmiOET's and is not copied). */
export const footerColumns = () => Object.freeze([
  { title: "AlmiWorld", links: [{ label: "Home", href: "https://almiworld.com/" }, { label: "Ebooks", href: "https://almiworld.com/ebooks-2/" }, { label: "Shamool Foundation", href: "https://shamoolfoundation.com/" }] },
  { title: "Products", links: [...FAMILY_PRODUCTS] },
  { title: "Legal & Contact", links: [{ label: "Contact Us", href: "https://almiworld.com/contact-us/" }, { label: "Refund and Return Policy", href: "https://almiworld.com/refund_returns/" }, { label: "Privacy Policy", href: "https://almiworld.com/privacy-policy/" }] },
]);
