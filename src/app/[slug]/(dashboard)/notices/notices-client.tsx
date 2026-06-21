"use client";
// src/app/[slug]/(dashboard)/notices/notices-client.tsx — ATTENDY-EDU v5
// Theme-safe rewrite.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Megaphone, Plus, Trash2, Loader2,
  Bell, Calendar, Users, X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type Notice = {
  id:             string;
  title:          string;
  body:           string;
  priority:       "low" | "normal" | "high" | "urgent";
  target_classes: string[] | null;
  expires_at:     string | null;
  created_at:     string;
  created_by:     string | null;
};

const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "badge-gray",  barVar: "var(--border-strong)" },
  normal: { label: "Normal", color: "badge-blue",  barVar: "var(--status-info)" },
  high:   { label: "High",   color: "badge-amber", barVar: "var(--status-warning)" },
  urgent: { label: "Urgent", color: "badge-red",   barVar: "var(--status-danger)" },
};

interface Props {
  notices: Notice[];
  classes: string[];
  role:    string;
  orgId:   string;
  slug:    string;
}

export function NoticesClient({ notices: initial, classes, role, orgId }: Props) {
  const supabase = createClient();

  const [notices,     setNotices]     = useState<Notice[]>(initial);
  const [showForm,    setShowForm]    = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [form, setForm] = useState({
    title:          "",
    body:           "",
    priority:       "normal" as Notice["priority"],
    target_classes: [] as string[],
    expires_at:     "",
  });

  const isAdmin = role === "admin";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("school_notices")
      .insert({
        organisation_id: orgId,
        title:           form.title.trim(),
        body:            form.body.trim(),
        priority:        form.priority,
        target_classes:  form.target_classes.length > 0 ? form.target_classes : null,
        expires_at:      form.expires_at || null,
      })
      .select()
      .single();

    if (!error && data) {
      setNotices((n) => [data as Notice, ...n]);
      setForm({ title: "", body: "", priority: "normal", target_classes: [], expires_at: "" });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from("school_notices").delete().eq("id", id);
    setNotices((n) => n.filter((x) => x.id !== id));
    setDeleting(null);
  }

  function toggleClass(c: string) {
    setForm((f) => ({
      ...f,
      target_classes: f.target_classes.includes(c)
        ? f.target_classes.filter((x) => x !== c)
        : [...f.target_classes, c],
    }));
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="page-title">School Notices</h2>
          <p className="page-sub">{notices.length} active notice{notices.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus size={15} /> New Notice
          </button>
        )}
      </div>

      {/* Create form modal */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Megaphone size={15} style={{ color: "var(--accent)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>New Notice</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--icon-default)" }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-base"
                  placeholder="e.g. Parents' Day postponed to Friday"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-base resize-none"
                  rows={4}
                  placeholder="Full notice text…"
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Priority</label>
                <div className="flex gap-2">
                  {(["low", "normal", "high", "urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize"
                      style={form.priority === p
                        ? { background: "var(--accent)", borderColor: "var(--accent)", color: "white" }
                        : { borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {classes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Target Classes <span className="font-normal" style={{ color: "var(--text-faint)" }}>(empty = all classes)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {classes.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleClass(c)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                        style={form.target_classes.includes(c)
                          ? { background: "var(--accent)", borderColor: "var(--accent)", color: "white" }
                          : { borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Expiry Date <span className="font-normal" style={{ color: "var(--text-faint)" }}>(optional — auto-hides after this date)</span>
                </label>
                <input
                  type="date"
                  className="input-base"
                  value={form.expires_at}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving || !form.title || !form.body} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Posting…</> : <><Megaphone size={13} /> Post Notice</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notices list */}
      {notices.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={32} className="mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No active notices.
            {isAdmin && " Create one to inform all staff."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const cfg = PRIORITY_CONFIG[notice.priority];
            const isUrgent = notice.priority === "urgent";
            return (
              <div
                key={notice.id}
                className="card p-5 relative overflow-hidden"
                style={isUrgent ? { borderColor: "var(--status-danger)" } : {}}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cfg.barVar }} />
                <div className="pl-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          {notice.title}
                        </h3>
                        <span className={cn("badge text-[10px]", cfg.color)}>{cfg.label}</span>
                        {notice.target_classes && notice.target_classes.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                            <Users size={10} />
                            {notice.target_classes.join(", ")}
                          </div>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {notice.body}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
                        <span>{formatDate(notice.created_at)}</span>
                        {notice.expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Expires {formatDate(notice.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(notice.id)}
                        disabled={deleting === notice.id}
                        className="p-1.5 rounded-lg transition-colors shrink-0"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {deleting === notice.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
