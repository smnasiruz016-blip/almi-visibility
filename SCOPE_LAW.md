# THE SCOPE LAW — what "one product at a time" actually forbids

**Ruled by the owner, 10 September 2026.** Recorded here because it will be needed
repeatedly, and because I had been applying it more narrowly than it was ever meant.

---

## THE LINE

> **"as a test ker agar chahain to koi bhi app check ker sektay hain. Mana ye baat ki thi ke
> 1 product ke douran doosra product SHURU nahi kerna."**

| | |
|---|---|
| **READING, MEASURING, or TAKING A SAMPLE FROM any product** | ✅ **ALLOWED** |
| **CHANGING or BUILDING anything inside another product** | 🔴 **FORBIDDEN** |

**The rule was never about which repositories may be opened. It is about which product is
being WORKED ON.** Reading AlmiItalian to build AlmiVisibility's test corpus **is
AlmiVisibility's own work.** Opening a PR in AlmiItalian would be **starting a second
product** — and that is the thing that was forbidden.

### What this permits, concretely

- Case Study #1's corpus may take exhibits from **any repository's history** — see
  `case-study-01/exhibits/`, which now draws on `almi-oet` and `almi-italian`.
- Gate A may measure the pages of **any product**.
- Any product's git history, sitemap, or served responses may be read as evidence.

### What it still forbids

- Editing another product's code.
- Opening a PR in another product's repository.
- Writing another product's data.

**And it agrees with the rule the spec already carried:** research agents may never deploy,
never edit production, and never touch billing or auth.

---

## AND THE SECOND SENTENCE — the mandate

> **"ab visibility ko proper chalanay or bananay k liye kuch bhi kerna perray to kero."**

**Whatever AlmiVisibility needs in order to run and be built properly, do it.**

**Its three limits are unchanged, and all three belong to the owner:**

| | |
|---|---|
| 💰 **spending money** | owner |
| 🗄️ **any production write** | owner |
| 🚀 **the GREEN on a deploy** | owner |

**Everything else is a technical decision.** The standing stop-condition also survives: before
the first migration that creates a table whose loss would cost something, **stop and say so** —
the Neon branch comes first, and it has two halves.

---

## HOW THIS IS ENFORCED IN THE CODE

`bin/freeze-exhibit.mjs` reads other repositories with `git show` and `git ls-tree` **only**. It
never checks out, never commits, never pushes, and never writes anything outside
`case-study-01/exhibits/`. The header says so, so that the boundary is visible at the point
where it could be crossed rather than only in this document.
