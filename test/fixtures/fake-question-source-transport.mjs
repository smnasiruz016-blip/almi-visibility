/**
 * RR-155 · A FAKE question-source transport for bin/collect-public-questions.mjs — loaded ONLY through the entry point's test seam, which
 * is honoured only inside a verified test run. It answers from a scripted scenario, appends one line per call to a calls file, and
 * reaches nothing. Scenario and calls file are named by the test's environment.
 */
import { readFileSync, appendFileSync } from "node:fs";

export default async function fakeTransport(method, params) {
  const scenario = JSON.parse(readFileSync(process.env.FAKE_QS_SCENARIO, "utf8"));
  let n = 0;
  try { n = readFileSync(process.env.FAKE_QS_CALLS, "utf8").split("\n").filter(Boolean).length; } catch { n = 0; }
  appendFileSync(process.env.FAKE_QS_CALLS, JSON.stringify({ method, params }) + "\n");
  return scenario.responses[n] ?? { items: [] };
}
