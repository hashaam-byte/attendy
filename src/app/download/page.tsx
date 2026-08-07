import { Smartphone, Download, AlertCircle, Apple, ShieldCheck } from "lucide-react";

export const revalidate = 3600; // re-check GitHub for a new release once an hour

const REPO_URL = process.env.NEXT_PUBLIC_GITHUB_RELEASE_REPO;
const REPO = REPO_URL ? parseGithubRepoPath(REPO_URL) : null;
const REPO_LINK = REPO_URL ?? (REPO ? `https://github.com/${REPO}` : null);
const REPO_LABEL = REPO ? `github.com/${REPO}` : REPO_URL ?? "GitHub";
const FALLBACK_ANDROID_APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL;

function parseGithubRepoPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (!/^github\.com$/i.test(url.hostname)) return null;
    const path = url.pathname.replace(/^\/|\/$/g, "");
    const [owner, repo] = path.split("/");
    return owner && repo ? `${owner}/${repo}` : null;
  } catch {
    const path = value.replace(/^\/|\/$/g, "");
    const parts = path.split("/");
    return parts.length === 2 ? path : null;
  }
}

interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  download_count: number;
}
interface Release {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string;
  assets: ReleaseAsset[];
}

async function getLatestRelease(): Promise<Release | null> {
  if (!REPO) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const apkAsset = release?.assets.find((a) => a.name.toLowerCase().endsWith(".apk"));
  const androidDownloadUrl = apkAsset?.browser_download_url ?? FALLBACK_ANDROID_APK_URL;

  return (
    <main className="min-h-screen pt-28 pb-20 px-6" style={{ background: "var(--background)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "var(--brand-primary)" }}>
            <Smartphone size={30} color="white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
            Download Attendy
          </h1>
          <p className="text-base" style={{ color: "var(--foreground-muted)" }}>
            The mobile app for staff scanning and parent attendance tracking.
          </p>
        </div>

        {/* Android */}
        <div className="rounded-2xl border p-6 sm:p-8 mb-5" style={{ borderColor: "var(--border)", background: "var(--background-card)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-primary)15" }}>
              <Smartphone size={18} style={{ color: "var(--brand-primary)" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Android</h2>
              {release && (
                <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                  Version {release.tag_name} · Released {formatDate(release.published_at)}
                </p>
              )}
            </div>
          </div>

          {androidDownloadUrl ? (
            <>
              <a
                href={androidDownloadUrl}
                className="btn-primary w-full justify-center text-base py-3.5 flex items-center gap-2"
              >
                <Download size={18} />
                {apkAsset ? `Download for Android (${formatSize(apkAsset.size)})` : "Download Android APK"}
              </a>

              <div className="flex items-start gap-2 mt-4 text-xs" style={{ color: "var(--foreground-muted)" }}>
                <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                <p>
                  {apkAsset ? (
                    <>Downloaded directly from our GitHub repository — the same source code you can inspect at{" "}
                      <a href={REPO_LINK ?? `https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer" className="underline">
                        {REPO_LABEL}
                      </a>. Not from a third-party file host.</>
                  ) : (
                    <>Download link configured from environment settings. If you want GitHub release downloads instead, set <code>NEXT_PUBLIC_GITHUB_RELEASE_REPO</code> and publish a .apk asset there.</>
                  )}
                </p>
              </div>

              {release?.body && (
                <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>What&apos;s new</p>
                  <div className="text-xs space-y-1" style={{ color: "var(--foreground-muted)" }}>
                    {release.body.split("\n").filter(Boolean).map((line, i) => (
                      <p key={i}>{line.replace(/^[-*]\s*/, "• ")}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
              style={{ background: "var(--brand-primary)10", color: "var(--foreground-muted)" }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>No Android build has been published yet. Check back shortly, or <a href="/contact" className="underline">contact us</a> for a direct link.</p>
            </div>
          )}
        </div>

        {/* iOS */}
        <div className="rounded-2xl border p-6 sm:p-8 mb-8" style={{ borderColor: "var(--border)", background: "var(--background-card)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--foreground-muted)15" }}>
              <Apple size={18} style={{ color: "var(--foreground-muted)" }} />
            </div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>iOS</h2>
          </div>
          <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
            Not available yet. Want to be notified when it launches?{" "}
            <a href="/contact" className="underline">Let us know</a> and we&apos;ll reach out.
          </p>
        </div>

        {/* Install instructions */}
        <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--background-card)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            How to install on Android
          </h3>
          <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: "var(--foreground-muted)" }}>
            <li>Tap the download button above and wait for it to finish.</li>
            <li>Open the downloaded file. Android will warn that it&apos;s from outside the Play Store — this is expected for a new app; tap <strong>Settings</strong> in that prompt and allow installs from your browser.</li>
            <li>Go back and tap the file again, then tap <strong>Install</strong>.</li>
            <li>Open the app and log in with your school ID (staff) or your phone number and child&apos;s name (parents).</li>
          </ol>
        </div>
      </div>
    </main>
  );
}