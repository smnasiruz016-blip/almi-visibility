/**
 * 🔴 RR-362 item 6: a long job finished while the window is closed → a Windows notification. The words go in as data (an environment value), never as part of the command. Tests hand `spawnImpl`.
 */
import { spawn } from "node:child_process";
const TOAST = `$x=[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom,ContentType=WindowsRuntime]::new();$b=[Security.SecurityElement];$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text>'+$b::Escape($env:AV_TITLE)+'</text><text>'+$b::Escape($env:AV_LINE)+'</text></binding></visual></toast>');$t=[Windows.UI.Notifications.ToastNotification,Windows.UI.Notifications,ContentType=WindowsRuntime]::new($x);[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]::CreateToastNotifier('AlmiVisibility').Show($t)`;
export function windowsToast({ title, line, spawnImpl = spawn, platform = process.platform }) {
  if (platform !== "win32") return false;
  try {
    const c = spawnImpl("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(TOAST, "utf16le").toString("base64")], { detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, AV_TITLE: String(title).slice(0, 80), AV_LINE: String(line).slice(0, 200) } });
    c.on?.("error", () => {}); c.unref?.(); return true;
  } catch { return false; }
}
