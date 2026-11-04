/* 🔴 RR-372: the Node program a REAL build may ship. Node 24.15.0 died inside its own network code on the owner's machine; the pin is by hash, so "some 24" can never come back. Used by desktop/build.mjs */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const RUNTIME_PIN = Object.freeze(JSON.parse(readFileSync(new URL("./lists/runtime-pin.json", import.meta.url), "utf8")));
export const sha256Of = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
/** → null, or why this program may not be shipped */
export function runtimeFault(path, { pin = RUNTIME_PIN, hash = sha256Of } = {}) { let got; try { got = hash(path); } catch { return `the Node program ${path} cannot be read`; } return got === pin.sha256 ? null : `${path} is not the pinned Node ${pin.version} (${pin.source})`; }
