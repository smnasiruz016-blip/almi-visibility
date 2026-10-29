/**
 * 🔴 RR-347 FIX v2 point 1 (owner, 29 Oct 2026) · "Main keyword near the start" and the TikTok/Instagram keyword checks match by MEANING
 * across languages — never a ✗ only because the topic and the title are in different languages.
 *   · First, offline: every word is put in a plain form (Roman Urdu / Hindi spellings folded: bhaie, bhaee, bhai → bhai; shadee, shaadi →
 *     shadi; English plurals → singular) and looked up in a small list of everyday creator words (Roman Urdu, Hindi in Devanagari, Urdu and
 *     Arabic script → the English meaning). Two words match when their plain forms or their meanings are the same.
 *   · When that finds nothing, the AI call the checker already makes is asked the same question (title-check.mjs); with no AI answer the
 *     check says "not checked", never ✗.
 * The list is our own, made of common words; it is not taken from any dictionary.
 */
const GROUPS = [
  ["brother", "bhai", "bhaiya", "bhaijaan", "भाई", "بھائی", "اخ", "أخ", "اخي", "أخي"],
  ["sister", "behn", "behen", "bahen", "bahan", "baji", "aapi", "बहन", "بہن", "اخت", "أخت"],
  ["wedding", "marriage", "shadi", "biyah", "byah", "nikah", "shaadi", "शादी", "विवाह", "شادی", "نکاح", "زفاف", "عرس", "زواج"],
  ["bride", "dulhan", "dulhn", "दुल्हन", "دلہن", "عروس"], ["groom", "dulha", "दूल्हा", "دولہا"],
  ["mother", "mom", "ammi", "ammi jan", "maa", "mama", "amma", "माँ", "मां", "ماں", "امی", "ام", "أم"],
  ["father", "dad", "abbu", "abba", "papa", "baba", "pitaji", "पिता", "पापा", "ابو", "اب", "أب"],
  ["son", "beta", "बेटा", "بیٹا", "ابن"], ["daughter", "beti", "बेटी", "بیٹی", "ابنة", "بنت"],
  ["children", "kids", "child", "kid", "bache", "bachay", "bachche", "bacche", "बच्चे", "بچے", "اطفال", "أطفال"],
  ["friend", "dost", "yaar", "दोस्त", "دوست", "صديق"], ["family", "ghar wale", "gharwale", "pariwar", "parivar", "परिवार", "خاندان", "عائلة"],
  ["home", "house", "ghar", "घर", "گھر", "بيت", "منزل"], ["village", "gaon", "gaaon", "pind", "गाँव", "گاؤں", "قرية"],
  ["city", "shehar", "sheher", "shahar", "शहर", "شہر", "مدينة"], ["travel", "trip", "safar", "yatra", "सफर", "यात्रा", "سفر", "رحلة"],
  ["food", "cooking", "recipe", "khana", "khaana", "pakwan", "खाना", "کھانا", "طعام", "طبخ", "وصفة"],
  ["tea", "chai", "चाय", "چائے", "شاي"], ["morning", "subah", "subha", "सुबह", "صبح", "صباح"], ["night", "raat", "रात", "رات", "ليل", "ليلة"],
  ["day", "din", "दिन", "دن", "يوم"], ["daily", "rozana", "roz", "रोज़", "روزانہ", "يومي"], ["routine", "mamool", "maamool", "معمول", "روتين"],
  ["prayer", "namaz", "salah", "salat", "नमाज़", "نماز", "صلاة"], ["eid", "ईद", "عید", "عيد"], ["ramadan", "ramzan", "रमज़ान", "رمضان"],
  ["study", "padhai", "parhai", "पढ़ाई", "پڑھائی", "دراسة"], ["exam", "imtihan", "imtehan", "pariksha", "परीक्षा", "امتحان"],
  ["school", "madrasa", "स्कूल", "اسکول", "مدرسة"], ["job", "work", "naukri", "kaam", "नौकरी", "काम", "نوکری", "کام", "عمل", "وظيفة"],
  ["money", "paisa", "paise", "पैसा", "پیسہ", "مال", "فلوس"], ["shopping", "kharidari", "khareedari", "ख़रीदारी", "خریداری", "تسوق"],
  ["health", "sehat", "sehet", "सेहत", "صحت", "صحة"], ["exercise", "workout", "warzish", "kasrat", "व्यायाम", "ورزش", "رياضة", "تمرين"],
  ["weather", "mausam", "मौसम", "موسم", "طقس"], ["rain", "barish", "baarish", "बारिश", "بارش", "مطر"], ["love", "pyar", "mohabbat", "प्यार", "پیار", "محبت", "حب"],
  ["happy", "khush", "खुश", "خوش", "سعيد"], ["new", "naya", "nayi", "नया", "نیا", "جديد"], ["first", "pehla", "pehli", "पहला", "پہلا", "أول"],
  ["easy", "asan", "aasan", "आसान", "آسان", "سهل"], ["quick", "fast", "jaldi", "जल्दी", "جلدی", "سريع"], ["life", "zindagi", "ज़िंदगी", "زندگی", "حياة"],
  ["vlog", "vlogs", "व्लॉग", "ولاگ"], ["car", "gaari", "gaadi", "गाड़ी", "گاڑی", "سيارة"], ["garden", "bagh", "bageecha", "बगीचा", "باغ", "حديقة"],
];
const STRIP = /[ً-ٰٟँ-ः़्]/g; // Arabic/Urdu diacritics, Devanagari signs that spellings drop
/** a word's plain form: lower case, marks dropped, Roman Urdu vowel spellings folded, an English plural made singular */
export function plain(w) {
  let s = String(w ?? "").toLowerCase().normalize("NFC").replace(STRIP, "").replace(/[’']s$/, "");
  if (/^[a-z]+$/.test(s)) {
    s = s.replace(/(ie|ee|ey|y)$/, "i").replace(/aa/g, "a").replace(/oo/g, "u").replace(/ii/g, "i");
    if (s.length > 4 && /[^s]s$/.test(s) && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  }
  return s;
}
const MEANING = new Map();
for (const g of GROUPS) for (const w of g) MEANING.set(plain(w.replace(/\s+/g, "")), plain(g[0]));
/** the English meaning a word stands for (its plain form when the list does not know it) */
export const meaningOf = (w) => MEANING.get(plain(w)) ?? plain(w);
/** do two words mean the same — by spelling, by a shared stem, or by the list? */
export function sameWord(a, b) {
  const x = plain(a), y = plain(b);
  if (x === y || meaningOf(x) === meaningOf(y)) return true;
  return x.length > 4 && y.length > 4 && (x.startsWith(y.slice(0, -1)) || y.startsWith(x.slice(0, -1)));
}
