/**
 * 🔴 RR-333 · THE OWNER'S COUNCILS (his input of 27 Oct 2026, "AlmiOET — Councils found by the owner", first 15 countries, nursing and
 * medicine). Found through Google search and checked by beta-g — still TO VERIFY: the country-facts collector reads each on the council's OWN
 * official site (its name, its address) before it counts or is shown; a site that cannot be read from our server stays the owner's, unshown,
 * for his one-tap Approve on /owner. Only the name, the website and the address are kept (no phone, no e-mail).
 *   A · ready (13 bodies, 16 country × profession pairs);
 *   B · doubts: Bangladesh medicine (BMDC — the address he was given is BNMC's: never copied, read from bmdc.org.bd), UK medicine (GMC — no
 *       address given: read from gmc-uk.org), Egypt nursing (is it the syndicate's own site? — never confirmed by itself: his Approve);
 *   C · private sites that are never a source (desktop/country-facts.mjs BLOCKED_SOURCES).
 */
const c = (country, professions, name, site, address, doubt = null) => professions.map((profession) => Object.freeze({ country, profession, name, website: `https://${site}/`, address, doubt }));
export const OWNER_COUNCILS = Object.freeze([
  ...c("Philippines", ["nursing", "medicine"], "Professional Regulation Commission (PRC)", "prc.gov.ph", "P. Paredes St. corner Nicanor Reyes (Morayta) St., Sampaloc, Manila 1008"),
  ...c("Egypt", ["medicine"], "Egyptian Medical Syndicate", "ems.org.eg", "42 Al Qasr Al Aini Street, Cairo"),
  ...c("Egypt", ["nursing"], "Egyptian Nursing Syndicate", "egyptianursingsyndicate.org", "5 El Saraya Street, El Manial, Cairo", "the owner asks to confirm this is the syndicate's own site (not a fan or agent page)"),
  ...c("Bangladesh", ["nursing"], "Bangladesh Nursing and Midwifery Council (BNMC)", "bnmc.gov.bd", "203 Shaheed Syed Nazrul Islam Sarani, Bijoynagar, Dhaka-1000"),
  ...c("Bangladesh", ["medicine"], "Bangladesh Medical and Dental Council (BMDC)", "bmdc.org.bd", null),
  ...c("United Arab Emirates", ["nursing", "medicine"], "Ministry of Health and Prevention (MOHAP)", "mohap.gov.ae", "Sheikh Mohammed Bin Zayed Road, Muhaisnah 2, P.O. Box 1853, Dubai"),
  ...c("Saudi Arabia", ["nursing", "medicine"], "Saudi Commission for Health Specialties (SCFHS)", "scfhs.org.sa", "Al Sahafah branch, Riyadh"),
  ...c("Ireland", ["nursing"], "Nursing and Midwifery Board of Ireland (NMBI)", "nmbi.ie", "18/20 Carysfort Avenue, Blackrock, Co Dublin"),
  ...c("Ireland", ["medicine"], "Medical Council of Ireland", "medicalcouncil.ie", "Kingram House, Kingram Place, Dublin 2, D02 XY88"),
  ...c("United Kingdom", ["nursing"], "Nursing and Midwifery Council (NMC)", "nmc.org.uk", "23 Portland Place, London W1B 1PZ"),
  ...c("United Kingdom", ["medicine"], "General Medical Council (GMC)", "gmc-uk.org", null),
  ...c("Ghana", ["nursing"], "Nursing and Midwifery Council of Ghana", "nmc.gov.gh", "30 Adamafio Crescent, Okponglo, Accra (P.O. Box MB 44)"),
  ...c("Ghana", ["medicine"], "Medical and Dental Council Ghana", "mdcghana.org", "Kwame Nkrumah Avenue, Accra"),
  ...c("Nepal", ["nursing"], "Nepal Nursing Council", "nnc.org.np", "Bansbari, Kathmandu (P.O. Box 12541)"),
  ...c("Nepal", ["medicine"], "Nepal Medical Council", "nmc.org.np", "Bansbari, Kathmandu (P.O. Box 13890)"),
]);
export const ownerCouncilsOf = (country) => OWNER_COUNCILS.filter((x) => x.country === country);
