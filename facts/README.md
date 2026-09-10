# `facts/` — THE VERIFIED FACT REGISTRY

**These files ARE the fact store. There is no database table, and none is proposed.**
One file per subject. Each default-exports an array of records.

```
npm run facts            the census — supply, queues, cost, gaps
npm run facts:validate   every law, over every record
npm run quote-match      the nightly job. Takes no input, needs no flag
```

---

## HOW TO ADD A FACT

1. **Find the claim, not the page.** A record is `(subject · predicate · qualifier)`. If you
   are about to write the same fact twice for two pages, you have bound it to a page and it
   will go stale in two places independently. Bind it once.
2. **Read the source's own site.** A law firm's summary or a prep blog is **tier 4 — a lead to
   verify, never the citation itself.** `F4` and `F13` reject a tier-4 record that is not
   `status: "lead"`.
3. 🔴 **READ THE LICENCE IN A BROWSER, YOURSELF, BEFORE YOU COPY A SENTENCE** — a
   summarising fetch tool may not be the citation for a licence any more than for a fact. Then
   set `licence` and `sourceDocumentClass`; `sourceQuotable` is **DERIVED from the two**, and
   `F18` rejects a record that disagrees with the derivation. **Quotability is not a property of
   a domain:** the NMC permits for guidance exactly what it refuses for news.
4. **If it is not expressly quotable, write the fact in OUR OWN WORDS** in `evidence.ownWords`
   and leave `quotedSpan` null. `F6` rejects a stored span where the licence does not permit it.
   The fact survives — **copyright is on their wording, never on the truth.**
5. **If it IS quotable, attach the credit that licence requires** in `attributionStatement`.
   `F20` checks it is *that* licence's credit, not just any credit. A quote without its credit is
   a breach that looks exactly like compliance.
6. **State `id`, `queue` and `freshness.rule` out loud.** They are all derivable and the helper
   deliberately does not derive them — see `src/facts/record.mjs` for why.
7. `npm run facts:validate`, then `npm run quote-match`. **If the matcher goes red, your span is
   a paraphrase.** That happened to six of the first thirty-two.

## THE THINGS PEOPLE GET WRONG

| | |
|---|---|
| 🔴 **`factCheckedOn` is not yours to fill in casually** | It means a NAMED person or model read the source and judged that the quote supports the value. It is 0 across the registry. `factCheckedBy` is mandatory, and `human:` and `model:` are not the same evidence |
| 🔴 **"could not check" is a THIRD outcome** | A 403 is never a failed match and never a successful check. And a record we may not quote is `not-applicable`, not `could-not-check` — a lawful state must not be reported as a broken source |
| 🔴 **A short span passes trivially** | `"on their own behalf"` matched a glossary entry. The job counts occurrences and flags a span found more than once as a **weak pass**. Length is not a proxy: the other weak pass is 190 characters |
| 🔴 **Silence is `false`, not `"unknown"`** | A bare copyright notice IS the licence, and it reserves everything. `"unknown"` is lawful in exactly two states — the licence page would not open, or nobody has read it — and both behave as prohibitions. `F19` |
| 🔴 **RESERVED is not PROHIBITED** | Both stop a quote and they are counted apart. **RESERVED** = "nobody has asked them" — closed by an email to a regulator. **PROHIBITED** = "the answer is in their policy" — closed by nothing. A single `false` makes those the same work forever |
| 🔴 **May quote ≠ must quote** | A permission is not an obligation. A record may hold our own words even where a span is allowed — Immigration NZ is exactly that. Credit, currency and the per-page check are owed **only on a STORED span** |
| 🔴 **An unquotable source is still WATCHABLE** | Fetch it, hash the normalised text, store only the digest. We do not need their words to detect that their words changed, and a one-way hash is not a copy |
| 🔴 **A 200 is not a document** | `nmcnigeria.org` answers 200 with a 114-byte script redirect to a parking lander. The link check verifies the host it LANDED on, and that the body is substantive |
| 🔴 **For the NMC, stale means UNLAWFUL** | Clause 6.3 permits reproduction only while using the most up-to-date version. An expired quote is WITHDRAWN by `quoteUsableNow`, not flagged as old. Render quotes only via `renderableQuote()` |

## WHAT MAY NEVER HAPPEN HERE

- **No workaround for a refusal.** No user-agent spoofing, no proxy, no third-party mirror, and
  no paraphrase that is really a quote. A source that declines automated access has declined it.
  **Record the cost.**
- **Nothing is edited in place.** A changed value writes a NEW record and retires the old one
  with `supersededBy` and a reason. A cache that overwrites cannot answer *"when did this change,
  and what did it say before?"*
- **No invented value.** A claim we need and do not have goes in `src/facts/gaps.mjs`, where it
  is counted. A plausible sentence in this directory is indistinguishable from a sourced one.
