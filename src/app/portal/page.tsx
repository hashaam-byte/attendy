"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Phone, GraduationCap, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export default function ParentPortalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Enter a valid Nigerian phone number");
      setLoading(false);
      return;
    }

    // Try multiple formats
    const variants = [cleaned];
    if (cleaned.startsWith("0") && cleaned.length === 11) variants.push("234" + cleaned.slice(1));
    if (cleaned.startsWith("234")) variants.push("0" + cleaned.slice(3));

    const { data: students } = await supabase
      .from("members")
      .select("id, full_name, class_name, organisation_id, parent_phone")
      .in("parent_phone", variants)
      .eq("member_type", "student")
      .eq("is_active", true);

    if (!students || students.length === 0) {
      setError("No students found for this phone number. Check with your school admin.");
      setLoading(false);
      return;
    }

    // Store in sessionStorage (simple, no password needed for V1)
    sessionStorage.setItem("parent_students", JSON.stringify(students));
    sessionStorage.setItem("parent_phone", phone);

    router.push("/portal/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg shadow-green-500/30 mb-4">
              <GraduationCap size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Parent Portal</h1>
            <p className="text-sm text-slate-500 dark:text-[#6b9e7a] mt-1">
              View your child's attendance — no password needed
            </p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-green-200 mb-1.5">
                  Your phone number (as registered with the school)
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    required
                    className="input-base pl-9"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phone}
                className="btn-primary w-full py-3"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : "View my child's attendance"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 dark:text-[#4a7a5a] mt-5">
              Staff member?{" "}
              <a href="/login" className="text-green-600 dark:text-green-400 hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}