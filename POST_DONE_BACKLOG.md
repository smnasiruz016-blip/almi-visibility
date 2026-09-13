# POST-DONE BACKLOG

**Opened 13 September 2026, by the owner's completion ruling** (`OWNER_RULING_2026-09-13_COMPLETION_LAW.md`):
§2 — *"Naye requirements, optional improvements ya nayi feature categories current completion path mein
inject mat karo."* — and §6 — *"Optional ideas POST-DONE backlog mein jayengi."*

Nothing in this file is worked on before DONE. Nothing in it is a defect of a frozen boundary. An entry
leaves this file for the completion path only if the one question below changes its answer — and that
change is recorded here with its date and the row that now requires it.

---

## 🔴 THE ONE QUESTION THAT DECIDES WHICH FILE SOMETHING GOES IN

> ### DOES SOME ROW'S FROZEN BOUNDARY REQUIRE IT?
>
> **yes → the completion path.** **no → this backlog.**

A defect that breaches a boundary is on the path. An improvement that would be nice is not, however
obviously good it looks at three in the morning. The answer names the row and quotes the boundary's
words — an answer that cannot do that is a feeling, and a feeling is not how a file is chosen.

---

## THE ENTRIES

| id | what | the one question, answered | from | would move to the path if |
|---|---|---|---|---|
| **PD-1** | The cost ledger's lines extend past a narrow viewport and are reached by **horizontal scrolling** (report, `runs/report/index.html`; visible in `runs/owner-verification/item-56-2026-09-13/item56-narrow-3-cost-ledger.png` and `-4-ledger-scrollbar.png`) | **No.** Item 56's boundary fails on *"broken, hidden or unusable"* and the owner's criteria name *"clipping/overlap/broken critical view"*. **The owner examined it and ruled it is NOT clipping** — the content scrolls, nothing is lost, the view is not broken. An optional improvement, not a defect | finding raised by beta-g; owner ruling, 13 Sep 2026 | a later owner verification finds a ledger line **hidden or unreachable** at the intended width |
| ~~**PD-2**~~ | ~~The four PARKED OET facts (`P-OET-1`)~~ — **RETIRED 13 Sep 2026, moved onto the completion path** | **The answer was YES after all, and the rule found it.** Item 50's frozen boundary requires the UNKNOWN→PASS guard *"exercised by REAL records"* and names *"the guard polices an empty population"* as FAILURE. Every real transition the guard had judged started from FAIL; these four were real UNKNOWN records whose sources could now be re-read — the input item 50 was waiting for. The owner un-parked them for that test only (ruling recorded in the register). This entry's first answer ("no row's boundary names these four facts") was wrong: the boundary does not name facts, it names a population, and they were its members | `P-OET-1` · owner ruling, 13 Sep 2026 | — retired |
| **PD-3** | **`bin/nursing-chain.mjs`** — split its fetch half out, then retire the rest | **No.** Item 14 is VERIFIED-PASS with this writer named, gated behind `--confirm` and confined to this repository in `config/permitted-page-writers.mjs`. Its boundary asks that page writers be declared and gated, not that this one be split | beta-g's brief, 13 Sep 2026 | the writer stops reconciling with the register, or stops being gated or confined (item 14's FAILURE) |
| **PD-4** | **Committing the rendered-DOM archive** (`runs/render/rendered-bodies-2026-09-13.jsonl.br`, 661,614 bytes, kept local) | **No — today.** No row's evidence rests on a rendered DOM. See the trigger recorded in the register under `R-REND-2`: the day a row's evidence depends on it, it is committed, because the evidence behind a tick must outlive the tick | `R-REND-1`, 13 Sep 2026 | a row's EVIDENCE cites a rendered body |
| **PD-5** | **The censuses' declared blind spots** — writers reached by dynamic dispatch (`store[verb](…)`, `fs[name](…)`), issues built outside a writer's own imports, `node_modules`, workflow YAML | **No.** Item 14 is VERIFIED-PASS with these limits **declared on the census itself**, and its boundary asks for a census of declared source, which is what exists. Widening a scanner that meets its boundary is an improvement | `tools/no-generation-census.mjs`, `tools/issue-writer-census.mjs` | a real writer is found hiding behind one of them (that would be item 14's FAILURE, and on the path at once) |

---

## 🔴 LISTED FOR THIS FILE, AND REFUSED BY THE ONE QUESTION

| id | what | why it is NOT here |
|---|---|---|
| **D-KEY-2** | the redirect chain is not captured — `redirect_chain` is `[]` on every record | **Yes, a row requires it.** Item 10's v0.1 half, `PASS_BOUNDARIES_AMENDMENT_1.md`, INPUT: *"the crawled corpus, its served HTML and headers, **redirect chains**, the edge graph, and the robots.txt and sitemap files of the hosts involved"*. A row's frozen boundary names it, so by the rule this file is built on it stays **on the completion path**, blocking item 10. Recorded as `E-BG-4` in the register: the brief that opened this file listed it here; the brief's own rule sends it back |
