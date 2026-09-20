/**
 * DETECTOR F — A LINK THE SOURCE DECLARES AGAINST THE LINKS ACTUALLY IN THE RENDERED BODY.
 *
 * The source says a page links somewhere. The rendered DOM is what a crawler and a reader actually
 * get. When a link survives in one and not the other, the build ate it — and nothing in the source
 * will ever show that.
 *
 * ── 🔴 THE RENDER STATE DECIDES WHETHER ABSENCE MEANS ANYTHING ──────────────────────────────────
 *
 * This is the one class where a careless detector is guaranteed to be wrong. If the render was
 * PARTIAL — a refused script, a timeout, a resource that never arrived — then a link missing from
 * the DOM may simply be a link that had not been written yet. Absence proves nothing, and the
 * honest answer is UNKNOWN.
 *
 * Only a render that COMPLETED lets absence from the DOM establish absence from the page. The
 * render state is therefore a REQUIRED input with no default: a detector that assumed COMPLETE
 * would turn every flaky render into a fabricated defect.
 *
 * The state vocabulary is imported from the renderer rather than restated, so the two cannot drift.
 */
import { finding, clean, unknown } from "./outcome.mjs";
import { RENDER_STATES } from "../render/render-state.mjs";

const DETECTOR = "source-link-vs-rendered-link";

/** Compare on a normalised form so a trailing slash or a fragment is not read as a missing link. */
const normalise = (href) => {
  const s = String(href ?? "").trim();
  if (s === "") return "";
  const noFragment = s.split("#")[0];
  return noFragment.length > 1 && noFragment.endsWith("/") ? noFragment.slice(0, -1) : noFragment;
};

/**
 * @param {{id:string, locator:string, sourceLinks:string[], renderedLinks:string[], renderState:string, renderReason?:string}[]} pages
 */
export function detectSourceLinkVsRendered({ pages } = {}) {
  if (!Array.isArray(pages)) {
    return [unknown({ detector: DETECTOR, subject: "(input)", reasonCode: "INPUT_ABSENT", detail: "no page list was supplied" })];
  }

  const out = [];
  for (const p of pages) {
    const id = p?.id ?? "(unnamed page)";
    if (!RENDER_STATES.includes(p?.renderState)) {
      out.push(unknown({
        detector: DETECTOR, subject: id, reasonCode: "INPUT_ABSENT",
        detail: `renderState is ${JSON.stringify(p?.renderState)}, not one of ${RENDER_STATES.join(", ")} — this detector supplies no default, because assuming COMPLETE turns a flaky render into a fabricated defect`,
      }));
      continue;
    }
    if (!Array.isArray(p.sourceLinks)) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "INPUT_ABSENT", detail: "no source-declared link list was supplied" }));
      continue;
    }
    if (p.renderState !== "COMPLETE") {
      out.push(unknown({
        detector: DETECTOR, subject: id, reasonCode: "RENDER_NOT_COMPLETE",
        detail: `render state is ${p.renderState}${p.renderReason ? ` (${p.renderReason})` : ""} — a link absent from an incomplete DOM may simply not have been written yet, so absence establishes nothing`,
      }));
      continue;
    }
    if (!Array.isArray(p.renderedLinks)) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "INPUT_ABSENT", detail: "the render completed but no rendered-link list was supplied" }));
      continue;
    }

    const source = p.sourceLinks.map(normalise).filter((x) => x !== "");
    if (source.length === 0) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "EVIDENCE_INCOMPLETE", detail: "the source declares no internal links, so there is no presence claim to check" }));
      continue;
    }
    const rendered = new Set(p.renderedLinks.map(normalise));
    const missing = [...new Set(source)].filter((h) => !rendered.has(h));
    const where = `${p.locator ?? id} · render ${p.renderState} · source declares ${new Set(source).size}, DOM carries ${rendered.size}`;

    if (missing.length > 0) {
      out.push(finding({
        detector: DETECTOR, subject: id,
        defectClass: "source-link-absent-from-rendered-body",
        evidence: [where, `absent from the completed DOM: ${missing.join(", ")}`, `present in the DOM: ${[...rendered].slice(0, 12).join(", ")}`],
        summary: `${missing.length} link(s) the source declares are not in the rendered body, on a render that COMPLETED`,
      }));
      continue;
    }
    out.push(clean({
      detector: DETECTOR, subject: id,
      checked: [where, `every source-declared link found in the DOM: ${[...new Set(source)].join(", ")}`],
      summary: "every link the source declares is present in the rendered body",
    }));
  }
  return out;
}
