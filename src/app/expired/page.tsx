import { GraduationCap, ArrowLeft } from "lucide-react";

export default async function ExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={36} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Subscription Expired</h1>
        <p className="text-slate-500 dark:text-[#6b9e7a] mb-6">
          The subscription for <strong className="text-slate-700 dark:text-green-200">{slug}</strong> has
          expired. Please contact your school admin to renew your Attendy subscription.
        </p>
        <a
          href="https://wa.me/2348077291745?text=Hi%2C%20I%20need%20to%20renew%20my%20school%20subscription"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2 mb-4"
        >
          Renew via WhatsApp
        </a>
        <br />
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors mt-2">
          <ArrowLeft size={14} /> Back to home
        </a>
      </div>
    </div>
  );
}