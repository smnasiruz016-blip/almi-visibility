/** RR-365b: a small real zip for tests (stored or deflated), with no zip tool. CRCs stay 0: the reader under test does not use them. */
import { deflateRawSync } from "node:zlib";

export function tinyZip(files, { deflate = false, backslash = false } = {}) {
  const locals = [], central = []; let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = Buffer.from(backslash ? path.replace(/\//g, "\\") : path), raw = Buffer.from(text), body = deflate ? deflateRawSync(raw) : raw, method = deflate ? 8 : 0;
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(method, 8); l.writeUInt32LE(body.length, 18); l.writeUInt32LE(raw.length, 22); l.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(method, 10); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    locals.push(l, name, body); central.push(c, name); offset += l.length + name.length + body.length;
  }
  const dir = Buffer.concat(central), end = Buffer.alloc(22), n = Object.keys(files).length;
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(n, 8); end.writeUInt16LE(n, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}
