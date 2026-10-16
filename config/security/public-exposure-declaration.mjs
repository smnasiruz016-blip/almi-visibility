/**
 * 🔴 F27 C6 · WHAT "PUBLIC EXPOSURE" COVERS — the OWNER's declaration of 3 October 2026, verbatim in
 * _handoffs AlmiVisibility_F27_C6_OWNER_DECLARATION_PUBLIC_EXPOSURE_2026-10-03.md (RR-140 §2):
 *   "a server-generated public directory listing; an error response exposing a stack trace; a successful public response serving a
 *    sensitive environment, repository or backup artefact. AN INTENDED PUBLIC PAGE IS NOT AN EXPOSURE MERELY BECAUSE IT IS REACHABLE OR
 *    INDEXABLE."
 * Read only as wide as the words, as that record's table sets out. Judged on RECORDED responses only — no path is ever requested to create
 * evidence. This is the owner's list, not the engine's: nothing here may be widened, defaulted or configured.
 */
export const PUBLIC_EXPOSURE_DECLARATION = Object.freeze({
  declaredBy: "the owner, 3 October 2026 (RR-140 §2)",
  record: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F27_C6_OWNER_DECLARATION_PUBLIC_EXPOSURE_2026-10-03.md" }),
  classes: Object.freeze([
    /* a 2xx HTML response that is a server's auto-generated index: its title and heading both read "Index of /…" */
    Object.freeze({ id: "DIRECTORY_LISTING", kind: "DIRECTORY_LISTING", title: /<title>\s*Index of \//i, heading: /<h1[^>]*>\s*Index of \//i }),
    /* a response with status 400 or above whose body carries a server runtime's stack trace */
    Object.freeze({ id: "STACK_TRACE", kind: "STACK_TRACE", trace: Object.freeze([
      /\n\s+at [\w$.<>]+ \((?:file:\/\/)?[^()\n]+:\d+:\d+\)/,   // a JavaScript runtime
      /Traceback \(most recent call last\):/,                  // Python
      /\n\s+at [\w$.]+\([\w$]+\.java:\d+\)/,                   // the JVM
      /(?:Stack trace:|#\d+ \/[^\n]+\.php\(\d+\))/,           // PHP
      /\n\s+at [\w.`<>]+\(.*\) in [^\n]+:line \d+/,           // .NET
    ]) }),
    /* a 2xx response for an environment file (.env), a repository path (.git/, .svn/, .hg/) or a backup copy (.bak, .old, .orig, .swp, a
       trailing ~, a .sql dump) */
    Object.freeze({ id: "SENSITIVE_ARTEFACT", kind: "SENSITIVE_ARTEFACT", paths: Object.freeze([/(^|\/)\.env(\.[^/]*)?$/i, /(^|\/)\.(git|svn|hg)(\/|$)/i, /\.(bak|old|orig|swp|sql)$/i, /~$/]) }),
  ]),
});
