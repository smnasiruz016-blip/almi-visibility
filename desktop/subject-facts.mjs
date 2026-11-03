/**
 * RR-323 · THE FACTS THE DEMAND PAGES NEED, from the subject's OWN pages (booking, test dates, results, scores, each sub-test's format).
 * Each fact is a number the page states, said in Visibility's own short words, with its link and the date it was read — never the page's
 * sentence (the page's text is not kept: only the numbers are measured). A fact the page does not state is absent, never guessed.
 * Pure: the pages are handed in ({ url, text, checkedOn }).
 */
const num = (s) => String(s).replace(/[^\d.]/g, "");
/* [key, which page (by its address), the pattern, (match, subject) → our own words] */
const RULES = [
  /* 🔴 RR-363 (owner, oet.com/test/book-a-test read 2 Nov 2026): this page decides booking and results. OET's other pages still said "12 days" for paper results on that day (results-and-scoring, oet-test): never read for them */
  ["bookComputerCloses", /book-a-test$/, /(?:on Computer|OET@Home)[^.]{0,80}?clos\w*\s+(\d{1,2})\s+days? before the test date(?:\s*\((\d{1,2}:\d{2}\s?[AP]M UTC))?/i, (m, s) => `${s}'s own page: bookings for the test on computer at a venue and at home close ${m[1]} days before the test date${m[2] ? ` (${m[2].replace(/(\d)([AP]M)/, "$1 $2")})` : ""}.`],
  ["resultsComputer", /book-a-test$/, /Results for [^.]{0,30}on Computer are released in as little as\s+(\d{1,3})\s+hours after all sub-?tests/i, (m, s) => `${s}'s own page: results for the test on computer come in as little as ${m[1]} hours after all sub-tests are done.`],
  ["results95", /book-a-test$/, /(\d{2})% released within\s+(\d{1,2})\s+calendar days/i, (m, s) => `${s}'s own page: ${m[1]}% of results for the test on computer are released within ${m[2]} calendar days.`],
  ["resultsPaper", /book-a-test$/, /from\s+(\d{1,2})\s+days after the test date for all other regions/i, (m, s) => `${s}'s own page: results for the test on paper come from ${m[1]} days after the test date, in all regions but India and the Philippines.`],
  ["resultsIndia", /book-a-test$/, /as little as\s+(\d{1,2})\s+days after the test date for candidates tested in India and the Philippines/i, (m, s) => `${s}'s own page: in India and the Philippines, results for the test on paper come in as little as ${m[1]} days after the test date.`],
  /* the booking steps and tips, from the subject's own help article */
  ["bookFind", /How-do-I-book-OET$/, /Enter your preferred location[\s\S]{0,60}?click Find a test/i, (m, s) => `Go to ${s}'s booking page, enter your city and country, and press Find a test.`],
  ["bookPaper", /How-do-I-book-OET$/, /on Paper at a venue:[\s\S]{0,120}?registration\.myoet\.com/i, () => "Press Book now, then register or sign in at registration.myoet.com and choose Apply for the test."],
  ["bookComputer", /How-do-I-book-OET$/, /on Computer at a Venue\/OET@Home:[\s\S]{0,120}?oet-global\.com/i, () => "Press Book now, then book at booking.oet-global.com."],
  ["tipCard", /How-do-I-book-OET$/, /have your Visa or MasterCard and ID ready/i, () => "Have your Visa or MasterCard and your ID ready."],
  ["tipMinutes", /How-do-I-book-OET$/, /payment details within (\d{1,2}) minutes/i, (m) => `You have ${m[1]} minutes to finish the booking and pay.`],
  ["tipSpam", /How-do-I-book-OET$/, /\bspam\b/i, () => "Check your spam folder for the confirmation e-mail."],
  ["bookPaperCloses", /book-a-test$/, /Test on Paper close\w*\s+(\d{1,3})\s+days? before/i, (m, s) => `${s}'s own page: bookings for the test on paper close ${m[1]} days before the test date.`],
  /* 🔴 RR-365: the old rule took the price in the row ABOVE "After the booking closing date": every country page said a late change costs AUD 120; OET's table says AU$120 up to that date, AU$200 after */
  ["changeFee", /manage-your-booking$/, /Up to the booking closing date\.?[\s|]*AU\s?\$\s?(\d{2,4})[\s|]*After the booking closing date\.?[\s|]*AU\s?\$\s?(\d{2,4})/i, (m, s) => `${s}'s own page: moving a paper booking to another date, venue or test type costs AU$${m[1]} up to the booking closing date and AU$${m[2]} after.`],
  ["changeFeeComputer", /manage-your-booking$/, /Up to 7 days before the test[\s|]*AU\s?\$\s?(\d{2,4})[\s|]*US\s?\$\s?(\d{2,4})[\s|]*Less than 7 days before the test[\s|]*AU\s?\$\s?(\d{2,4})[\s|]*US\s?\$\s?(\d{2,4})/i, (m, s) => `${s}'s own page: rescheduling the test on computer or at home costs AU$${m[1]} (US$${m[2]} in the US) up to 7 days before the test and AU$${m[3]} (US$${m[4]} in the US) after that.`],
  /* 🔴 RR-366 Part 2: who the test is for, in OET's own terms (read 2 Nov 2026: "tailored to 12 healthcare professions"; "If you are not a health professional … may not be the most suitable") */
  /* RR-367 item 4 (both read 3 Nov 2026) */
  ["contact", /contact-us$/, /(\+\d[\d\s]{7,16}\d)/, (m, s) => `${s}'s own contact page gives its support site, its e-mail and the phone number ${m[1].replace(/\s+/g, " ")}.`],
  ["recognised", /who-recognises-oet$/, /accepted as proof of English language skills/i, (m, s) => `${s}'s own page says its results are accepted as proof of English language skills worldwide, and links to its directory of the organisations that recognise it.`],
  ["professions12", /test\/oet-test$/, /tailored to\s+(\d{1,2})\s+healthcare professions/i, (m, s, text) => { const list = ["medicine", "nursing", "dentistry", "dietetics", "pharmacy", "physiotherapy", "podiatry", "radiology", "occupational therapy", "veterinary science", "optometry", "speech pathology"].filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text)); return `${s}'s own page: ${s} is made for ${m[1]} healthcare professions${list.length >= 3 ? `: ${list.slice(0, -1).join(", ")} and ${list.at(-1)}` : ""}.`; }],
  ["purpose", /test\/oet-test$/, /who seek to register and practi[sc]e in an English-speaking/i, (m, s) => `${s}'s own page: ${s} tests the English of healthcare professionals who want to register and practise where English is spoken.`],
  ["notForOthers", /test\/oet-test$/, /If you are not a health professional/i, (m, s) => `${s}'s own page: for someone who is not a health professional working towards registration, ${s} may not be the most suitable test.`],
  ["sampleTests", /sample-tests$/, /\bsample tests?\b/i, (m, s) => `${s}'s own page offers sample tests to practise with.`],
  ["scale", /results-and-scoring$|test-statistics$/, /scale from\s+0\s*(?:-|–|to)\s*500/i, (m, s) => `${s}'s own page: each sub-test is reported on a scale from 0 to 500, with a letter grade from E to A.`],
  ["gradeB", /ready\/(listening|reading)$/, /grade B \(a scale score of (\d{3})\)/i, (m, s) => `${s}'s own page: grade B is a scale score of ${m[1]}.`],
  ["writingWords", /ready\/writing$/, /word range for the task \((\d{3})\s*[–-]\s*(\d{3}) words\)/i, (m, s) => `${s}'s own page: the Writing task's word range is ${m[1]}–${m[2]} words (no automatic penalty for writing over or under it).`],
  /* RR-355 (owner: "OET Reading talks about the Reading test — its parts, number of questions, time"): each sub-test page's "at a glance" line */
  ["listeningGlance", /ready\/listening$/, /at a glance\s*(?:approximately\s*)?(\d{2,3})\s*minutes(?: in duration)?\s*(\w+) parts? in the sub-test\s*(\d{1,3}) questions/i, (m, s) => `${s}'s own page: Listening takes about ${m[1]} minutes, in ${m[2].toLowerCase()} parts, with ${m[3]} questions in all.`],
  ["readingGlance", /ready\/reading$/, /at a glance\s*(?:approximately\s*)?(\d{2,3})\s*minutes(?: in duration)?\s*(\w+) parts? in the sub-test\s*(\d{1,3}) questions/i, (m, s) => `${s}'s own page: Reading takes ${m[1]} minutes, in ${m[2].toLowerCase()} parts, with ${m[3]} questions in all.`],
  ["speakingGlance", /ready\/speaking$/, /at a glance\s*(?:approximately\s*)?(\d{2,3})\s*minutes\s*(\w+) profession-specific role-?plays?\s*\((\d{1,2}) mins/i, (m, s) => `${s}'s own page: Speaking takes about ${m[1]} minutes — ${m[2].toLowerCase()} role-plays for your own profession, about ${m[3]} minutes each.`],
  ["writingGlance", /ready\/writing$/, /at a glance\s*(?:approximately\s*)?(\d{2,3})\s*minutes/i, (m, s) => `${s}'s own page: the Writing sub-test takes ${m[1]} minutes in all.`],
  ["writingMinutes", /ready\/writing$/, /remaining\s+(\d{2})\s+minutes/i, (m, s) => `${s}'s own page: after the reading time there are ${m[1]} minutes to write the letter, and the case notes can be consulted throughout.`],
  ["writingGradeB", /ready\/writing$/, /grade B[^.]{0,60}?(\d) out of (\d) for Purpose and (\d) out of (\d)/i, (m, s) => `${s}'s own page: grade B in Writing means ${m[1]} out of ${m[2]} for Purpose and ${m[3]} out of ${m[4]} for the other criteria.`],
  ["listeningMarks", /ready\/listening$/, /Part A accounts for (\d{1,2}) marks, Part B accounts for (\d{1,2}) marks, and Part C accounts for (\d{1,2}) marks/i, (m, s) => `${s}'s own page: Listening Part A is ${m[1]} marks, Part B ${m[2]} and Part C ${m[3]} (${+m[1] + +m[2] + +m[3]} in all).`],
  ["listeningB", /ready\/listening$/, /grade B[^.]{0,60}?at least (\d{1,2}) marks/i, (m, s) => `${s}'s own page: grade B in Listening is typically at least ${m[1]} marks.`],
  ["readingMarks", /ready\/reading$/, /total of (\d{1,2}) marks[^.]{0,40}?Part A accounts for (\d{1,2}) marks, Part B accounts for (\d{1,2}) marks and Part C accounts for (\d{1,2}) marks/i, (m, s) => `${s}'s own page: Reading has ${m[1]} marks — Part A ${m[2]}, Part B ${m[3]}, Part C ${m[4]}.`],
  ["readingPartA", /ready\/reading$/, /collected from you after (\d{1,2}) minutes/i, (m, s) => `${s}'s own page: Reading Part A has a strict ${m[1]}-minute limit.`],
  ["readingB", /ready\/reading$/, /grade B[^.]{0,60}?at least (\d{1,2}) marks/i, (m, s) => `${s}'s own page: grade B in Reading is typically at least ${m[1]} marks.`],
  ["speakingRoleplay", /ready\/speaking$/, /natural end at around the (\d{1,2})-minute mark/i, (m, s) => `${s}'s own page: a Speaking role-play usually ends at around ${m[1]} minutes.`],
  ["speakingGradeB", /ready\/speaking$/, /grade B[^.]{0,80}?scores of (\d) out of (\d) on each linguistic criteria and (\d) out of (\d) for the clinical communication/i, (m, s) => `${s}'s own page: grade B in Speaking means mostly ${m[1]} out of ${m[2]} on each language criterion and ${m[3]} out of ${m[4]} for clinical communication.`],
  ["practiceEvery", /sample-tests$/, /one practice test every (\d)\s*[-–]\s*(\d) weeks/i, (m, s) => `${s}'s own page recommends one practice test every ${m[1]}–${m[2]} weeks.`],
  ["benchmarkIelts", /about\/backed-by-research$/, /\((\d{4}), updated [A-Za-z]+ (\d{4})\) The Occupational English Test and IELTS: A Benchmarking Report/i, (m, s) => `${s}'s own research page lists a study benchmarking ${s} against IELTS (${m[1]}, updated ${m[2]}).`],
  ["speakingOtherDay", /on-computer$|at-home$/, /Speaking sub-test will be completed on a different day, up to (\d) days before or after/i, (m, s) => `${s}'s own page: for the test on computer, Speaking is taken online on a different day, up to ${m[1]} days before or after the other sub-tests.`],
  /* RR-327 · re-marking (its own topic): the fee per sub-test and the window to ask, from the subject's re-marking policy page */
  ["remarkFee", /remarking-policy$/, /AU\s?\$\s?(\d{2,4})(?:\s*\([^)]{0,40}\))?(?:\s*\/\s*US\s?\$\s?(\d{2,4})(?:\s*\([^)]{0,40}\))?)?[^.]{0,60}?per sub-?test/i, (m, s) => `${s}'s own page: a re-mark costs AU$${m[1]}${m[2] ? ` (US$${m[2]} in the US)` : ""} per sub-test.`], /* RR-365: "AU$120 (Global, except US) / US$95 (US only)" */
  ["remarkHours", /remarking-policy$/, /within\s+(\d{2,3})\s+hours\s+(?:from|of|after)/i, (m, s) => `${s}'s own page: a re-mark must be asked for within ${m[1]} hours of the results' release.`],
];
/* RR-363: "12 days" for paper results was OET's old word: it never reaches a page again, from any source (the owner's ruling, recipe R12) */
export const oldWording = (text) => /\bpaper\b[^.]{0,80}\b12 (?:calendar )?days\b|\b12 (?:calendar )?days\b[^.]{0,60}\bpaper\b|\bafter the booking closing date costs AU[D$]\s?\$?\s?120\b/i.test(String(text ?? "")); /* RR-365: + the late-change fee this app misread: a copy kept from before never reaches a page */
/* a subject's own help pages no sitemap names (data per subject) */
export const SUBJECT_EXTRA_PAGES = Object.freeze({ OET: Object.freeze(["https://support.oet.com/articles/Knowledge/How-do-I-book-OET", "https://oet.com/contact-us", "https://oet.com/test/who-recognises-oet"]) });
/** the subject's pages → { key: { claimId, fact, text, link, readOn, source, official, body, value } } — only what a page states */
export function subjectFactsOf(pages, subject) {
  const out = {};
  for (const [key, where, re, say] of RULES) {
    for (const p of pages) {
      if (!p?.ok || !where.test(String(p.url ?? "").replace(/\/$/, ""))) continue;
      const flat = String(p.text ?? "").replace(/\s+/g, " "), m = re.exec(flat); if (!m || oldWording(say(m, subject, flat))) continue;
      out[key] = { claimId: `subject-${key}`, fact: key, text: say(m, subject, flat), link: p.url, readOn: String(p.checkedOn ?? "").slice(0, 10), source: `${subject} — its own page`, official: true, body: subject, value: m.slice(1).filter(Boolean).map(num) };
      break;
    }
  }
  return out;
}
/** the subject's own pages to read for them (from its sitemap) — never a blog or a news post */
export const SUBJECT_FACT_PAGES = /\/(test\/(book-a-test(\/manage-your-booking)?|results-and-scoring|oet-test|oet-test-on-computer|oet-test-at-home|test-day-information)|ready\/(writing|speaking|listening|reading|sample-tests)|about\/(test-statistics|backed-by-research)|remarking-policy)$/; // RR-327: + the re-marking policy
/* 🔴 RR-366 Part 2: a page read keeps only WHICH words it holds (never a sentence), so "its official page, checked <date>, does not say this" is said only when that is true */
export const pageWords = (p) => ({ url: p.url, on: String(p.checkedOn ?? "").slice(0, 10), words: [...new Set(String(p.text ?? "").toLowerCase().match(/[a-z]{3,}/g) ?? [])] });
/* which facts each demand topic shows (its answer, its table) */
export const FACTS_FOR = Object.freeze({
  booking: ["bookPaperCloses", "bookComputerCloses", "changeFee", "changeFeeComputer", "resultsPaper", "resultsComputer"],
  results: ["resultsComputer", "results95", "resultsPaper", "resultsIndia", "resultsPhilippines", "scale"],
  remark: ["remarkFee", "remarkHours", "resultsComputer", "resultsPaper", "scale"], // RR-327
  scores: ["scale", "gradeB", "writingGradeB", "speakingGradeB", "listeningB", "readingB"],
  computer: ["resultsComputer", "results95", "speakingOtherDay", "bookComputerCloses"],
  format: ["listeningMarks", "readingMarks", "readingPartA", "writingWords", "writingMinutes", "speakingRoleplay", "scale"],
  prep: ["practiceEvery", "gradeB", "writingWords", "readingPartA"],
  fees: ["changeFee", "changeFeeComputer", "bookPaperCloses"],
  vs: ["benchmarkIelts", "scale", "gradeB"],
  Writing: ["writingWords", "writingMinutes", "writingGradeB"], Speaking: ["speakingRoleplay", "speakingGradeB"], Listening: ["listeningMarks", "listeningB", "gradeB"], Reading: ["readingMarks", "readingPartA", "readingB", "gradeB"],
});
