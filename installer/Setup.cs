// AlmiVisibility — Setup.exe, the launcher and the uninstaller, in one program (RR-298 C). Per-user: no administrator rights needed.
//   Setup.exe                       the install wizard (Next → Install → Finish)
//   Setup.exe /S [/D=dir] [/NOLAUNCH]   a silent install (tests and scripted installs); it reopens the app if it was running, unless /NOLAUNCH
//   AlmiVisibility.exe              the launcher: starts the local app (or reuses the one already running) and opens its own window
//   AlmiVisibility.exe /nowindow    the launcher without a window (tests)
//   Uninstall.exe /uninstall [/S] [/REMOVEDATA]   remove the program; the client's own data is KEPT unless they choose to remove it
//   AlmiVisibility.exe /apply-update <package.zip> [/S]   install a downloaded, already verified update, keeping all data
// RR-305 (owner decision: "it should take over and update the older version itself"):
//   · TAKE OVER: if AlmiVisibility is running, Setup (and an in-app update) asks it to close (/api/quit, then its window), waits, and only
//     then stops its OWN processes — those whose program file is inside the install folder. Never any other program, never an antivirus.
//   · IN PLACE: the new files are unpacked beside the old ones (app.new) and swapped in only when complete; the old folder is never deleted
//     first (the 1.3.0 Setup deleted it first: a running node.exe stopped the delete half-way and left a broken install).
//   · The client's data (company, products, licence, settings, YouTube settings, raw data) lives in %APPDATA%\AlmiVisibility and is never touched.
//   · NEVER A SILENT HANG: every step is shown and written to the install log (install.log in the install folder); every wait has a limit;
//     a blocked file (an antivirus, a locked file) is named in plain English with what to do. The whole install has a 10-minute limit.
// Unsigned until the owner decides on a code-signing certificate: Windows shows an "unknown publisher" warning.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Management;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("AlmiVisibility")]
[assembly: AssemblyProduct("AlmiVisibility")]
[assembly: AssemblyCompany("AlmiWorld")]

