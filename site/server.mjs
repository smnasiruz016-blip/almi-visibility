#!/usr/bin/env node
/**
 * The almivisibility.almiworld.com site, RUN LOCALLY (bound to 127.0.0.1). The application is site/app.mjs — the same handler Vercel runs
 * (api/index.mjs). Nothing is live until the owner's GREEN.
 *   node site/server.mjs [--port=0] [--data=<dir for the local store and run.json>] [--setup=<a local Setup .exe for the Download button>]
 */
import { createServer } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const DATA = arg("data", join(HERE, "..", ".site-data"));
mkdirSync(DATA, { recursive: true });
const SETUP = arg("setup") ? resolve(arg("setup")) : null;
const handle = createApp({ dataDir: DATA, setupFile: SETUP });
const server = createServer((req, res) => { handle(req, res); });
server.listen(Number(arg("port", "0")), "127.0.0.1", () => writeFileSync(join(DATA, "run.json"), JSON.stringify({ port: server.address().port, pid: process.pid })));
