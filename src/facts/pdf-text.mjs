/**
 * 🔴 RR-269 §2 · THE PDF READER — the text of a PDF document, as its pages show it, so the verbatim check (C10) and the recheck (C11) work on
 * a PDF source exactly as on a page. Pure: it is handed the document's bytes and returns its text; it requests, reads and writes nothing.
 *
 *   TEXT        the words of every page, in page order: each shown string decoded through its font (the font's own ToUnicode map first, then
 *               its declared encoding), a space where the page leaves a gap between two runs of glyphs, a new line where the line moves
 *   NO_TEXT     a PDF that shows no text (a scanned image) — the caller names it NOT_A_TEXT_DOCUMENT; its bytes are never kept as text
 *   UNREADABLE  not a PDF, an encrypted PDF, or a document whose pages cannot be found — named, never guessed
 *
 * Positions come from the glyph widths the font records (/Widths, or /W for a composite font), so a gap is a gap on the page and not a guess
 * from the order of the operators. Only FlateDecode streams are decoded; a page drawn only from images has no text.
 */
import { inflateSync } from "node:zlib";

export const PDF_TEXT = Object.freeze({ TEXT: "TEXT", NO_TEXT: "NO_TEXT", UNREADABLE: "UNREADABLE" });
export const isPdf = (buf) => Buffer.isBuffer(buf) && buf.subarray(0, 1024).toString("latin1").includes("%PDF-");

/* ---------- the object syntax: one tokenizer for objects and content streams ---------- */
const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set("()<>[]{}/%".split("").map((c) => c.charCodeAt(0)));
class Lexer {
  constructor(bytes, pos = 0) { this.b = bytes; this.p = pos; }
  skip() {
    const b = this.b;
    for (;;) {
      while (this.p < b.length && WS.has(b[this.p])) this.p++;
      if (b[this.p] === 0x25) { while (this.p < b.length && b[this.p] !== 0x0a && b[this.p] !== 0x0d) this.p++; continue; }
      return;
    }
  }
  /** One token: { t: "num"|"name"|"str"|"op"|"["|"]"|"<<"|">>", v } or null at the end. */
  next() {
    this.skip();
    const b = this.b; if (this.p >= b.length) return null;
    const c = b[this.p];
    if (c === 0x5b) { this.p++; return { t: "[" }; }
    if (c === 0x5d) { this.p++; return { t: "]" }; }
    if (c === 0x3c && b[this.p + 1] === 0x3c) { this.p += 2; return { t: "<<" }; }
    if (c === 0x3e && b[this.p + 1] === 0x3e) { this.p += 2; return { t: ">>" }; }
    if (c === 0x2f) { // a name
      let s = ""; this.p++;
      while (this.p < b.length && !WS.has(b[this.p]) && !DELIM.has(b[this.p])) s += String.fromCharCode(b[this.p++]);
      return { t: "name", v: s.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) };
    }
    if (c === 0x28) return { t: "str", v: this.literal() };
    if (c === 0x3c) { // a hex string
      let h = ""; this.p++;
      while (this.p < b.length && b[this.p] !== 0x3e) { const ch = String.fromCharCode(b[this.p++]); if (/[0-9a-fA-F]/.test(ch)) h += ch; }
      this.p++;
      if (h.length % 2) h += "0";
      return { t: "str", v: Buffer.from(h, "hex") };
    }
    let s = "";
    while (this.p < b.length && !WS.has(b[this.p]) && !DELIM.has(b[this.p])) s += String.fromCharCode(b[this.p++]);
    if (s === "") { this.p++; return this.next(); }
    return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s) ? { t: "num", v: Number(s) } : { t: "op", v: s };
  }
  literal() {
    const b = this.b, out = []; let depth = 0; this.p++;
    while (this.p < b.length) {
      const c = b[this.p++];
      if (c === 0x5c) {
        const n = b[this.p++];
        const map = { 0x6e: 0x0a, 0x72: 0x0d, 0x74: 0x09, 0x62: 0x08, 0x66: 0x0c, 0x28: 0x28, 0x29: 0x29, 0x5c: 0x5c };
        if (n in map) out.push(map[n]);
        else if (n >= 0x30 && n <= 0x37) { let o = n - 0x30; for (let k = 0; k < 2 && b[this.p] >= 0x30 && b[this.p] <= 0x37; k++) o = o * 8 + (b[this.p++] - 0x30); out.push(o & 0xff); }
        else if (n === 0x0d) { if (b[this.p] === 0x0a) this.p++; }
        else if (n !== 0x0a) out.push(n);
        continue;
      }
      if (c === 0x28) depth++;
      if (c === 0x29) { if (depth === 0) break; depth--; }
      out.push(c);
    }
    return Buffer.from(out);
  }
}
/** One object value: numbers, names ({ name }), strings (Buffer), arrays, dictionaries (plain objects), references ({ ref }). */
function parseValue(lx, tok = lx.next()) {
  if (!tok) return null;
  if (tok.t === "[") { const a = []; for (let t = lx.next(); t && t.t !== "]"; t = lx.next()) a.push(parseValue(lx, t)); return a; }
  if (tok.t === "<<") {
    const d = {};
    for (let t = lx.next(); t && t.t !== ">>"; t = lx.next()) { if (t.t === "name") d[t.v] = parseValue(lx); }
    return d;
  }
  if (tok.t === "name") return { name: tok.v };
  if (tok.t === "num") {
    /* "n g R" is a reference */
    const save = lx.p, t2 = lx.next(), t3 = t2?.t === "num" ? lx.next() : null;
    if (t2?.t === "num" && t3?.t === "op" && t3.v === "R") return { ref: tok.v };
    lx.p = save; return tok.v;
  }
  if (tok.t === "str") return tok.v;
  if (tok.t === "op") return tok.v === "true" ? true : tok.v === "false" ? false : null;
  return null;
}

