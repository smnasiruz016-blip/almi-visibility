/**
 * 🔴 RR-409 (owner, 9 Nov 2026: AlmiVisibility is live in the Microsoft Store, 9N1HKDNVTC7D) · WHICH KIND OF INSTALL IS THIS?
 * A Store install is a packaged (MSIX) app, and the Store updates it. The app's own updater must work ONLY for a direct install (Setup.exe).
 *   · The launcher (installer/Setup.cs) asks Windows itself — GetCurrentPackageFamilyName — whether it runs inside a package, and hands the
 *     answer to the app as --package-family=<name> (nothing when it is not packaged). The answer comes from Windows, never from a file in
 *     the program folder: a copied folder is not a package.
 *   · STORE: the package family name is AlmiVisibility's own (Partner Center). The self-updater does nothing — no check, no download, no
 *     take-over of an old version, no update prompt — and the app says "Updates come from the Microsoft Store."
 *   · PACKAGE: any other package (a test package): its program folder cannot be replaced either, so the self-updater does nothing too.
 *   · DIRECT: no package — everything works as before.
 * DATA when BOTH are installed: a packaged app's writes to %APPDATA% are redirected by Windows into the package's own private copy, except
 * changes to files that already exist there (those reach the real file). Two installs sharing one folder that way would see half of each
 * other's data and could both write run.json and the same settings. So the Store install keeps its OWN data folder inside its package
 * (%LOCALAPPDATA%\Packages\<family>\LocalState\AlmiVisibility), and on its FIRST start takes a COPY of the direct install's data (products,
 * licence, settings) when there is one. After that the two never write each other's files. Keys in Windows' Credential Manager are this
 * Windows user's, read by both.
 */
import { cpSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const STORE_PACKAGE_FAMILY = "Almiworld.AlmiVisibility_vx0w0v5schw1e";
export const STORE_LINE = "Updates come from the Microsoft Store.";
export const KIND = Object.freeze({ store: "store", package: "package", direct: "direct" });

/** the kind of install, from the package family name Windows gave the launcher (null or "" = not packaged) */
export function installKind(packageFamily) {
  const f = String(packageFamily ?? "").trim();
  if (!f) return KIND.direct;
  return f.toLowerCase() === STORE_PACKAGE_FAMILY.toLowerCase() ? KIND.store : KIND.package;
}
/** may this install replace its own program folder? Only a direct install, and only where the platform allows it (platform.mjs selfUpdates) */
export const selfUpdaterRuns = (kind, platformSelfUpdates = true) => kind === KIND.direct && platformSelfUpdates === true;

/* what a first Store start never copies: the running app's port, the window's own browser profile, downloaded updates, the crash records
 * and log of the other install, a stop request */
export const NOT_COPIED = Object.freeze(["run.json", "window", "updates", "crash", "app-asked-to-stop"]);
export const COPIED_MARK = "copied-from-direct-install.json";
/**
 * The Store install's first start: a COPY of the direct install's data, once. Never when the Store data folder already holds anything
 * (its own data is never overwritten), never from itself. Returns what happened, for the log.
 */
export function firstStoreStart({ data, from, now = () => new Date().toISOString() }) {
  if (!from || !data || from === data) return { copied: false, why: "no direct install data folder" };
  if (existsSync(join(data, COPIED_MARK))) return { copied: false, why: "already copied once" };
  const own = existsSync(data) ? readdirSync(data).filter((n) => !NOT_COPIED.includes(n)) : [];
  if (own.length) return { copied: false, why: "the Store install already has its own data" };
  if (!existsSync(from) || !readdirSync(from).some((n) => !NOT_COPIED.includes(n))) return { copied: false, why: "no direct install data to copy" };
  const names = readdirSync(from).filter((n) => !NOT_COPIED.includes(n));
  for (const n of names) cpSync(join(from, n), join(data, n), { recursive: true, errorOnExist: false, force: false });
  writeFileSync(join(data, COPIED_MARK), JSON.stringify({ from, on: now(), items: names.length }));
  return { copied: true, items: names.length };
}
