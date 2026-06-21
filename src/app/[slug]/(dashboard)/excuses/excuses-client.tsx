"use client";
// src/app/[slug]/(dashboard)/excuses/excuses-client.tsx — ATTENDY-EDU v5
// Theme-safe rewrite.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck, CheckCircle, XCircle, Clock, Loader2,
  Phone, Calendar, MessageSquare,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type ExcuseRequest = {
  id:           string;
  created_at:   string;
  start_date:   string;
  end_date:     string;
  reason:       string;
  status:       "pending" | "approved" | "rejected";
  reviewed_at:  string | null;
  submitted_by: string | null;
  members: {
    id:           string;
    full_name:    string;
    class_name:   string | null;
    parent_phone: string | null;
  } | null;
};

interface Props {
  requests: ExcuseRequest[];
  orgId:    string;
  slug:     string;
}

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "badge-amber", icon: Clock },
  approved: { label: "Approved", color: "badge-green", icon: CheckCircle },
  rejected: { label: "Rejected", color: "badge-red",   icon: XCircle },
};

export function ExcusesClient({ requests: initial, slug }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<ExcuseRequest[]>(initial);
  const [acting,   setActing]   = useState<string | null>(null);
  const [filter,   setFilter]   = useState<"all" | "pending" | "approved" | "rejected">("all");

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  async function handleAction(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      const res = await fetch(`/api/excuse-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() }
              : r
          )
        );
        router.refresh();
      }
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="page-title">Excuse Requests</h2>
        <p className="page-sub">
          {pendingCount > 0
            ? <span className="font-medium" style={{ color: "var(--status-warning)" }}>{pendingCount} pending review</span>
            : "No pending requests"
          }
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
            style={filter === f ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}
          >
            {f} {f === "pending" && pendingCount > 0 && (
              <span className="ml-1 text-white text-[10px] font-bold px-1.5 rounded-full" style={{ background: "var(--status-warning)" }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileCheck size={32} className="mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No {filter === "all" ? "" : filter} requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const cfg  = STATUS_CONFIG[req.status];
            const Icon = cfg.icon;
            const isPending = req.status === "pending";
            const isActing  = acting === req.id;
            const isSameDay = req.start_date === req.end_date;

            return (
              <div key={req.id} className="card p-5 space-y-3" style={isPending ? { borderColor: "var(--status-warning)" } : {}}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {req.members?.full_name ?? "Unknown Student"}
                      </p>
                      {req.members?.class_name && (
                        <span className="badge-green text-[10px]">{req.members.class_name}</span>
                      )}
                      <span className={cn("badge text-[10px]", cfg.color)}>
                        <Icon size={9} className="mr-1" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      <Calendar size={11} />
                      {isSameDay
                        ? formatDate(req.start_date)
                        : `${formatDate(req.start_date)} – ${formatDate(req.end_date)}`
                      }
                    </div>

                    <p className="text-sm rounded-lg p-2.5 leading-relaxed border" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                      {req.reason}
                    </p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {req.submitted_by && (
                        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                          Submitted by: {req.submitted_by}
                        </span>
                      )}
                      {req.members?.parent_phone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${req.members.parent_phone}`}
                            className="flex items-center gap-1 text-xs transition-colors"
                            style={{ color: "var(--text-faint)" }}
                          >
                            <Phone size={10} />
                            {req.members.parent_phone}
                          </a>
                          <a
                            href={`https://wa.me/${req.members.parent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, regarding the excuse request for ${req.members.full_name}…`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs hover:underline"
                            style={{ color: "var(--status-success)" }}
                          >
                            <MessageSquare size={10} />
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    {req.reviewed_at && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                        {req.status === "approved" ? "Approved" : "Rejected"} on {formatDate(req.reviewed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {isPending && (
                  <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                    <button
                      onClick={() => handleAction(req.id, "reject")}
                      disabled={isActing}
                      className="btn-secondary text-xs py-1.5"
                      style={{ color: "var(--status-danger)", borderColor: "var(--status-danger)" }}
                    >
                      {isActing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "approve")}
                      disabled={isActing}
                      className="btn-primary text-xs py-1.5 flex-1 justify-center"
                    >
                      {isActing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Approve &amp; Mark Excused
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
