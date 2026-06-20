import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasFeature, minPlanFor } from "@/lib/plan-features";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser || orgUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { settings, logo_url, primary_color, ...rest } = body;

  // Always re-read the org's actual plan from the DB — never trust
  // anything plan-related sent from the client.
  const { data: currentOrg } = await supabase
    .from("organisations")
    .select("settings, plan, whatsapp_enabled")
    .eq("id", orgUser.organisation_id)
    .single();

  const update: Record<string, unknown> = {};

  if (settings) {
    // ── Plan-gate check: WhatsApp notifications ──────────────────
    if (settings.whatsapp_notifications === true) {
      const planAllows = hasFeature(currentOrg?.plan, "whatsappNotifications");
      if (!planAllows) {
        return NextResponse.json(
          {
            error: `WhatsApp notifications require the ${minPlanFor("whatsappNotifications")} plan or higher. ` +
                   `Your current plan is "${currentOrg?.plan ?? "trial"}". Upgrade to enable this.`,
            code: "PLAN_FEATURE_LOCKED",
            feature: "whatsappNotifications",
            requiredPlan: minPlanFor("whatsappNotifications"),
            currentPlan: currentOrg?.plan ?? "trial",
          },
          { status: 403 }
        );
      }
      // Also requires Termii's WhatsApp channel to actually be approved
      // for this org (separate from the plan check) — see whatsapp_enabled
      // column, which is flipped by Attendy support once Termii approves
      // the org's WhatsApp sender. We don't block the SETTING here (the
      // org can pre-enable it), but /api/notify already checks
      // org.whatsapp_enabled AND settings.whatsapp_notifications together
      // before actually routing via WhatsApp, so this is safe.
    }

    const mergedSettings = {
      ...(currentOrg?.settings as Record<string, unknown> || {}),
      ...settings,
    };
    update.settings = mergedSettings;
  }

  if ("logo_url" in body) update.logo_url = logo_url;
  if (primary_color) update.primary_color = primary_color;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organisations")
    .update(update)
    .eq("id", orgUser.organisation_id)
    .select()
    .single();

  if (error) {
    console.error("org-settings PATCH error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, org: data });
}