/* ---------- the document: every object, the streams decoded, the object streams opened ---------- */
function readObjects(bytes) {
  const s = bytes.toString("latin1");
  const objs = new Map();
  const head = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = head.exec(s))) {
    const num = Number(m[1]);
    const lx = new Lexer(bytes, m.index + m[0].length);
    let value;
    try { value = parseValue(lx); } catch { continue; }
    let stream = null;
    const after = new Lexer(bytes, lx.p); after.skip();
    if (s.startsWith("stream", after.p)) {
      let start = after.p + 6;
      if (s[start] === "\r") start++;
      if (s[start] === "\n") start++;
      const len = typeof value?.Length === "number" ? value.Length : -1;
      let end = len >= 0 && s.startsWith("endstream", skipWs(s, start + len)) ? start + len : s.indexOf("endstream", start);
      if (end < 0) end = s.length;
      stream = bytes.subarray(start, end);
      head.lastIndex = end;
    } else head.lastIndex = lx.p;
    if (!objs.has(num) || objs.get(num).stream === null) objs.set(num, { value, stream });
  }
  /* compressed object streams (PDF 1.5): each holds N objects after a header of N pairs "number offset" */
  for (const { value, stream } of [...objs.values()]) {
    if (value?.Type?.name !== "ObjStm" || !stream) continue;
    const data = decode(value, stream); if (!data) continue;
    const lx = new Lexer(data); const pairs = [];
    for (let i = 0; i < (value.N ?? 0); i++) { const a = lx.next(), b = lx.next(); if (a?.t === "num" && b?.t === "num") pairs.push([a.v, b.v]); }
    for (const [num, off] of pairs) if (!objs.has(num)) { try { objs.set(num, { value: parseValue(new Lexer(data, (value.First ?? 0) + off)), stream: null }); } catch { /* skip */ } }
  }
  return objs;
}
const skipWs = (s, i) => { while (i < s.length && /\s/.test(s[i])) i++; return i; };
/** A stream's bytes, decoded — FlateDecode only; any other filter is not decoded (null). */
function decode(dict, raw) {
  const f = dict?.Filter; const filters = Array.isArray(f) ? f : f ? [f] : [];
  let data = raw;
  for (const x of filters) {
    if (x?.name !== "FlateDecode") return null;
    try { data = inflateSync(data); } catch { try { data = inflateSync(data, { finishFlush: 2 }); } catch { return null; } }
  }
  return data;
}

