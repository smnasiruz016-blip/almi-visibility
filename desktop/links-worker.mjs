/* 🔴 RR-370: the source links are opened here, on a thread of their own. Closing hundreds of connections on Windows can hold a thread for many seconds (seen on the built app; RR-366 found the same stall): the window must never wait for it */
import { parentPort, workerData } from "node:worker_threads";
import { setDefaultAutoSelectFamily } from "node:net";
import { setDefaultResultOrder } from "node:dns";
import { checkLinks } from "./source-links.mjs";
setDefaultAutoSelectFamily(false); setDefaultResultOrder("ipv4first");
const { urls, timeoutMs, standin } = workerData;
const fetchImpl = standin ? (u, i) => fetch(new URL(`/check?u=${encodeURIComponent(u)}`, standin), { signal: i?.signal }) : undefined;
checkLinks(urls, { kept: {}, ...(timeoutMs ? { timeoutMs } : {}), ...(fetchImpl ? { fetchImpl } : {}), onDone: (u) => parentPort.postMessage({ done: u }) }).then((kept) => parentPort.postMessage({ kept })).catch((e) => parentPort.postMessage({ failed: String(e?.message ?? e) }));
