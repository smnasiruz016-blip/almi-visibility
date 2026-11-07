// RR-387 B4 test helper: an "app" that spends (writes its AI ledger as the real one does after each call), says it started a cycle, then never finishes.
// Run with no --data (a bare `node --test` discovers this file), it does nothing at all: no write, no server.
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
const dir = (process.argv.find((a) => a.startsWith("--data=")) ?? "").slice(7);
if (dir) {
  writeFileSync(join(dir, "ai-usage.json"), JSON.stringify({ days: { "2026-11-08": { requests: 3, usd: 0.42, input: 1000, output: 100, routes: { f: { requests: 3, usd: 0.42 } } } } }));
  const srv = createServer((req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end(req.method === "POST" ? JSON.stringify({ ok: true, started: true }) : JSON.stringify({ busy: true, cycle: null })); });
  srv.listen(0, "127.0.0.1", () => writeFileSync(join(dir, "run.json"), JSON.stringify({ port: srv.address().port })));
}