static class Program {
  const string Name = "AlmiVisibility";
  const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\AlmiVisibility";
  public static string Version { get { using (var s = Payload("version.txt")) return s == null ? "0.0.0" : new StreamReader(s).ReadToEnd().Trim(); } }
  public static string DefaultDir { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", Name); } }
  /* TESTS ONLY: /DATA=<dir> uses another data folder and /NOSYSTEM writes no shortcut and no Programs-list entry, so a test install never
   * touches the user's own app, data, desktop icon or registry */
  static string dataOverride = null; static bool noSystem = false;
  public static string DataDir { get { return dataOverride ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), Name); } }
  static string Desktop { get { return Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory); } }
  static string StartMenu { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), Name + ".lnk"); } }
  static string Self { get { return Assembly.GetExecutingAssembly().Location; } }
  static string InstalledDir { get { return Path.GetDirectoryName(Self); } }
  public static string LogPath(string dir) { return Path.Combine(dir, "install.log"); }

  /* a problem the user can act on: the message is plain English and says what to do; the details go to the install log */
  public class Blocked : Exception { public Blocked(string m) : base(m) { } }

  static Stream Payload(string name) { return Assembly.GetExecutingAssembly().GetManifestResourceStream(name); }
  static bool Has(string[] a, string f) { return a.Any(x => string.Equals(x, f, StringComparison.OrdinalIgnoreCase)); }
  static string Arg(string[] a, string prefix) { var x = a.FirstOrDefault(s => s.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)); return x == null ? null : x.Substring(prefix.Length); }
  public static void Log(string dir, string line) { try { Directory.CreateDirectory(dir); File.AppendAllText(LogPath(dir), DateTime.UtcNow.ToString("s") + "Z " + line + Environment.NewLine); } catch { } }
  static void Step(string dir, Action<int, string> progress, int pct, string text) { Log(dir, "STEP " + pct + "% " + text); if (progress != null) progress(pct, text); }

  [STAThread]
  static int Main(string[] args) {
    var exe = Path.GetFileNameWithoutExtension(Self).ToLowerInvariant();
    dataOverride = Arg(args, "/DATA="); noSystem = Has(args, "/NOSYSTEM");
    try {
      if (Has(args, "/apply-update")) return ApplyUpdate(args);
      if (Has(args, "/uninstall") || exe == "uninstall") return Has(args, "/S") ? Uninstall(Has(args, "/REMOVEDATA")) : UninstallWizard();
      if (exe == "almivisibility") return Launch(!Has(args, "/nowindow"));
      if (Has(args, "/S")) {
        var dir = Arg(args, "/D=") ?? DefaultDir;
        var wasRunning = Install(dir, null);
        /* a TEST install (/NOSYSTEM) reopens the app without a window */
        if (wasRunning && !Has(args, "/NOLAUNCH")) Process.Start(Path.Combine(dir, "AlmiVisibility.exe"), (dataOverride == null ? "" : "\"/DATA=" + dataOverride + "\"") + (noSystem ? " /nowindow" : ""));
        return 0;
      }
      Application.EnableVisualStyles();
      Application.Run(new Wizard());
      return 0;
    } catch (Exception e) {
      var dir = Has(args, "/S") && Arg(args, "/D=") != null ? Arg(args, "/D=") : (exe == "almivisibility" || Has(args, "/apply-update") ? InstalledDir : DefaultDir);
      Log(dir, (e is Blocked ? "BLOCKED " : "ERROR ") + string.Join(" ", args) + " — " + e.Message.Replace("\n", " ") + (e is Blocked ? "" : " · " + e.GetType().Name));
      if (!Has(args, "/S")) MessageBox.Show(e.Message + "\n\nThe install log is here:\n" + LogPath(dir), Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
      Console.Error.WriteLine((e is Blocked ? "BLOCKED " : "ERROR ") + e.Message);
      return e is Blocked ? 3 : 1;
    }
  }

  /* ── install: take over a running copy, unpack beside the old files, swap in, the launcher, the shortcuts, the Programs-list entry.
   *    Returns whether AlmiVisibility was running (so it can be reopened). ── */
  public static bool Install(string dir, Action<int, string> progress) {
    Directory.CreateDirectory(dir);
    Step(dir, progress, 2, "Starting Setup " + Version + " — the install log is " + LogPath(dir));
    var wasRunning = TakeOver(dir, progress, -1);
    var fresh = Path.Combine(dir, "app.new");
    Step(dir, progress, 22, "Unpacking the new program files");
    RemoveFolder(dir, fresh);
    using (var z = new ZipArchive(Payload("payload.zip"), ZipArchiveMode.Read)) Unpack(dir, z, fresh, progress);
    CheckUnpacked(fresh);
    Step(dir, progress, 62, "Replacing the old version (your data is kept in " + DataDir + ")");
    Swap(dir, fresh);
    Step(dir, progress, 75, "Adding the launcher and the uninstaller");
    CopyWithRetry(dir, Self, Path.Combine(dir, "AlmiVisibility.exe"));
    CopyWithRetry(dir, Self, Path.Combine(dir, "Uninstall.exe"));
    Directory.CreateDirectory(DataDir);
    if (noSystem) Step(dir, progress, 90, "TEST INSTALL (/NOSYSTEM): no desktop icon, no Start-menu entry, no Programs-list entry");
    else {
    Step(dir, progress, 82, "Creating the desktop icon and the Start-menu entry");
    Shortcut(Path.Combine(Desktop, Name + ".lnk"), Path.Combine(dir, "AlmiVisibility.exe"), dir);
    Shortcut(StartMenu, Path.Combine(dir, "AlmiVisibility.exe"), dir);
    Step(dir, progress, 90, "Registering the uninstaller");
    using (var k = Registry.CurrentUser.CreateSubKey(UninstallKey)) {
      k.SetValue("DisplayName", Name); k.SetValue("DisplayVersion", Version); k.SetValue("Publisher", "AlmiWorld");
      k.SetValue("InstallLocation", dir); k.SetValue("DisplayIcon", Path.Combine(dir, "AlmiVisibility.exe"));
      k.SetValue("UninstallString", "\"" + Path.Combine(dir, "Uninstall.exe") + "\" /uninstall");
      k.SetValue("QuietUninstallString", "\"" + Path.Combine(dir, "Uninstall.exe") + "\" /uninstall /S");
      k.SetValue("NoModify", 1, RegistryValueKind.DWord); k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
    }
    }
    Log(dir, "INSTALLED " + Version + " to " + dir + (wasRunning ? " (AlmiVisibility was running: closed, updated)" : ""));
    Step(dir, progress, 100, "Done");
    return wasRunning;
  }

  /* ── TAKE OVER: AlmiVisibility's OWN processes are those whose program file is inside the install folder ── */
  public static List<Process> Ours(string dir, int skip) {
    var root = Path.GetFullPath(dir).TrimEnd('\\') + "\\";
    var me = Process.GetCurrentProcess().Id;
    var list = new List<Process>();
    /* one WMI query for every process's program file (fast); a process whose file this user may not read is not ours */
    try {
      using (var q = new ManagementObjectSearcher("SELECT ProcessId, ExecutablePath FROM Win32_Process"))
        foreach (ManagementObject o in q.Get()) {
          var f = o["ExecutablePath"] as string; var id = Convert.ToInt32(o["ProcessId"]);
          if (f == null || id == me || id == skip || !f.StartsWith(root, StringComparison.OrdinalIgnoreCase)) continue;
          try { list.Add(Process.GetProcessById(id)); } catch { /* it has just exited */ }
        }
      return list;
    } catch { list.Clear(); }
    foreach (var p in Process.GetProcesses()) {
      if (p.Id == me || p.Id == skip) continue;
      try { var f = p.MainModule.FileName; if (f.StartsWith(root, StringComparison.OrdinalIgnoreCase)) list.Add(p); } catch { }
    }
    return list;
  }
  static string Describe(List<Process> ps) { return string.Join(", ", ps.Select(p => { try { return p.ProcessName + ".exe (process " + p.Id + ")"; } catch { return "process " + p.Id; } })); }
  /* waits on THESE processes, with one deadline for all of them (never a re-scan of the whole computer in a loop) */
  static bool WaitGone(List<Process> ps, int seconds) {
    var until = DateTime.UtcNow.AddSeconds(seconds);
    foreach (var p in ps) { try { var ms = (int)Math.Max(0, (until - DateTime.UtcNow).TotalMilliseconds); if (!p.WaitForExit(ms)) return false; } catch { /* already gone */ } }
    return true;
  }

  public static bool TakeOver(string dir, Action<int, string> progress, int skip) {
    Step(dir, progress, 5, "Checking whether AlmiVisibility is running");
    var ours = Ours(dir, skip);
    if (ours.Count == 0) { Step(dir, progress, 20, "AlmiVisibility is not running"); return false; }
    Step(dir, progress, 8, "AlmiVisibility is running — asking it to close: " + Describe(ours));
    AskToQuit(dir);
    foreach (var p in ours) { try { if (p.MainWindowHandle != IntPtr.Zero) p.CloseMainWindow(); } catch { } }
    CloseOwnWindow(dir);
    if (WaitGone(ours, 10) && Ours(dir, skip).Count == 0) { Step(dir, progress, 20, "AlmiVisibility closed by itself"); return true; }
    var left = Ours(dir, skip);
    Step(dir, progress, 14, "AlmiVisibility did not close within 10 seconds — stopping its own processes only: " + Describe(left));
    foreach (var p in left) { try { p.Kill(); } catch (Exception e) { Log(dir, "could not stop process " + p.Id + ": " + e.Message); } }
    if (WaitGone(left, 10) && Ours(dir, skip).Count == 0) { Step(dir, progress, 20, "AlmiVisibility's processes stopped"); return true; }
    throw new Blocked("AlmiVisibility is still running and would not close (" + Describe(Ours(dir, skip)) + ").\n\nWhat to do: restart the computer, then run this Setup again.\n\nNothing was changed. Your data is safe in " + DataDir + ".");
  }

  /* graceful first: the running app's own quit (its port is in run.json); a missing or old app simply does not answer */
  static void AskToQuit(string dir) {
    try {
      var run = Path.Combine(DataDir, "run.json");
      if (!File.Exists(run)) { Log(dir, "no run.json — the app's own quit cannot be asked"); return; }
      var port = PortIn(run); // RR-323 E: read shared — the running app may be rewriting it
      if (port == "") return;
      var rq = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/quit");
      rq.Method = "POST"; rq.ContentLength = 0; rq.Timeout = 3000; rq.Proxy = null;
      using (rq.GetResponse()) { }
      Log(dir, "asked the app on port " + port + " to quit");
    } catch (Exception e) { Log(dir, "the app's own quit did not answer: " + e.Message); }
  }

  /* the app's own window is Edge in app mode with AlmiVisibility's own window profile; it is asked to close (never stopped) */
  static void CloseOwnWindow(string dir) {
    try {
      var profile = Path.Combine(DataDir, "window");
      using (var q = new ManagementObjectSearcher("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'msedge.exe'"))
        foreach (ManagementObject o in q.Get()) {
          var cmd = (o["CommandLine"] as string) ?? "";
          if (cmd.IndexOf(profile, StringComparison.OrdinalIgnoreCase) < 0) continue;
          try { var p = Process.GetProcessById(Convert.ToInt32(o["ProcessId"])); if (p.MainWindowHandle != IntPtr.Zero && p.CloseMainWindow()) Log(dir, "asked AlmiVisibility's window to close (process " + p.Id + ")"); } catch { }
        }
    } catch (Exception e) { Log(dir, "the app's window could not be asked to close: " + e.Message); }
  }

  /* ── unpack, check, swap: never delete the working version first ── */
  static void Unpack(string dir, ZipArchive z, string fresh, Action<int, string> progress) {
    var root = Path.GetFullPath(fresh).TrimEnd('\\') + "\\";
    int n = z.Entries.Count, i = 0;
    foreach (var e in z.Entries) {
      i++;
      var target = Path.GetFullPath(Path.Combine(fresh, e.FullName));
      if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new Exception("a file in the package points outside the program folder: " + e.FullName);
      if (e.FullName.EndsWith("/") || e.FullName.EndsWith("\\")) { Directory.CreateDirectory(target); continue; }
      Directory.CreateDirectory(Path.GetDirectoryName(target));
      try { e.ExtractToFile(target, true); }
      catch (Exception x) {
        if (!(x is IOException || x is UnauthorizedAccessException)) throw;
        Log(dir, "could not write " + target + ": " + x.Message);
        throw new Blocked("Windows would not let Setup write this program file:\n" + target + "\n\n" + Advice());
      }
      if (i % 25 == 0 || i == n) Step(dir, progress, 22 + 38 * i / Math.Max(1, n), "Unpacking the new program files (" + i + " of " + n + ")");
    }
  }
  static void CheckUnpacked(string fresh) {
    var missing = new[] { @"runtime\node.exe", @"desktop\main.mjs", "version.txt" }.Where(f => !File.Exists(Path.Combine(fresh, f))).ToArray();
    if (missing.Length > 0) throw new Blocked("Some program files disappeared right after Setup wrote them (" + string.Join(", ", missing) + "). That is usually an antivirus moving them to its quarantine.\n\n" + Advice());
  }
  static string Advice() {
    return "Another program is using or checking this file. Most often that is an antivirus (for example Avast) checking the new program files, or AlmiVisibility itself.\n\nWhat to do:\n1. Wait one minute, then click Try again.\n2. If it stops again, restart the computer and run this Setup again.\n3. If your antivirus says it blocked or moved an AlmiVisibility file, open the antivirus, find AlmiVisibility in its quarantine, restore it and allow it. Do not turn your antivirus off.\n\nYour data is safe in " + DataDir + ".";
  }
  static string FindLocked(string folder) {
    if (!Directory.Exists(folder)) return null;
    foreach (var f in Directory.EnumerateFiles(folder, "*", SearchOption.AllDirectories)) { try { using (File.Open(f, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) { } } catch { return f; } }
    return null;
  }
  static void RemoveFolder(string dir, string folder) {
    if (!Directory.Exists(folder)) return;
    try { Directory.Delete(folder, true); }
    catch (Exception e) { var aside = folder + "-" + DateTime.UtcNow.Ticks; Log(dir, "could not remove " + folder + " (" + e.Message + ") — moved aside to " + aside); Directory.Move(folder, aside); }
  }
  static void MoveWithRetry(string dir, string from, string to, int seconds) {
    var until = DateTime.UtcNow.AddSeconds(seconds);
    for (int tries = 1; ; tries++) {
      try { Directory.Move(from, to); return; }
      catch (Exception e) {
        if (DateTime.UtcNow > until) { var locked = FindLocked(from); Log(dir, "could not move " + from + " after " + tries + " tries: " + e.Message + (locked == null ? "" : " · locked: " + locked)); throw new Blocked("Windows would not let Setup replace the old version" + (locked == null ? "." : ". This file is in use:\n" + locked) + "\n\n" + Advice()); }
        if (tries == 1) Log(dir, "the old version is still in use (" + e.Message + ") — trying again for up to " + seconds + " seconds");
        Thread.Sleep(500);
      }
    }
  }
  static void Swap(string dir, string fresh) {
    var app = Path.Combine(dir, "app"); var old = Path.Combine(dir, "app.old");
    RemoveFolder(dir, old);
    if (Directory.Exists(app)) MoveWithRetry(dir, app, old, 30);
    try { Directory.Move(fresh, app); }
    catch (Exception e) { Log(dir, "could not put the new version in place: " + e.Message + " — the old version is put back"); if (Directory.Exists(old) && !Directory.Exists(app)) Directory.Move(old, app); throw new Blocked("Windows would not let Setup put the new version in place. The old version was put back.\n\n" + Advice()); }
    try { if (Directory.Exists(old)) Directory.Delete(old, true); } catch (Exception e) { Log(dir, "the old copy stays in " + old + " and is removed by the next update: " + e.Message); }
  }
  static void CopyWithRetry(string dir, string from, string to) {
    if (string.Equals(Path.GetFullPath(from), Path.GetFullPath(to), StringComparison.OrdinalIgnoreCase)) return;
    var until = DateTime.UtcNow.AddSeconds(15);
    while (true) {
      try { File.Copy(from, to, true); return; }
      catch (Exception e) { if (DateTime.UtcNow > until) { Log(dir, "could not copy to " + to + ": " + e.Message); throw new Blocked("Windows would not let Setup replace this file:\n" + to + "\n\n" + Advice()); } Thread.Sleep(500); }
    }
  }

  static void Shortcut(string lnk, string target, string workDir) {
    var t = Type.GetTypeFromProgID("WScript.Shell");
    dynamic sh = Activator.CreateInstance(t);
    dynamic s = sh.CreateShortcut(lnk);
    s.TargetPath = target; s.WorkingDirectory = workDir; s.IconLocation = target + ",0"; s.Description = "AlmiVisibility";
    s.Save();
  }

  /* ── uninstall: program files, shortcuts and the Programs-list entry; the client's data only when they choose ── */
  static int Uninstall(bool removeData) {
    string dir;
    using (var k = Registry.CurrentUser.OpenSubKey(UninstallKey)) dir = k == null ? InstalledDir : (string)k.GetValue("InstallLocation");
    /* RR-305: a running copy is closed first, the same way Setup does it */
    TakeOver(dir, null, -1);
    foreach (var lnk in new[] { Path.Combine(Desktop, Name + ".lnk"), StartMenu }) if (File.Exists(lnk)) File.Delete(lnk);
    Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false);
    if (removeData && Directory.Exists(DataDir)) Directory.Delete(DataDir, true);
    foreach (var d in new[] { "app", "app.new", "app.old" }) { var x = Path.Combine(dir, d); if (Directory.Exists(x)) Directory.Delete(x, true); }
    var launcher = Path.Combine(dir, "AlmiVisibility.exe");
    if (File.Exists(launcher)) File.Delete(launcher);
    var tmp = Path.GetTempPath();
    try { File.AppendAllText(Path.Combine(tmp, "install.log"), DateTime.UtcNow.ToString("s") + "Z UNINSTALLED from " + dir + (removeData ? " (data removed)" : " (data kept at " + DataDir + ")") + Environment.NewLine); } catch { }
    /* the running Uninstall.exe and its folder are removed by a short-lived helper once this process has exited */
    /* the program folder holds only program files (the client's data lives apart), so all of it goes */
    var cmd = "/c ping 127.0.0.1 -n 3 > nul & rmdir /s /q \"" + dir + "\"";
    Process.Start(new ProcessStartInfo("cmd.exe", cmd) { CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden });
    return 0;
  }

  static int UninstallWizard() {
    Application.EnableVisualStyles();
    var f = new Form { Text = "Uninstall AlmiVisibility", Width = 480, Height = 230, FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, StartPosition = FormStartPosition.CenterScreen };
    var l = new Label { Text = "AlmiVisibility will be removed from this computer.\nYour own data (settings, reports, pages) is kept unless you tick the box.", Left = 20, Top = 20, Width = 430, Height = 50 };
    var c = new CheckBox { Text = "Also remove my data", Left = 20, Top = 80, Width = 300 };
    var ok = new Button { Text = "Remove", Left = 270, Top = 130, Width = 85 }; var no = new Button { Text = "Cancel", Left = 365, Top = 130, Width = 85 };
    int rc = 1;
    ok.Click += (s, e) => { rc = Uninstall(c.Checked); MessageBox.Show("AlmiVisibility was removed." + (c.Checked ? "" : " Your data was kept."), "AlmiVisibility"); f.Close(); };
    no.Click += (s, e) => f.Close();
    f.Controls.AddRange(new Control[] { l, c, ok, no });
    Application.Run(f);
    return rc;
  }

  /* ── launch: the local app (a server on 127.0.0.1 only) and its own window. RR-305: an app already running is reused — the launcher
   *    no longer starts a second server each time (two were found running on the owner's PC). ── */
  /* RR-323 E (the real cause of rr305 failing on the owner's PC): the launcher read run.json in the instant the app was still writing it —
   * File.ReadAllText asks that no one else is writing, so Windows refused ("being used by another process"); the launcher fell to its error
   * box and never opened the window, though the app had started. Read it SHARED, and only a run.json that holds a port counts. */
  static string ReadShared(string path) { using (var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete)) using (var r = new StreamReader(fs)) return r.ReadToEnd(); }
  static string PortIn(string runFile) { try { return File.Exists(runFile) ? System.Text.RegularExpressions.Regex.Match(ReadShared(runFile), "\"port\"\\s*:\\s*(\\d+)").Groups[1].Value : ""; } catch (IOException) { return ""; } catch (UnauthorizedAccessException) { return ""; } }
  static string RunningPort(string node) {
    try {
      var run = ReadShared(Path.Combine(DataDir, "run.json"));
      var port = System.Text.RegularExpressions.Regex.Match(run, "\"port\"\\s*:\\s*(\\d+)").Groups[1].Value;
      var pid = System.Text.RegularExpressions.Regex.Match(run, "\"pid\"\\s*:\\s*(\\d+)").Groups[1].Value;
      if (port == "" || pid == "") return null;
      var p = Process.GetProcessById(int.Parse(pid));
      return string.Equals(p.MainModule.FileName, Path.GetFullPath(node), StringComparison.OrdinalIgnoreCase) ? port : null;
    } catch { return null; }
  }
  static int Launch(bool window) {
    var dir = InstalledDir;
    var node = Path.Combine(dir, "app", "runtime", "node.exe");
    var main = Path.Combine(dir, "app", "desktop", "main.mjs");
    Directory.CreateDirectory(DataDir);
    var port = RunningPort(node);
    if (port == null) {
      if (!File.Exists(node) || !File.Exists(main)) throw new Blocked("AlmiVisibility's program files are incomplete (" + (File.Exists(node) ? main : node) + " is missing).\n\nWhat to do: run the latest AlmiVisibility Setup again — it repairs the program and keeps your data.");
      var runFile = Path.Combine(DataDir, "run.json");
      if (File.Exists(runFile)) File.Delete(runFile);
      var p = new ProcessStartInfo(node, "\"" + main + "\" --data=\"" + DataDir + "\" --install=\"" + dir + "\"") { CreateNoWindow = true, UseShellExecute = false, WorkingDirectory = Path.Combine(dir, "app") };
      Process.Start(p);
      port = "";
      for (int i = 0; i < 150 && (port = PortIn(runFile)) == ""; i++) Thread.Sleep(100);
      if (port == "") throw new Blocked("AlmiVisibility did not start within 15 seconds.\n\nWhat to do: wait a minute and open it again. If it still does not start, restart the computer. If your antivirus says it blocked AlmiVisibility, restore it from the antivirus's quarantine and allow it.");
      Log(dir, "LAUNCHED the app on port " + port);
    }
    if (!window) return 0;
    /* its OWN window: Edge in app mode with a separate window profile under the app's data — never the user's own browser profile */
    var edge = new[] { @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", @"C:\Program Files\Microsoft\Edge\Application\msedge.exe" }.FirstOrDefault(File.Exists);
    var url = "http://127.0.0.1:" + port + "/";
    if (edge != null) Process.Start(edge, "--app=" + url + " --user-data-dir=\"" + Path.Combine(DataDir, "window") + "\" --no-first-run --window-size=1200,820");
    else Process.Start(url);
    return 0;
  }

  /* ── apply an update: the package was downloaded and verified (sha256 and signature) by the app. RR-305: the SAME takeover and swap as
   *    Setup — the app that asked is closed (or stopped, its own processes only), the new files are unpacked beside the old ones and
   *    swapped in; the data folder is never touched; on any failure the old version stays and is opened again. ── */
  static int ApplyUpdate(string[] args) {
    var i = Array.FindIndex(args, a => string.Equals(a, "/apply-update", StringComparison.OrdinalIgnoreCase));
    var zip = args[i + 1];
    var dir = InstalledDir;
    Directory.SetCurrentDirectory(dir); // never stand inside the folder being swapped
    try {
      Step(dir, null, 0, "Update: starting from " + zip);
      TakeOver(dir, null, -1);
      var fresh = Path.Combine(dir, "app.new");
      RemoveFolder(dir, fresh);
      using (var z = ZipFile.OpenRead(zip)) Unpack(dir, z, fresh, null);
      CheckUnpacked(fresh);
      var ver = File.ReadAllText(Path.Combine(fresh, "version.txt")).Trim();
      Swap(dir, fresh);
      if (!noSystem) using (var k = Registry.CurrentUser.CreateSubKey(UninstallKey)) k.SetValue("DisplayVersion", ver);
      Log(dir, "UPDATED to " + ver + " from " + zip);
    } catch (Exception e) {
      Log(dir, "UPDATE FAILED — " + e.Message.Replace("\n", " ") + " — the old version is kept");
      if (!Has(args, "/S")) MessageBox.Show("The update could not be installed. AlmiVisibility keeps the version you had.\n\n" + e.Message + "\n\nThe install log is here:\n" + LogPath(dir), Name, MessageBoxButtons.OK, MessageBoxIcon.Warning);
      if (!Has(args, "/S")) { try { Launch(true); } catch { } }
      return e is Blocked ? 3 : 1;
    }
    if (!Has(args, "/S")) Launch(true);
    return 0;
  }
}