/* ---------- fonts: codes → text and widths ---------- */
const GLYPHS = { space: " ", exclam: "!", quotedbl: '"', numbersign: "#", dollar: "$", percent: "%", ampersand: "&", quotesingle: "'", quoteright: "’", quoteleft: "‘", parenleft: "(", parenright: ")", asterisk: "*", plus: "+", comma: ",", hyphen: "-", minus: "-", period: ".", slash: "/", colon: ":", semicolon: ";", less: "<", equal: "=", greater: ">", question: "?", at: "@", bracketleft: "[", backslash: "\\", bracketright: "]", underscore: "_", braceleft: "{", bar: "|", braceright: "}", asciitilde: "~", quotedblleft: "“", quotedblright: "”", endash: "–", emdash: "—", bullet: "•", fi: "fi", fl: "fl", ff: "ff", ffi: "ffi", ffl: "ffl", copyright: "©", registered: "®", trademark: "™", degree: "°", ellipsis: "…", nbspace: " ", sterling: "£", Euro: "€", section: "§", paragraph: "¶", eacute: "é", egrave: "è", aacute: "á", agrave: "à", ccedilla: "ç", udieresis: "ü", odieresis: "ö", adieresis: "ä", periodcentered: "·" };
const DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function glyphText(name) {
  if (name.length === 1) return name;
  if (name in GLYPHS) return GLYPHS[name];
  const d = DIGITS.indexOf(name); if (d >= 0) return String(d);
  const u = /^uni([0-9A-Fa-f]{4})/.exec(name) ?? /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  return u ? String.fromCodePoint(parseInt(u[1], 16)) : "";
}
const WIN = new TextDecoder("windows-1252");
function parseCmap(data) {
  const s = data.toString("latin1");
  const map = new Map(); let twoByte = false;
  const hex = (h) => parseInt(h, 16);
  const utf16 = (h) => { const b = Buffer.from(h.length % 4 ? h.padStart(Math.ceil(h.length / 4) * 4, "0") : h, "hex"); let out = ""; for (let i = 0; i + 1 < b.length; i += 2) out += String.fromCharCode(b.readUInt16BE(i)); return out; };
  for (const sec of s.matchAll(/begincodespacerange([\s\S]*?)endcodespacerange/g)) if (/<[0-9a-fA-F]{4}>/.test(sec[1])) twoByte = true;
  for (const sec of s.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const m of sec[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) { map.set(hex(m[1]), utf16(m[2])); if (m[1].length >= 4) twoByte = true; }
  for (const sec of s.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of sec[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g)) {
      const lo = hex(m[1]), hi = hex(m[2]); if (m[1].length >= 4) twoByte = true;
      if (m[4] !== undefined) { const base = utf16(m[4]); for (let c = lo; c <= hi && c - lo < 65536; c++) map.set(c, base.slice(0, -1) + String.fromCharCode(base.charCodeAt(base.length - 1) + (c - lo))); }
      else { const list = [...m[5].matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => utf16(x[1])); list.forEach((t, i) => map.set(lo + i, t)); }
    }
  }
  return { map, twoByte };
}
function makeFont(doc, fontDict) {
  const f = doc.get(fontDict) ?? {};
  const composite = f.Subtype?.name === "Type0";
  let cmap = null;
  const tu = f.ToUnicode?.ref !== undefined ? doc.obj(f.ToUnicode.ref) : null;
  if (tu?.stream) { const data = decode(tu.value, tu.stream); if (data) cmap = parseCmap(data); }
  const bytesPerCode = composite || cmap?.twoByte ? 2 : 1;
  /* widths in thousandths of a unit */
  const widths = new Map(); let dflt = 500;
  if (composite) {
    const desc = doc.get(doc.get(f.DescendantFonts)?.[0]) ?? {};
    dflt = typeof desc.DW === "number" ? desc.DW : 1000;
    const w = doc.get(desc.W) ?? [];
    for (let i = 0; i < w.length;) {
      const first = doc.get(w[i]), nxt = doc.get(w[i + 1]);
      if (Array.isArray(nxt)) { nxt.forEach((x, k) => widths.set(first + k, doc.get(x))); i += 2; }
      else { const last = nxt, wd = doc.get(w[i + 2]); for (let c = first; c <= last && c - first < 65536; c++) widths.set(c, wd); i += 3; }
    }
  } else {
    const first = doc.get(f.FirstChar) ?? 0; const w = doc.get(f.Widths) ?? [];
    w.forEach((x, k) => widths.set(first + k, doc.get(x)));
    const fd = doc.get(f.FontDescriptor); if (typeof fd?.MissingWidth === "number") dflt = fd.MissingWidth;
  }
  /* a simple font's own encoding: its Differences over WinAnsi */
  const diffs = new Map();
  const enc = doc.get(f.Encoding);
  if (enc && Array.isArray(doc.get(enc.Differences))) { let code = 0; for (const x of doc.get(enc.Differences)) { if (typeof x === "number") code = x; else if (x?.name) diffs.set(code++, glyphText(x.name)); } }
  return {
    bytesPerCode,
    codes(buf) { const out = []; for (let i = 0; i + bytesPerCode <= buf.length; i += bytesPerCode) out.push(bytesPerCode === 2 ? buf.readUInt16BE(i) : buf[i]); return out; },
    text(code) {
      if (cmap?.map.has(code)) return cmap.map.get(code);
      if (diffs.has(code)) return diffs.get(code);
      if (composite) return "";
      return WIN.decode(Uint8Array.of(code));
    },
    width(code) { const w = widths.get(code); return typeof w === "number" ? w : dflt; },
  };
}

