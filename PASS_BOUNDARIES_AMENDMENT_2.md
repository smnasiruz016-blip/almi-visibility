# ALMIVISIBILITY — PASS BOUNDARIES, AMENDMENT 2 · THE OWNER'S TEXT

**Provenance — read this before using the text below.**

- **Source file:** `AlmiVisibility_PASS_BOUNDARIES_AMENDMENT_2.md`
- **Location when read:** `C:\Projects\_handoffs\` on this machine.
- **Ruled:** **12 September 2026, night session**, by the owner. Authored by beta-g.
- **Amends:** `PASS_BOUNDARIES_SOURCE.md` and `PASS_BOUNDARIES_AMENDMENT_1.md`. It replaces item 14's
  v0.1-half contract from Amendment 1 and adds a seventh state. Everything it does not amend stands.
- **Copy rule:** the body below is the file, **verbatim**. Nothing paraphrased or corrected.

## Why it exists

PR #47 ran item 14's test and its FAILURE condition was met, and the six-state vocabulary had no
word for that: calling it BUILT-NOT-PROVED would have hidden a defeat among unproven rows. The
owner added FAILED (ruling 6) and narrowed item 14's boundary, with teeth (ruling 7).

## Hash verification

| artifact | bytes | sha256 |
|---|---|---|
| `AlmiVisibility_PASS_BOUNDARIES_AMENDMENT_2.md` as read | 4,631 | `e799fedf5260940bc3835e7a3080cc003a550fb5ef1b03824c2ee029a9efa25e` |
| the body below (LF-normalised) | — | `e799fedf5260940bc3835e7a3080cc003a550fb5ef1b03824c2ee029a9efa25e` |

---

# PASS BOUNDARIES — AMENDMENT 2

**12 September 2026, night session. Two owner rulings, authored by beta-g at his instruction.**
Amends `AlmiVisibility_PASS_BOUNDARIES_FROZEN.md` and `AMENDMENT_1`.

---

## A2.1 · THE SEVENTH STATE — `🔴 FAILED`

The six states had no place for a row whose test had run and whose **failure condition was met**.
Item 14 was the first, and calling it `BUILT-NOT-PROVED` would have been a lie: it *was* proved.
It was proved to fail.

```
☐  NOT STARTED
◐  BUILT / NOT PROVED
🧪 TESTABLE NOW
☑  VERIFIED PASS
🔴 FAILED                ← NEW
⚠  BLOCKED / UNKNOWN
⏭  DEFERRED / N-A IN CURRENT FROZEN PHASE
```

### What `FAILED` means, exactly

> **The row's test was run against its own frozen boundary, and the boundary's FAILURE condition
> was met.**

### The four rules that go with it

| | |
|---|---|
| **1** | A row leaves `FAILED` by **exactly two** routes: its test is re-run and passes, or the **owner** changes its boundary by a ruling recorded with date and reason. Nothing else. |
| **2** | A `FAILED` row **may never be quietly returned to `BUILT-NOT-PROVED`.** That would hide a known defeat inside a crowd of unproven rows. |
| **3** | `FAILED` is **counted and named separately in every report.** It is never folded into another count and never described as progress. |
| **4** | 🔴 **A `FAILED` row is worth more than a `BUILT-NOT-PROVED` one.** It means we looked. The ledger should be read that way and reported that way. |

---

## A2.2 · ITEM 14 — THE BOUNDARY IS NARROWED, AND GIVEN TEETH

**Owner's ruling:** a *page-writing path* means one that **writes into a product repository or
publishes**. A **local, `--confirm`-gated candidate renderer is not one.**

That ruling is right — and taken alone it would open exactly the door this product exists to keep
shut. The SEV-0 that produced 43 million pages did not begin as a publisher. **It began as a local
generator that later ran.** So the narrowing comes with teeth.

### Item 14 · v0.1 half — replaces the contract in Amendment 1

| | |
|---|---|
| **INPUT** | the repository as it stands, and a rediscovered URL |
| **EXPECTED** | **(a)** no path writes into any product repository · **(b)** no path publishes · **(c)** no path generates in bulk · **(d)** **every** local page-writing path is dry-run by default, requires an explicit confirm flag, writes only inside this repository, **and is named in a declared register of permitted writers** · **(e)** a rediscovered URL resolves to its **existing** `page_id` |
| **FAILURE** | any path writes outside this repository · or publishes · or generates in bulk · or **defaults to writing** · or **exists without being named in the register** · or a rediscovered URL creates a second record |
| **EVIDENCE** | the census output; the register, reconciled line by line against the census; a RED proof for each of (a)–(d) by injection; and the ID-stability test sabotaged and restored |

### 🔴 (d) IS THE WHOLE AMENDMENT

The six existing writers are permitted **because they are declared, not because they are quiet.**

> **A new page-writing path cannot appear silently. It must be added to a list a human reads.**

The census and the register must **reconcile exactly**. A writer in the code and not in the
register is a `FAILURE`. A writer in the register and not in the code is a stale entry and must be
removed. Six today; the number itself is not the point — **the point is that the number is
declared, and that changing it takes a pull request somebody reads.**

### Every register entry states four things

`what it writes` · `where it writes` · `what gates it` · **`why it is allowed to exist`**

The last one is not decoration. A writer whose reason nobody can state is a writer nobody needs.

---

## A2.3 · WHAT THIS AMENDMENT DOES NOT PERMIT

It does not permit page **generation**. It does not permit publishing. It does not permit a write
into any product repository. It does not permit a writer to default to writing. It does not permit
a writer to exist undeclared.

**And it does not lower item 14's bar — it moves it.** The old bar counted paths. The new bar asks
whether every one of them is declared, gated and justified. That is a harder question, and it is
the right one.

---

## A2.4 · APPLYING THIS

Item 14 returns to **`🧪 TESTABLE NOW`** — its boundary changed by owner ruling, so its earlier
result no longer applies and the test must be run again against the new contract.

It is **not** a tick, and it is **not** a pass. It is a row whose exam has been rewritten and must
be sat again.
