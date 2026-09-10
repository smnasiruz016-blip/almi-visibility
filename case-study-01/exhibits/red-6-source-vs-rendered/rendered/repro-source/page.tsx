// The three JSX text nodes copied VERBATIM out of almi-italian @ 14a0f7d.
// Nothing has been reformatted: the line breaks are the point, because the
// defect is a multi-line JSX text node that follows an element.
export default function Page() {
  return (
    <main>
      {/* src/components/ProgressSection.tsx:61-64 */}
      <p className="mt-1 text-xs text-almi-text-muted">
        Ogni punteggio qui è una <strong className="font-semibold">stima</strong> del nostro
        strumento, non un risultato ufficiale dell&apos;ente d&apos;esame.
      </p>

      {/* src/components/GlobalFooter.tsx:9-11 */}
      <p className="max-w-3xl text-white/75">
        <strong className="text-white">AlmiItalian</strong> — honest CILS &amp; CELI practice.
        Total-based level estimates, no section floors, Writing labelled an estimate — never a fabricated
        official score.
      </p>

      {/* A CONTROL: the same words on ONE line. If the space survives here and
          dies above, the cause is the line break, not the words. */}
      <p id="control-single-line">
        Ogni punteggio qui è una <strong className="font-semibold">stima</strong> del nostro strumento.
      </p>
    </main>
  );
}