/* ---------- the pages, in order, and the text each shows ---------- */
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]];
const ID = [1, 0, 0, 1, 0, 0];

function pageText(doc, contents, resources, depth = 0) {
  const out = []; const fonts = new Map();
  const fontOf = (name) => { if (!fonts.has(name)) { const fd = doc.get(doc.get(resources?.Font)?.[name]); fonts.set(name, fd ? makeFont(doc, fd) : null); } return fonts.get(name); };
  let ctm = ID; const stack = [];
  let tm = ID, tlm = ID, font = null, size = 0, tc = 0, tw = 0, th = 1, tl = 0;
  let last = null; // { x, y, fs } where the previous run ended
  const ops = []; const lx = new Lexer(contents);
  for (let t = lx.next(); t; t = lx.next()) {
    if (t.t === "op") {
      if (t.v === "BI") { const i = contents.indexOf("EI", lx.p); lx.p = i < 0 ? contents.length : i + 2; ops.length = 0; continue; } // an inline image: skipped
      run(t.v, ops); ops.length = 0;
    } else if (t.t === "[") { lx.p -= 1; ops.push(parseValue(lx)); }
    else if (t.t === "<<") { lx.p -= 2; ops.push(parseValue(lx)); }
    else ops.push(t.t === "name" ? { name: t.v } : t.v);
  }
  return out.join("");

  function show(buf) {
    if (!font || !Buffer.isBuffer(buf)) return;
    for (const code of font.codes(buf)) {
      const m = mul(tm, ctm);
      const fs = Math.abs(size) * Math.hypot(m[2], m[3]) || 1;
      const x = m[4], y = m[5];
      const ch = font.text(code);
      if (last) {
        if (Math.abs(y - last.y) > 0.5 * Math.max(fs, last.fs)) out.push("\n");
        else if (x - last.x > 0.18 * fs && !/\s$/.test(out.at(-1) ?? "") && !/^\s/.test(ch)) out.push(" ");
        else if (last.x - x > 1.5 * fs) out.push(" ");
      }
      out.push(ch);
      const adv = ((font.width(code) / 1000) * size + tc + (font.bytesPerCode === 1 && code === 32 ? tw : 0)) * th;
      tm = mul([1, 0, 0, 1, adv, 0], tm);
      const e = mul(tm, ctm);
      last = { x: e[4], y: e[5], fs };
    }
  }
  function run(op, a) {
    const n = (i) => (typeof a[i] === "number" ? a[i] : 0);
    switch (op) {
      case "q": stack.push(ctm); break;
      case "Q": ctm = stack.pop() ?? ID; break;
      case "cm": ctm = mul(a.slice(0, 6).map((v) => (typeof v === "number" ? v : 0)), ctm); break;
      case "BT": tm = tlm = ID; break;
      case "Tf": font = fontOf(a[0]?.name); size = n(1); break;
      case "Tc": tc = n(0); break;
      case "Tw": tw = n(0); break;
      case "Tz": th = n(0) / 100; break;
      case "TL": tl = n(0); break;
      case "Td": tlm = mul([1, 0, 0, 1, n(0), n(1)], tlm); tm = tlm; break;
      case "TD": tl = -n(1); tlm = mul([1, 0, 0, 1, n(0), n(1)], tlm); tm = tlm; break;
      case "Tm": tlm = tm = a.slice(0, 6).map((v) => (typeof v === "number" ? v : 0)); break;
      case "T*": tlm = mul([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; break;
      case "Tj": show(a[0]); break;
      case "'": tlm = mul([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; show(a[0]); break;
      case '"': tw = n(0); tc = n(1); tlm = mul([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; show(a[2]); break;
      case "TJ": for (const x of Array.isArray(a[0]) ? a[0] : []) { if (typeof x === "number") tm = mul([1, 0, 0, 1, (-x / 1000) * size * th, 0], tm); else show(x); } break;
      case "Do": {
        /* a form drawn on the page carries its own text */
        const ref = doc.get(resources?.XObject)?.[a[0]?.name];
        const o = ref?.ref !== undefined ? doc.obj(ref.ref) : null;
        if (depth < 4 && o?.stream && o.value?.Subtype?.name === "Form") {
          const data = decode(o.value, o.stream);
          if (data) { const inner = pageText(doc, data, doc.get(o.value.Resources) ?? resources, depth + 1); if (inner) out.push(out.length ? "\n" : "", inner); }
        }
        break;
      }
      default: break;
    }
  }
}

/**
 * The text of a PDF document. Returns { state, text, pages, detail }: TEXT with the words of every page; NO_TEXT when no page shows any
 * text; UNREADABLE (not a PDF, encrypted, or no page found) with its reason.
 */
export function pdfText(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input ?? []);
  if (!isPdf(bytes)) return Object.freeze({ state: PDF_TEXT.UNREADABLE, text: "", pages: 0, detail: "not a PDF document" });
  let objs;
  try { objs = readObjects(bytes); } catch (err) { return Object.freeze({ state: PDF_TEXT.UNREADABLE, text: "", pages: 0, detail: `the objects could not be read: ${String(err?.message ?? err)}` }); }
  const doc = {
    obj: (n) => objs.get(n) ?? null,
    get(v) { let x = v, guard = 0; while (x && typeof x === "object" && x.ref !== undefined && guard++ < 32) x = objs.get(x.ref)?.value ?? null; return x; },
  };
  if (/\/Encrypt\s/.test(bytes.toString("latin1"))) return Object.freeze({ state: PDF_TEXT.UNREADABLE, text: "", pages: 0, detail: "the PDF is encrypted — its text is not read" });
  /* the pages in document order: the catalog's page tree; inherited Resources follow the tree */
  const pages = [];
  const walk = (node, inherited, seen = new Set()) => {
    const d = doc.get(node); if (!d || seen.has(d)) return; seen.add(d);
    const res = doc.get(d.Resources) ?? inherited;
    if (d.Type?.name === "Page" || (!d.Kids && d.Contents)) { pages.push({ d, res }); return; }
    for (const k of doc.get(d.Kids) ?? []) walk(k, res, seen);
  };
  const catalog = [...objs.values()].find((o) => o.value?.Type?.name === "Catalog")?.value;
  if (catalog) walk(catalog.Pages, null);
  if (pages.length === 0) for (const [, o] of [...objs.entries()].sort((x, y) => x[0] - y[0])) if (o.value?.Type?.name === "Page") pages.push({ d: o.value, res: doc.get(o.value.Resources) ?? null });
  if (pages.length === 0) return Object.freeze({ state: PDF_TEXT.UNREADABLE, text: "", pages: 0, detail: "no page was found in the document" });
  const texts = pages.map(({ d, res }) => {
    const parts = [];
    const c = d.Contents;
    for (const r of Array.isArray(doc.get(c)) ? doc.get(c) : [c]) { const o = r?.ref !== undefined ? doc.obj(r.ref) : null; const data = o?.stream ? decode(o.value, o.stream) : null; if (data) parts.push(data); }
    try { return pageText(doc, Buffer.concat(parts.flatMap((p) => [p, Buffer.from("\n")])), res); } catch { return ""; }
  });
  const text = texts.join("\n").replace(/[ \t]+\n/g, "\n").trim();
  return Object.freeze({ state: /\S/.test(text) ? PDF_TEXT.TEXT : PDF_TEXT.NO_TEXT, text, pages: pages.length, detail: /\S/.test(text) ? null : "no page shows any text — a scanned or image-only document" });
}
