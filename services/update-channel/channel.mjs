/**
 * AlmiWorld's UPDATE CHANNEL (RR-298 C) — LOCAL ONLY in this round (the hosted channel is DEFERRED until the owner's GREEN). It serves a
 * signed manifest and the package files of one directory: GET /manifest.json, GET /packages/<file>. Bound to 127.0.0.1.
 */
import { createServer } from "node:http";
import { createHash, sign, createPrivateKey } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { signedBytes } from "../../desktop/updater.mjs";

/** The manifest of one package, signed with the channel's Ed25519 private key (PEM). */
export function manifestFor({ version, packageFile, privateKeyPem }) {
  const sha256 = createHash("sha256").update(readFileSync(packageFile)).digest("hex");
  const m = { version, package: `packages/${basename(packageFile)}`, sha256 };
  return { ...m, signature: sign(null, signedBytes(m), createPrivateKey(privateKeyPem)).toString("base64") };
}

export function updateChannel({ dir, manifest }) {
  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname === "/manifest.json") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(manifest)); }
    const f = join(dir, basename(u.pathname));
    if (u.pathname.startsWith("/packages/") && existsSync(f)) { res.writeHead(200, { "content-type": "application/zip" }); return res.end(readFileSync(f)); }
    res.writeHead(404); res.end();
  });
  return { listen: (port = 0) => new Promise((r) => server.listen(port, "127.0.0.1", () => r(server.address().port))), close: () => new Promise((r) => server.close(r)) };
}
