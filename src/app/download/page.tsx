import { Download, AlertCircle, ShieldCheck, ArrowLeft, GraduationCap, Sparkles } from "lucide-react";

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

// ── Android "bugdroid" mark — hand-drawn, on-brand green ──────────────────
function AndroidMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <line x1="40" y1="30" x2="32" y2="15" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="80" y1="30" x2="88" y2="15" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="32" cy="13" r="3.4" fill="currentColor" />
      <circle cx="88" cy="13" r="3.4" fill="currentColor" />
      <rect x="12" y="55" width="14" height="36" rx="7" fill="currentColor" />
      <rect x="94" y="55" width="14" height="36" rx="7" fill="currentColor" />
      <path
        d="M28 56C28 34 42 23 60 23C78 23 92 34 92 56V88C92 94.6 86.6 100 80 100H40C33.4 100 28 94.6 28 88V56Z"
        fill="currentColor"
      />
      <circle cx="46" cy="53" r="5.2" fill="#04140b" />
      <circle cx="74" cy="53" r="5.2" fill="#04140b" />
      <rect x="41" y="100" width="14" height="19" rx="7" fill="currentColor" />
      <rect x="65" y="100" width="14" height="19" rx="7" fill="currentColor" />
    </svg>
  );
}

// ── Apple mark — hand-drawn generic apple-with-bite silhouette ────────────
function AppleMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path
        d="M58 26c-1-7 3-14 10-17 1 7-3 14-10 17z"
        fill="currentColor"
      />
      <path
        d="M50 34c-16 0-27 14-27 32 0 19 12 35 21 35 5 0 7-2 11-2s6 2 11 2c8 0 18-13 20-29-8-3-13-11-13-20 0-8 5-15 12-18-5-6-12-9-19-9-4 0-8 1-11 3-2-2-5-3-8-3-1 0-3 0-4 1 2 4 5 6 9 8-1 0-2 0-2 0z"
        fill="currentColor"
      />
      <circle cx="76" cy="52" r="9" fill="#04140b" />
    </svg>
  );
}

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const apkAsset = release?.assets.find((a) => a.name.toLowerCase().endsWith(".apk"));
  const androidDownloadUrl = apkAsset?.browser_download_url ?? FALLBACK_ANDROID_APK_URL;

  return (
    <main className="dl-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=DM+Sans:wght@400;500;700&display=swap');

        .dl-root {
          min-height: 100vh;
          background: #030b05;
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow-x: hidden;
          position: relative;
        }
        .dl-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.022;
          pointer-events: none;
          z-index: 0;
        }
        .dl-glow-wrap {
          position: fixed !important;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .dl-glow-a {
          position: absolute; top: -220px; left: 50%; transform: translateX(-50%);
          width: 700px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(34,197,94,0.16), transparent 70%);
          filter: blur(40px);
        }
        .dl-glow-b {
          position: absolute; bottom: -260px; right: -160px;
          width: 560px; height: 560px; border-radius: 50%;
          background: radial-gradient(circle, rgba(74,222,128,0.10), transparent 70%);
          filter: blur(60px);
        }
        /* .dl-glow-wrap sits OUTSIDE this rule's reach on purpose — the glow
           divs are now its children, not .dl-root's, so this can no longer
           silently clobber their positioning like it did before. */
        .dl-root > * { position: relative; z-index: 1; }
        .dl-root > .dl-glow-wrap { position: fixed !important; z-index: 0; }

        @keyframes dlFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dlPing {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes dlFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes dlSpinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes dlShine {
          0%   { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }

        .dl-reveal { opacity: 0; animation: dlFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
        .dl-d0 { animation-delay: 0ms; }
        .dl-d1 { animation-delay: 90ms; }
        .dl-d2 { animation-delay: 180ms; }
        .dl-d3 { animation-delay: 270ms; }
        .dl-d4 { animation-delay: 360ms; }
        .dl-d5 { animation-delay: 450ms; }

        .dl-nav {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 760px; margin: 0 auto; padding: 24px 24px 0;
        }
        .dl-nav-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.55); text-decoration: none; font-size: 13px; font-weight: 500;
          transition: color 0.15s;
        }
        .dl-nav-back:hover { color: #fff; }
        .dl-nav-logo { display: flex; align-items: center; gap: 8px; }
        .dl-nav-icon {
          width: 26px; height: 26px; border-radius: 8px;
          background: linear-gradient(135deg,#16a34a,#22c55e);
          display: flex; align-items: center; justify-content: center;
        }
        .dl-nav-wordmark { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; }

        .dl-container { max-width: 640px; margin: 0 auto; padding: 56px 24px 96px; }

        .dl-hero { text-align: center; margin-bottom: 40px; }
        .dl-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(34,197,94,0.10); border: 1px solid rgba(34,197,94,0.28);
          border-radius: 100px; padding: 6px 14px; font-size: 12.5px; font-weight: 600;
          color: #4ade80; margin-bottom: 22px;
        }
        .dl-dot-wrap { position: relative; width: 7px; height: 7px; flex-shrink: 0; }
        .dl-dot-ping { position: absolute; inset: 0; border-radius: 50%; background: #4ade80; animation: dlPing 2s ease-in-out infinite; }
        .dl-dot-core { position: absolute; inset: 1px; border-radius: 50%; background: #22c55e; }

        .dl-h1 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 800;
          font-size: clamp(2rem, 5vw, 2.8rem);
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 14px;
          background: linear-gradient(180deg, #fff 30%, rgba(255,255,255,0.75));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .dl-sub { color: rgba(255,255,255,0.5); font-size: 15.5px; max-width: 440px; margin: 0 auto; line-height: 1.55; }

        .dl-card {
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
          backdrop-filter: blur(6px);
          padding: 28px 26px;
          margin-bottom: 18px;
          transition: border-color 0.25s ease, transform 0.25s ease, background 0.25s ease;
        }
        .dl-card-android { border-color: rgba(34,197,94,0.22); }
        .dl-card-android:hover { border-color: rgba(34,197,94,0.42); transform: translateY(-3px); background: rgba(34,197,94,0.035); }
        .dl-card-ios:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-2px); }

        .dl-card-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .dl-icon-ring {
          width: 58px; height: 58px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative; animation: dlFloat 4.5s ease-in-out infinite;
        }
        .dl-icon-ring-android { background: rgba(34,197,94,0.12); color: #4ade80; box-shadow: 0 0 0 1px rgba(34,197,94,0.2) inset; }
        .dl-icon-ring-ios { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); box-shadow: 0 0 0 1px rgba(255,255,255,0.1) inset; }

        .dl-card-title { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 17px; }
        .dl-card-meta { font-size: 12.5px; color: rgba(255,255,255,0.42); margin-top: 2px; }

        .dl-btn-download {
          position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          width: 100%; padding: 14px 20px; border-radius: 14px;
          background: linear-gradient(135deg,#16a34a,#22c55e);
          color: #04140b; font-weight: 700; font-size: 15px;
          text-decoration: none; border: none; cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 24px -8px rgba(34,197,94,0.55);
        }
        .dl-btn-download:hover { transform: translateY(-2px); box-shadow: 0 12px 30px -8px rgba(34,197,94,0.7); }
        .dl-btn-download::after {
          content: ''; position: absolute; top: 0; left: 0; width: 40%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent);
          animation: dlShine 3.2s ease-in-out infinite;
        }

        .dl-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 16px; font-size: 12.5px; color: rgba(255,255,255,0.4); line-height: 1.5; }
        .dl-note a { color: rgba(255,255,255,0.65); text-decoration: underline; }

        .dl-changelog { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.07); }
        .dl-changelog-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
        .dl-changelog p { font-size: 13px; color: rgba(255,255,255,0.55); margin: 3px 0; }

        .dl-empty { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; border-radius: 14px; background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); font-size: 13.5px; color: rgba(255,255,255,0.6); }
        .dl-empty a { color: #4ade80; text-decoration: underline; }

        .dl-ios-note { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; }
        .dl-ios-note a { color: #4ade80; text-decoration: underline; }
        .dl-soon-pill {
          font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 100px; padding: 3px 10px; margin-left: auto;
        }

        .dl-steps { border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); padding: 26px; }
        .dl-steps-title { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .dl-step { display: flex; gap: 14px; padding: 10px 0; }
        .dl-step-num {
          flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px;
          background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.25);
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
        }
        .dl-step-text { font-size: 13.5px; color: rgba(255,255,255,0.62); line-height: 1.6; padding-top: 2px; }
        .dl-step-text strong { color: rgba(255,255,255,0.88); }
      `}</style>

      <div className="dl-glow-wrap" aria-hidden="true">
        <div className="dl-glow-a" />
        <div className="dl-glow-b" />
      </div>

      <nav className="dl-nav dl-reveal dl-d0">
        <a href="/" className="dl-nav-back">
          <ArrowLeft size={14} />
          Back to home
        </a>
        <div className="dl-nav-logo">
          <div className="dl-nav-icon">
            <GraduationCap size={14} color="#fff" />
          </div>
          <span className="dl-nav-wordmark">Attendy</span>
        </div>
      </nav>

      <div className="dl-container">
        <div className="dl-hero">
          <div className="dl-badge dl-reveal dl-d1">
            <span className="dl-dot-wrap">
              <span className="dl-dot-ping" />
              <span className="dl-dot-core" />
            </span>
            {release ? `${release.tag_name} available now` : "App downloads"}
          </div>
          <h1 className="dl-h1 dl-reveal dl-d2">Download Attendy</h1>
          <p className="dl-sub dl-reveal dl-d3">
            The mobile app for staff gate scanning and parent attendance tracking — free, and open for anyone to inspect.
          </p>
        </div>

        {/* Android */}
        <div className="dl-card dl-card-android dl-reveal dl-d3">
          <div className="dl-card-head">
            <div className="dl-icon-ring dl-icon-ring-android">
              <AndroidMark size={32} />
            </div>
            <div>
              <div className="dl-card-title">Android</div>
              {release ? (
                <div className="dl-card-meta">
                  {release.tag_name} · Released {formatDate(release.published_at)}
                </div>
              ) : (
                <div className="dl-card-meta">APK direct download</div>
              )}
            </div>
          </div>

          {androidDownloadUrl ? (
            <>
              <a href={androidDownloadUrl} className="dl-btn-download">
                <Download size={18} />
                {apkAsset ? `Download for Android (${formatSize(apkAsset.size)})` : "Download Android APK"}
              </a>

              <div className="dl-note">
                <ShieldCheck size={14} className="shrink-0" style={{ marginTop: 2, color: "#4ade80" }} />
                <p>
                  {apkAsset ? (
                    <>
                      Downloaded directly from our GitHub repository — the same source code you can inspect at{" "}
                      <a href={REPO_LINK ?? `https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer">
                        {REPO_LABEL}
                      </a>
                      . Not from a third-party file host.
                    </>
                  ) : (
                    <>
                      Download link configured from environment settings. If you want GitHub release downloads
                      instead, set <code>NEXT_PUBLIC_GITHUB_RELEASE_REPO</code> and publish a .apk asset there.
                    </>
                  )}
                </p>
              </div>

              {release?.body && (
                <div className="dl-changelog">
                  <p className="dl-changelog-title">What&apos;s new</p>
                  <div>
                    {release.body.split("\n").filter(Boolean).map((line, i) => (
                      <p key={i}>{line.replace(/^[-*]\s*/, "• ")}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="dl-empty">
              <AlertCircle size={16} className="shrink-0" style={{ marginTop: 2 }} />
              <p>No Android build has been published yet. Check back shortly, or <a href="https://wa.me/2348077291745?text=Hi%2C%20I%27d%20like%20a%20direct%20link%20to%20the%20Attendy%20app" target="_blank" rel="noopener noreferrer">message us</a> for a direct link.</p>
            </div>
          )}
        </div>

        {/* iOS */}
        <div className="dl-card dl-card-ios dl-reveal dl-d4">
          <div className="dl-card-head">
            <div className="dl-icon-ring dl-icon-ring-ios">
              <AppleMark size={30} />
            </div>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <div>
                <div className="dl-card-title">iOS</div>
                <div className="dl-card-meta">iPhone &amp; iPad</div>
              </div>
              <span className="dl-soon-pill">Coming soon</span>
            </div>
          </div>
          <p className="dl-ios-note">
            Not available yet. Want to be notified when it launches? <a href="https://wa.me/2348077291745?text=Hi%2C%20please%20notify%20me%20when%20the%20iOS%20app%20is%20ready" target="_blank" rel="noopener noreferrer">Let us know</a> and we&apos;ll reach out.
          </p>
        </div>

        {/* Install instructions */}
        <div className="dl-steps dl-reveal dl-d5">
          <div className="dl-steps-title">
            <Sparkles size={15} color="#4ade80" />
            How to install on Android
          </div>
          <div className="dl-step">
            <div className="dl-step-num">1</div>
            <div className="dl-step-text">Tap the download button above and wait for it to finish.</div>
          </div>
          <div className="dl-step">
            <div className="dl-step-num">2</div>
            <div className="dl-step-text">
              Open the downloaded file. Android will warn that it&apos;s from outside the Play Store — this is
              expected for a new app; tap <strong>Settings</strong> in that prompt and allow installs from your browser.
            </div>
          </div>
          <div className="dl-step">
            <div className="dl-step-num">3</div>
            <div className="dl-step-text">Go back and tap the file again, then tap <strong>Install</strong>.</div>
          </div>
          <div className="dl-step">
            <div className="dl-step-num">4</div>
            <div className="dl-step-text">
              Open the app and log in with your school ID (staff) or your phone number and child&apos;s name (parents).
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}