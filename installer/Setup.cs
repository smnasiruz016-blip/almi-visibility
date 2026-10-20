// AlmiVisibility — Setup.exe, the launcher and the uninstaller, in one program (RR-298 C). Per-user: no administrator rights needed.
//   Setup.exe                       the install wizard (Next → Install → Finish)
//   Setup.exe /S [/D=dir]           a silent install (tests and scripted installs)
//   AlmiVisibility.exe              the launcher: starts the local app and opens its own window (a separate window profile, never the user's browser profile)
//   AlmiVisibility.exe /nowindow    the launcher without a window (tests)
//   Uninstall.exe /uninstall [/S] [/REMOVEDATA]   remove the program; the client's own data is KEPT unless they choose to remove it
//   AlmiVisibility.exe /apply-update <package.zip> [/S]   install a downloaded, already verified update, keeping all data
// Unsigned until the owner decides on a code-signing certificate: Windows shows an "unknown publisher" warning.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
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
  static string Version { get { using (var s = Payload("version.txt")) return s == null ? "0.0.0" : new StreamReader(s).ReadToEnd().Trim(); } }
  static string DefaultDir { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", Name); } }
  static string DataDir { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), Name); } }
  static string Desktop { get { return Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory); } }
  static string StartMenu { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), Name + ".lnk"); } }
  static string Self { get { return Assembly.GetExecutingAssembly().Location; } }
  static string InstalledDir { get { return Path.GetDirectoryName(Self); } }

  static Stream Payload(string name) { return Assembly.GetExecutingAssembly().GetManifestResourceStream(name); }
  static bool Has(string[] a, string f) { return a.Any(x => string.Equals(x, f, StringComparison.OrdinalIgnoreCase)); }
  static string Arg(string[] a, string prefix) { var x = a.FirstOrDefault(s => s.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)); return x == null ? null : x.Substring(prefix.Length); }
  static void Log(string dir, string line) { try { Directory.CreateDirectory(dir); File.AppendAllText(Path.Combine(dir, "install.log"), DateTime.UtcNow.ToString("s") + "Z " + line + Environment.NewLine); } catch { } }

  [STAThread]
  static int Main(string[] args) {
    var exe = Path.GetFileNameWithoutExtension(Self).ToLowerInvariant();
    try {
      if (Has(args, "/apply-update")) return ApplyUpdate(args);
      if (Has(args, "/uninstall") || exe == "uninstall") return Has(args, "/S") ? Uninstall(Has(args, "/REMOVEDATA")) : UninstallWizard();
      if (exe == "almivisibility") return Launch(!Has(args, "/nowindow"));
      if (Has(args, "/S")) return Install(Arg(args, "/D=") ?? DefaultDir, null);
      Application.EnableVisualStyles();
      Application.Run(new Wizard());
      return 0;
    } catch (Exception e) {
      Log(Path.GetTempPath(), "ERROR " + string.Join(" ", args) + " — " + e.Message);
      if (!Has(args, "/S")) MessageBox.Show(e.Message, Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
      Console.Error.WriteLine("ERROR " + e.Message);
      return 1;
    }
  }

  /* ── install: the app folder from the embedded payload, the launcher, the uninstaller, the shortcuts and the Programs-list entry ── */
  public static int Install(string dir, Action<int, string> progress) {
    if (progress == null) progress = (p, s) => { };
    progress(5, "Preparing");
    Directory.CreateDirectory(dir);
    var app = Path.Combine(dir, "app");
    if (Directory.Exists(app)) Directory.Delete(app, true);
    progress(15, "Copying the program files");
    using (var z = new ZipArchive(Payload("payload.zip"), ZipArchiveMode.Read)) z.ExtractToDirectory(app);
    progress(70, "Adding the launcher and the uninstaller");
    File.Copy(Self, Path.Combine(dir, "AlmiVisibility.exe"), true);
    File.Copy(Self, Path.Combine(dir, "Uninstall.exe"), true);
    Directory.CreateDirectory(DataDir);
    progress(80, "Creating the desktop icon and the Start-menu entry");
    Shortcut(Path.Combine(Desktop, Name + ".lnk"), Path.Combine(dir, "AlmiVisibility.exe"), dir);
    Shortcut(StartMenu, Path.Combine(dir, "AlmiVisibility.exe"), dir);
    progress(90, "Registering the uninstaller");
    using (var k = Registry.CurrentUser.CreateSubKey(UninstallKey)) {
      k.SetValue("DisplayName", Name); k.SetValue("DisplayVersion", Version); k.SetValue("Publisher", "AlmiWorld");
      k.SetValue("InstallLocation", dir); k.SetValue("DisplayIcon", Path.Combine(dir, "AlmiVisibility.exe"));
      k.SetValue("UninstallString", "\"" + Path.Combine(dir, "Uninstall.exe") + "\" /uninstall");
      k.SetValue("QuietUninstallString", "\"" + Path.Combine(dir, "Uninstall.exe") + "\" /uninstall /S");
      k.SetValue("NoModify", 1, RegistryValueKind.DWord); k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
    }
    Log(dir, "INSTALLED " + Version + " to " + dir);
    progress(100, "Done");
    return 0;
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
    foreach (var lnk in new[] { Path.Combine(Desktop, Name + ".lnk"), StartMenu }) if (File.Exists(lnk)) File.Delete(lnk);
    Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false);
    if (removeData && Directory.Exists(DataDir)) Directory.Delete(DataDir, true);
    foreach (var d in new[] { "app", "app.new", "app.old" }) { var x = Path.Combine(dir, d); if (Directory.Exists(x)) Directory.Delete(x, true); }
    var launcher = Path.Combine(dir, "AlmiVisibility.exe");
    if (File.Exists(launcher)) File.Delete(launcher);
    Log(Path.GetTempPath(), "UNINSTALLED from " + dir + (removeData ? " (data removed)" : " (data kept at " + DataDir + ")"));
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

  /* ── launch: the local app (a server on 127.0.0.1 only) and its own window ── */
  static int Launch(bool window) {
    var dir = InstalledDir;
    var node = Path.Combine(dir, "app", "runtime", "node.exe");
    var main = Path.Combine(dir, "app", "desktop", "main.mjs");
    Directory.CreateDirectory(DataDir);
    var runFile = Path.Combine(DataDir, "run.json");
    if (File.Exists(runFile)) File.Delete(runFile);
    var p = new ProcessStartInfo(node, "\"" + main + "\" --data=\"" + DataDir + "\" --install=\"" + dir + "\"") { CreateNoWindow = true, UseShellExecute = false, WorkingDirectory = Path.Combine(dir, "app") };
    Process.Start(p);
    for (int i = 0; i < 100 && !File.Exists(runFile); i++) Thread.Sleep(100);
    if (!File.Exists(runFile)) throw new Exception("the app did not start");
    var run = File.ReadAllText(runFile);
    var port = System.Text.RegularExpressions.Regex.Match(run, "\"port\"\\s*:\\s*(\\d+)").Groups[1].Value;
    if (!window) return 0;
    /* its OWN window: Edge in app mode with a separate window profile under the app's data — never the user's own browser profile */
    var edge = new[] { @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", @"C:\Program Files\Microsoft\Edge\Application\msedge.exe" }.FirstOrDefault(File.Exists);
    var url = "http://127.0.0.1:" + port + "/";
    if (edge != null) Process.Start(edge, "--app=" + url + " --user-data-dir=\"" + Path.Combine(DataDir, "window") + "\" --no-first-run --window-size=1200,820");
    else Process.Start(url);
    return 0;
  }

  /* ── apply an update: the package was downloaded and verified (sha256 and signature) by the app; this swaps the program folder,
   *    keeps the data folder untouched, records the new version, and keeps the old folder until the swap has succeeded ── */
  static int ApplyUpdate(string[] args) {
    var i = Array.FindIndex(args, a => string.Equals(a, "/apply-update", StringComparison.OrdinalIgnoreCase));
    var zip = args[i + 1];
    var dir = InstalledDir;
    Directory.SetCurrentDirectory(dir); // never stand inside the folder being swapped
    Thread.Sleep(1500); // the app that asked for the update exits first
    var app = Path.Combine(dir, "app"); var fresh = Path.Combine(dir, "app.new"); var old = Path.Combine(dir, "app.old");
    if (Directory.Exists(fresh)) Directory.Delete(fresh, true);
    ZipFile.ExtractToDirectory(zip, fresh);
    var ver = File.ReadAllText(Path.Combine(fresh, "version.txt")).Trim();
    if (Directory.Exists(old)) Directory.Delete(old, true);
    /* the old app may take a moment to let go of its files: retry for up to 15 seconds */
    for (int tries = 0; ; tries++) { try { Directory.Move(app, old); break; } catch { if (tries >= 30) throw; Thread.Sleep(500); } }
    try { Directory.Move(fresh, app); } catch { Directory.Move(old, app); throw; }
    Directory.Delete(old, true);
    using (var k = Registry.CurrentUser.CreateSubKey(UninstallKey)) k.SetValue("DisplayVersion", ver);
    Log(dir, "UPDATED to " + ver + " from " + zip);
    if (!Has(args, "/S")) Launch(true);
    return 0;
  }
}

/* ── the install wizard: Welcome → Install → Finish ── */
class Wizard : Form {
  readonly Label title = new Label { Left = 24, Top = 20, Width = 520, Height = 30, Font = new Font("Segoe UI", 14, FontStyle.Bold) };
  readonly Label text = new Label { Left = 24, Top = 60, Width = 520, Height = 120, Font = new Font("Segoe UI", 10) };
  readonly ProgressBar bar = new ProgressBar { Left = 24, Top = 190, Width = 520, Height = 18, Visible = false };
  readonly CheckBox open = new CheckBox { Left = 24, Top = 190, Width = 300, Text = "Open AlmiVisibility now", Checked = true, Visible = false };
  readonly Button next = new Button { Left = 368, Top = 250, Width = 85, Text = "Next >" };
  readonly Button cancel = new Button { Left = 460, Top = 250, Width = 85, Text = "Cancel" };
  int step = 0;
  public Wizard() {
    Text = "AlmiVisibility Setup"; Width = 590; Height = 330; FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false; StartPosition = FormStartPosition.CenterScreen;
    Controls.AddRange(new Control[] { title, text, bar, open, next, cancel });
    cancel.Click += (s, e) => Close();
    next.Click += (s, e) => Advance();
    Show0();
  }
  void Show0() { title.Text = "Welcome to AlmiVisibility"; text.Text = "This will install AlmiVisibility on this computer, for you only.\n\nIt adds a desktop icon and a Start-menu entry. Your data stays on this computer.\n\nClick Next to continue."; }
  void Advance() {
    if (step == 0) { step = 1; title.Text = "Ready to install"; text.Text = "AlmiVisibility will be installed in:\n" + Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "AlmiVisibility") + "\n\nClick Install."; next.Text = "Install"; return; }
    if (step == 1) {
      step = 2; next.Enabled = false; cancel.Enabled = false; bar.Visible = true;
      Program.Install(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "AlmiVisibility"), (p, s) => { bar.Value = p; text.Text = s + "..."; Application.DoEvents(); });
      bar.Visible = false; open.Visible = true; title.Text = "AlmiVisibility is installed"; text.Text = "Setup has finished. Use the desktop icon or the Start menu to open AlmiVisibility."; next.Text = "Finish"; next.Enabled = true; return;
    }
    if (open.Checked) Process.Start(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "AlmiVisibility", "AlmiVisibility.exe"));
    Close();
  }
}
