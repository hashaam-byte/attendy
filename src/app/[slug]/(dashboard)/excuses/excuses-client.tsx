"use client";
// src/app/[slug]/(dashboard)/excuses/excuses-client.tsx — ATTENDY-EDU v4

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

export function ExcusesClient({ requests: initial, orgId, slug }: Props) {
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
        const data = await res.json();
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
            ? <span className="text-amber-600 dark:text-amber-400 font-medium">{pendingCount} pending review</span>
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
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
              filter === f
                ? "bg-green-600 text-white"
                : "text-slate-500 dark:text-[#6b9e7a] hover:bg-green-50 dark:hover:bg-green-950/20"
            )}
          >
            {f} {f === "pending" && pendingCount > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileCheck size={32} className="mx-auto text-green-200 dark:text-green-800 mb-3" />
          <p className="text-sm text-slate-400 dark:text-[#4a7a5a]">No {filter === "all" ? "" : filter} requests.</p>
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
              <div key={req.id} className={cn(
                "card p-5 space-y-3",
                isPending && "border-amber-200 dark:border-amber-800/40"
              )}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
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

                    {/* Date range */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#6b9e7a] mb-1">
                      <Calendar size={11} />
                      {isSameDay
                        ? formatDate(req.start_date)
                        : `${formatDate(req.start_date)} – ${formatDate(req.end_date)}`
                      }
                    </div>

                    {/* Reason */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.03] border border-[#bbf7d0] dark:border-[#1a3a24] rounded-lg p-2.5 leading-relaxed">
                      {req.reason}
                    </p>

                    {/* Submitted by / parent contact */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {req.submitted_by && (
                        <span className="text-xs text-slate-400">
                          Submitted by: {req.submitted_by}
                        </span>
                      )}
                      {req.members?.parent_phone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${req.members.parent_phone}`}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 dark:hover:text-green-400"
                          >
                            <Phone size={10} />
                            {req.members.parent_phone}
                          </a>
                          <a
                            href={`https://wa.me/${req.members.parent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, regarding the excuse request for ${req.members.full_name}…`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
                          >
                            <MessageSquare size={10} />
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    {req.reviewed_at && (
                      <p className="text-xs text-slate-400 mt-1">
                        {req.status === "approved" ? "Approved" : "Rejected"} on {formatDate(req.reviewed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons — only for pending */}
                {isPending && (
                  <div className="flex gap-2 pt-1 border-t border-[#bbf7d0] dark:border-[#1a3a24]">
                    <button
                      onClick={() => handleAction(req.id, "reject")}
                      disabled={isActing}
                      className="btn-secondary text-xs py-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      {isActing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "approve")}
                      disabled={isActing}
                      className="btn-primary text-xs py-1.5 bg-green-600 hover:bg-green-700 flex-1 justify-center"
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