/* ── the install wizard: Welcome → Install (on a worker thread: the window always answers) → Finish, or a plain-English problem with Try again ── */
class Wizard : Form {
  readonly string dir = Program.DefaultDir;
  readonly Label title = new Label { Left = 24, Top = 110, Width = 540, Height = 32, Font = new Font("Segoe UI", 14, FontStyle.Bold) };
  readonly Label text = new Label { Left = 24, Top = 148, Width = 540, Height = 220, Font = new Font("Segoe UI", 10) };
  readonly ProgressBar bar = new ProgressBar { Left = 24, Top = 372, Width = 540, Height = 18, Visible = false };
  readonly CheckBox open = new CheckBox { Left = 24, Top = 372, Width = 300, Text = "Open AlmiVisibility now", Checked = true, Visible = false };
  readonly LinkLabel logLink = new LinkLabel { Left = 24, Top = 398, Width = 340, Height = 20, Text = "Open the install log", Visible = false };
  readonly Button next = new Button { Left = 386, Top = 430, Width = 85, Text = "Next >" };
  readonly Button cancel = new Button { Left = 478, Top = 430, Width = 85, Text = "Cancel" };
  readonly System.Windows.Forms.Timer watch = new System.Windows.Forms.Timer { Interval = 1000 };
  int step = 0;
  DateTime started, lastStep;
  string lastText = "";
  public Wizard() {
    Text = "AlmiVisibility Setup " + Program.Version; Width = 600; Height = 520; FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false; StartPosition = FormStartPosition.CenterScreen;
    BackColor = Color.FromArgb(0xFF, 0xFB, 0xF5); // AlmiWorld's cream (the sunrise palette, RR-299)
    /* RR-299: the maker's logo (AlmiWorld, "live beautifully") — the owner's own image, embedded in this Setup.exe */
    var logoStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("almiworld-logo.png");
    if (logoStream != null) { var logo = new PictureBox { Image = Image.FromStream(logoStream), SizeMode = PictureBoxSizeMode.Zoom, Left = 24, Top = 10, Width = 230, Height = 90, BackColor = Color.White }; Controls.Add(logo); }
    foreach (Button b in new[] { next, cancel }) { b.BackColor = Color.FromArgb(0xFF, 0x7A, 0x6B); b.ForeColor = Color.FromArgb(0x1A, 0x1A, 0x2E); b.FlatStyle = FlatStyle.Flat; }
    Controls.AddRange(new Control[] { title, text, bar, open, logLink, next, cancel });
    cancel.Click += (s, e) => Close();
    next.Click += (s, e) => Advance();
    logLink.LinkClicked += (s, e) => { try { Process.Start("notepad.exe", "\"" + Program.LogPath(dir) + "\""); } catch { } };
    watch.Tick += (s, e) => Tick();
    Show0();
  }
  void Show0() {
    title.Text = "Welcome to AlmiVisibility";
    var running = Program.Ours(dir, -1).Count > 0;
    text.Text = "This will install AlmiVisibility " + Program.Version + " on this computer, for you only.\n\n" + (running ? "AlmiVisibility is open now. Setup will close it, update it and open it again.\n\n" : "") + "It adds a desktop icon and a Start-menu entry. Your data stays on this computer and is kept when you update.\n\nClick Next to continue.";
  }
  void Advance() {
    if (step == 0) { step = 1; title.Text = "Ready to install"; text.Text = "AlmiVisibility will be installed in:\n" + dir + "\n\nYour data is kept in:\n" + Program.DataDir + "\n\nClick Install."; next.Text = "Install"; return; }
    if (step == 1 || step == 3) { StartInstall(); return; }
    if (step == 2) return;
    if (open.Visible && open.Checked) { try { Process.Start(Path.Combine(dir, "AlmiVisibility.exe")); } catch { } }
    Close();
  }
  void StartInstall() {
    step = 2; next.Enabled = false; cancel.Enabled = false; bar.Visible = true; bar.Value = 0; logLink.Visible = false; open.Visible = false;
    title.Text = "Installing"; text.Text = "Starting...";
    started = lastStep = DateTime.UtcNow; watch.Start();
    var t = new Thread(() => {
      try { var was = Program.Install(dir, (p, s) => BeginInvoke((Action)(() => Progress(p, s)))); BeginInvoke((Action)(() => Done(was))); }
      catch (Exception e) { BeginInvoke((Action)(() => Failed(e))); }
    }) { IsBackground = true };
    t.Start();
  }
  void Progress(int p, string s) { if (step != 2) return; bar.Value = Math.Max(0, Math.Min(100, p)); text.Text = s + "..."; lastText = s; lastStep = DateTime.UtcNow; }
  void Tick() {
    if (step != 2) { watch.Stop(); return; }
    if (DateTime.UtcNow - started > TimeSpan.FromMinutes(10)) { Program.Log(dir, "TIMEOUT after 10 minutes at: " + lastText); Failed(new Program.Blocked("Setup did not finish within 10 minutes. It stopped at: " + lastText + ".\n\nWhat to do: restart the computer and run this Setup again. If your antivirus asks about AlmiVisibility, allow it. Do not turn your antivirus off.\n\nYour data is safe in " + Program.DataDir + ".")); return; }
    var quiet = (int)(DateTime.UtcNow - lastStep).TotalSeconds;
    if (quiet >= 30) text.Text = lastText + "...\n\nThis step is taking longer than usual (" + quiet + " seconds). An antivirus may be checking the new files. Setup is still working — please wait.";
  }
  void Done(bool wasRunning) {
    if (step != 2) return;
    watch.Stop(); step = 4; bar.Visible = false; logLink.Visible = false;
    if (wasRunning) {
      try { Process.Start(Path.Combine(dir, "AlmiVisibility.exe")); } catch (Exception e) { Program.Log(dir, "could not reopen the app: " + e.Message); }
      title.Text = "AlmiVisibility is updated"; text.Text = "AlmiVisibility " + Program.Version + " is installed and was opened again.\n\nYour data was kept: company, products, licence, settings and YouTube settings.";
    } else {
      open.Visible = true;
      title.Text = "AlmiVisibility is installed"; text.Text = "Setup has finished. Your data was kept.\n\nUse the desktop icon or the Start menu to open AlmiVisibility.";
    }
    next.Text = "Finish"; next.Enabled = true; cancel.Visible = false;
  }
  void Failed(Exception e) {
    if (step != 2) return;
    watch.Stop(); step = 3; bar.Visible = false;
    Program.Log(dir, "FAILED — " + e.Message.Replace("\n", " ") + (e is Program.Blocked ? "" : " · " + e.GetType().Name));
    title.Text = "Setup could not finish";
    text.Text = (e is Program.Blocked ? e.Message : "Something went wrong: " + e.Message + "\n\nWhat to do: click Try again. If it happens again, restart the computer and run this Setup again. Your data is safe in " + Program.DataDir + ".");
    logLink.Visible = true; logLink.Text = "Open the install log (" + Program.LogPath(dir) + ")";
    next.Text = "Try again"; next.Enabled = true; cancel.Enabled = true; cancel.Text = "Close";
  }
}
