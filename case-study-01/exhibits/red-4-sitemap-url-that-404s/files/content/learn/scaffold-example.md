---
title: "Scaffold — delete me when the articles land"
description: "A placeholder that exercises every part of the /learn machine: frontmatter schema, hub grouping, CTA enumeration, related links, sources, tables and blockquotes."
section: "Start here"
order: 0
cta:
  label: "Practise CILS and CELI"
  href: "/practice"
  note: "Ascolto, Lettura and Analisi are free for 3 days, no card."
related:
  - label: "A related article that does not exist yet"
sources:
  - label: "Unistrasi — criteri di valutazione B1 cittadinanza"
    url: "https://cils.unistrasi.it/public/articoli/382/Criteri%20di%20valutazione%20B1%20cittadinanza_nuovi.pdf"
---

**This file is scaffolding, not content.** It exists so the /learn machine can be built, gated
and reviewed before any article is written, and the content-drop PR deletes it.

It is deliberately written to exercise every branch of the renderer, so that "the machine works"
is demonstrated rather than asserted.

## A table, which must render as real HTML

`remark-gfm` is what makes this parse. Without it the whole thing renders as a paragraph of
pipe characters, which is the kind of defect that ships because nobody looked.

| Exam | Sections | Section max | Banking |
| --- | --- | --- | --- |
| CILS B1 Cittadinanza | 4 | 12 | none |
| CILS UNO (B1) | 5 | 20 | capitalizzazione |
| CELI 2 (B1) | part-scored | — | both parts |

## A blockquote, which must also render

> Siena publishes the 48-point total for the Cittadinanza module but does not publish a pass
> mark or a per-section minimum for it.

## The rest of the markdown surface

- a list item
- another one, with `inline code`

1. an ordered item
2. and a second

A [link to the practice surface](/practice), and some **bold** and _italic_ text.
