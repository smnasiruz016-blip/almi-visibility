/**
 * 🔴 RR-306 A3 · THE CLIENT'S OWN KEYS (YouTube, AI, search), pasted in the app and kept in WINDOWS' OWN SECURE STORE — the Credential
 * Manager (a generic credential per key, for this Windows user on this computer; Windows protects it with DPAPI). The app shows only
 * "saved ✓ (ends …1234)" and can replace or remove a key.
 *   · A key is NEVER written to a file, a log or a report by Visibility: it goes from the paste box to the Credential Manager through the
 *     standard input of a short PowerShell call (never its command line), and is read back the same way, kept in this process's memory only.
 *   · Environment variables still work as a fallback (a key set there is found by its NAME), but the client never has to know about them.
 * The backend is handed in: "windows" (the Credential Manager), "memory" (tests only — nothing persists), or none (not this computer's
 * secure store — a key cannot be saved, said plainly).
 */
import { spawnSync } from "node:child_process";

export const KEY_NAMES = Object.freeze({
  youtube: "YOUTUBE_API_KEY", search: "SEARCH_API_KEY",
  ai: Object.freeze({ anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", gemini: "GEMINI_API_KEY" }),
});
export const AI_PROVIDERS = Object.freeze([
  Object.freeze({ id: "anthropic", name: "Anthropic (Claude)", keyName: KEY_NAMES.ai.anthropic }),
  Object.freeze({ id: "openai", name: "OpenAI (ChatGPT)", keyName: KEY_NAMES.ai.openai }),
  Object.freeze({ id: "gemini", name: "Google (Gemini)", keyName: KEY_NAMES.ai.gemini }),
]);
const NAME = /^[A-Z][A-Z0-9_]{2,63}$/;
const TARGET_PREFIX = "AlmiVisibility:";

/* the Credential Manager through its own Windows functions (advapi32); the secret travels base64 on stdin and stdout only */
const PS = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices; using System.Text;
public static class AvCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct CRED { public int Flags; public int Type; public string TargetName; public string Comment; public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName; }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CredWriteW(ref CRED c, int flags);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CredReadW(string target, int type, int flags, out IntPtr c);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CredDeleteW(string target, int type, int flags);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr p);
  public static void Write(string target, byte[] secret) { var c = new CRED { Type = 1, TargetName = target, UserName = "AlmiVisibility", Persist = 2, CredentialBlobSize = secret.Length, CredentialBlob = Marshal.AllocHGlobal(secret.Length) }; Marshal.Copy(secret, 0, c.CredentialBlob, secret.Length); try { if (!CredWriteW(ref c, 0)) throw new Exception("CredWrite " + Marshal.GetLastWin32Error()); } finally { Marshal.FreeHGlobal(c.CredentialBlob); } }
  public static byte[] Read(string target) { IntPtr p; if (!CredReadW(target, 1, 0, out p)) return null; try { var c = (CRED)Marshal.PtrToStructure(p, typeof(CRED)); var b = new byte[c.CredentialBlobSize]; Marshal.Copy(c.CredentialBlob, b, 0, b.Length); return b; } finally { CredFree(p); } }
  public static bool Delete(string target) { return CredDeleteW(target, 1, 0); }
}
'@
$in = [Console]::In.ReadToEnd().Trim() -split ' '
$op = $in[0]; $target = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($in[1]))
if ($op -eq 'set') { [AvCred]::Write($target, [Convert]::FromBase64String($in[2])); 'ok' }
elseif ($op -eq 'get') { $b = [AvCred]::Read($target); if ($b) { 'v ' + [Convert]::ToBase64String($b) } else { 'none' } }
elseif ($op -eq 'del') { if ([AvCred]::Delete($target)) { 'ok' } else { 'none' } }
`;
const b64 = (s) => Buffer.from(String(s), "utf8").toString("base64");

/** Windows' Credential Manager. `run` is the call (injected in tests); the secret is never on a command line. */
export function windowsBackend({ run = (input) => spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", PS], { input, encoding: "utf8", windowsHide: true, timeout: 20000 }) } = {}) {
  const call = (op, name, value = null) => {
    const r = run(`${op} ${b64(TARGET_PREFIX + name)}${value === null ? "" : ` ${b64(value)}`}`);
    if (r.status !== 0) throw new Error("Windows' secure store did not answer (Credential Manager)");
    return String(r.stdout ?? "").trim();
  };
  return Object.freeze({
    kind: "Windows Credential Manager",
    set(name, value) { if (call("set", name, value) !== "ok") throw new Error("Windows' secure store did not keep the key"); },
    get(name) { const out = call("get", name); return out.startsWith("v ") ? Buffer.from(out.slice(2), "base64").toString("utf8") : null; },
    remove(name) { call("del", name); },
  });
}
/** TESTS ONLY: nothing persists, nothing is written. */
export function memoryBackend() { const m = new Map(); return Object.freeze({ kind: "memory (tests only)", set: (n, v) => void m.set(n, v), get: (n) => m.get(n) ?? null, remove: (n) => void m.delete(n) }); }

/**
 * The keys the app uses. `env` is the fallback (a key found there by its NAME). A read is kept in memory for this run only.
 * status(name) never returns the key: { saved, where, ends } — "ends" is the last 4 characters, shown only to the client in its own app.
 */
export function keyStore({ backend = null, env = process.env } = {}) {
  const cache = new Map();
  const check = (name) => { if (!NAME.test(String(name ?? ""))) throw new Error("not a key name"); };
  const fromStore = (name) => { if (!backend) return null; if (!cache.has(name)) { try { cache.set(name, backend.get(name)); } catch { return null; } } return cache.get(name); };
  return Object.freeze({
    available: Boolean(backend),
    where: backend?.kind ?? "none",
    /** paste → the secure store. Spaces around it are trimmed; an empty key is refused. */
    set(name, value) {
      check(name);
      const v = String(value ?? "").trim();
      if (v.length < 8 || /\s/.test(v)) return { ok: false, why: "That does not look like a key — paste the whole key, with nothing else." };
      if (!backend) return { ok: false, why: "This computer's secure store is not available — the key was not saved." };
      try { backend.set(name, v); cache.set(name, v); return { ok: true }; } catch (e) { return { ok: false, why: `${e.message} — the key was not saved.` }; }
    },
    remove(name) { check(name); if (backend) { try { backend.remove(name); } catch {} } cache.set(name, null); return { ok: true }; },
    /** the key itself — for the one call that needs it, handed straight in, never stored or shown */
    get(name) { check(name); return fromStore(name) ?? (env[name] ? String(env[name]) : null); },
    status(name) {
      check(name);
      const s = fromStore(name);
      if (s) return Object.freeze({ saved: true, where: "saved in AlmiVisibility (Windows' secure store)", ends: s.slice(-4) });
      if (env[name]) return Object.freeze({ saved: true, where: "found in this computer's settings", ends: String(env[name]).slice(-4) });
      return Object.freeze({ saved: false, where: "not saved", ends: null });
    },
  });
}
