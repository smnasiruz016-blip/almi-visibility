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
3. **Read the licence before you copy a sentence.** `sourceQuotable` is set from the licence's
   own words, never from whether the fetch worked. Fill `sourceQuotableBasis` with the term you
   read, or say plainly that none was found.
4. **If it is not expressly quotable, write the fact in OUR OWN WORDS** in `evidence.ownWords`
   and leave `quotedSpan` null. `F6` rejects a stored span where the licence does not permit it.
5. **State `id`, `queue` and `freshness.rule` out loud.** They are all derivable and the helper
   deliberately does not derive them — see `src/facts/record.mjs` for why.
6. `npm run facts:validate`, then `npm run quote-match`. **If the matcher goes red, your span is
   a paraphrase.** That happened to six of the first thirty-two.

## THE THREE THINGS PEOPLE GET WRONG

| | |
|---|---|
| 🔴 **`factCheckedOn` is not yours to fill in casually** | It means a NAMED person or model read the source and judged that the quote supports the value. It is 0 across the registry. `factCheckedBy` is mandatory, and `human:` and `model:` are not the same evidence |
| 🔴 **"could not check" is a THIRD outcome** | A 403 is never a failed match and never a successful check. And a record we may not quote is `not-applicable`, not `could-not-check` — a lawful state must not be reported as a broken source |
| 🔴 **A short span passes trivially** | `"on their own behalf"` matched a glossary entry. The job counts occurrences and flags a span found more than once as a **weak pass**. Length is not a proxy: the other weak pass is 190 characters |

## WHAT MAY NEVER HAPPEN HERE

- **No workaround for a refusal.** No user-agent spoofing, no proxy, no third-party mirror, and
  no paraphrase that is really a quote. A source that declines automated access has declined it.
  **Record the cost.**
- **Nothing is edited in place.** A changed value writes a NEW record and retires the old one
  with `supersededBy` and a reason. A cache that overwrites cannot answer *"when did this change,
  and what did it say before?"*
- **No invented value.** A claim we need and do not have goes in `src/facts/gaps.mjs`, where it
  is counted. A plausible sentence in this directory is indistinguishable from a sourced one.
