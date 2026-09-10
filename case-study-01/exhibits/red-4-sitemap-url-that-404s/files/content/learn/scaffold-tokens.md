---
title: "Scaffold — token probe, delete me when the articles land"
description: "A placeholder that renders every engine token: {{CILS_B1C_FLOOR}} of {{CILS_B1C_SECTION_MAX}} per section, {{CILS_B1C_TOTAL_FLOOR}} of {{CILS_B1C_TOTAL_MAX}} overall."
section: "Start here"
order: 1
cta:
  label: "Practise CILS and CELI"
  href: "/practice"
  note: "Ascolto, Lettura and Analisi are free for 3 days, no card."
related:
  - label: "Scaffold — delete me when the articles land"
    slug: scaffold-example
sources:
  - label: "Unistrasi — criteri di valutazione B1 cittadinanza"
    url: "https://cils.unistrasi.it/public/articoli/382/Criteri%20di%20valutazione%20B1%20cittadinanza_nuovi.pdf"
---

**This file is scaffolding, not content.** It exists only so the token mechanism has something to
resolve against before the 52 articles land, and the content-drop PR deletes it along with
`scaffold-example.md`.

It uses **every token in the allowlist exactly once outside this paragraph**, which is what lets
the gate's dead-token check run against a real corpus instead of an empty one. Its prose is
deliberately dull: nothing here is meant to be read by a learner.

## CILS B1 Cittadinanza

Four sections, each scored out of {{CILS_B1C_SECTION_MAX}}, {{CILS_B1C_TOTAL_MAX}} points in
total. To pass you would need {{CILS_B1C_FLOOR}}/{{CILS_B1C_SECTION_MAX}} in every section and
{{CILS_B1C_TOTAL_FLOOR}}/{{CILS_B1C_TOTAL_MAX}} overall.

> **Whose numbers these are.** Siena publishes the {{CILS_B1C_TOTAL_MAX}}-point total for this
> module but **does not publish a pass mark or a per-section minimum**. The
> {{CILS_B1C_FLOOR}}/{{CILS_B1C_SECTION_MAX}} floor above is **our practice benchmark**, derived
> from the standard CILS B1 rule Siena does publish: 11/20 per skill, 55 to pass out of 100.
> Treat it as a target to train against, not as the exam's own threshold.

The Produzione scritta task asks for {{CILS_B1C_SCRITTA_MIN_WORDS}}–{{CILS_B1C_SCRITTA_MAX_WORDS}}
words.

## CILS standard

Five sections, each out of {{CILS_STANDARD_SECTION_MAX}}, {{CILS_STANDARD_TOTAL_MAX}} points in
total, and {{CILS_STANDARD_FLOOR}} required in every section.

## CELI 2 (B1)

| part | minimum | maximum |
|---|---:|---:|
| Written | {{CELI_DUE_WRITTEN_MIN}} | {{CELI_DUE_WRITTEN_MAX}} |
| Oral | {{CELI_DUE_ORAL_MIN}} | {{CELI_DUE_ORAL_MAX}} |
| Total | {{CELI_DUE_PASS_FLOOR}} | {{CELI_DUE_TOTAL_MAX}} |

Both parts must clear their own minimum on the same sitting.
