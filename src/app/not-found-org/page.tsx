import { GraduationCap, ArrowLeft } from "lucide-react";

export default async function NotFoundOrgPage({
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">School not found</h1>
        <p className="text-slate-500 dark:text-[#6b9e7a] mb-2">
          We couldn't find a school with the ID:
        </p>
        {slug && (
          <p className="font-mono text-sm bg-slate-100 dark:bg-[#1a3a24] px-3 py-1.5 rounded-lg text-slate-700 dark:text-green-200 mb-6 inline-block">
            {slug}
          </p>
        )}
        <p className="text-sm text-slate-400 dark:text-[#4a7a5a] mb-8">
          Double-check your school ID with your school admin. School IDs are
          provided when you sign up with Attendy.
        </p>
        <a href="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to home
        </a>
      </div>
    </div>
  );
}