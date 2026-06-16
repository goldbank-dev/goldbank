// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (!data) return fallback;
  const v = (data as any).value;
  return (v ?? fallback) as T;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = (await getSetting<string>("security_alert_webhook_url", "")).trim();
    const alertEmail = (await getSetting<string>("security_alert_email", "")).trim();
    const threshold = Number(await getSetting<number>("security_alert_threshold", 25));
    const windowMinutes = Number(await getSetting<number>("security_alert_window_minutes", 15));
    const cooldownMinutes = Number(await getSetting<number>("security_alert_cooldown_minutes", 15));

    const sinceWindow = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const sinceCooldown = new Date(Date.now() - cooldownMinutes * 60_000).toISOString();

    // Count *_BLOCKED events in window
    const { count, error: countErr } = await admin
      .from("security_audit_log")
      .select("id", { count: "exact", head: true })
      .like("event_type", "%_BLOCKED")
      .gte("occurred_at", sinceWindow);

    if (countErr) throw countErr;
    const eventCount = count ?? 0;

    // Cooldown check
    const { data: lastDispatch } = await admin
      .from("security_alert_dispatches")
      .select("id, dispatched_at")
      .gte("dispatched_at", sinceCooldown)
      .order("dispatched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const triggered = eventCount >= threshold;
    const inCooldown = !!lastDispatch;

    if (!triggered || inCooldown) {
      return new Response(
        JSON.stringify({
          checked: true,
          event_count: eventCount,
          threshold,
          window_minutes: windowMinutes,
          triggered,
          skipped: triggered && inCooldown ? "cooldown" : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull a small sample for the alert payload
    const { data: sample } = await admin
      .from("security_audit_log")
      .select("occurred_at, event_type, actor_id, target_table, target_function, reason, request_id")
      .like("event_type", "%_BLOCKED")
      .gte("occurred_at", sinceWindow)
      .order("occurred_at", { ascending: false })
      .limit(20);

    // Top event types
    const byType: Record<string, number> = {};
    (sample ?? []).forEach((r: any) => {
      byType[r.event_type] = (byType[r.event_type] ?? 0) + 1;
    });

    const summary = {
      title: "🚨 Pico de eventos de segurança bloqueados",
      event_count: eventCount,
      threshold,
      window_minutes: windowMinutes,
      since: sinceWindow,
      by_event_type: byType,
      sample_events: sample ?? [],
      dashboard_url: `${SUPABASE_URL.replace(".supabase.co", ".lovable.app")}/sanpainel/security-audit`,
    };

    const channels: string[] = [];
    let webhookStatus: string | null = null;
    let emailStatus: string | null = null;

    // 1) Webhook
    if (webhookUrl) {
      channels.push("webhook");
      try {
        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(summary),
        });
        webhookStatus = resp.ok ? `ok (${resp.status})` : `error (${resp.status})`;
      } catch (e) {
        webhookStatus = `error: ${(e as Error).message}`;
      }
    } else {
      webhookStatus = "not_configured";
    }

    // 2) Email (uses Lovable transactional email if configured; otherwise skipped)
    if (alertEmail) {
      channels.push("email");
      try {
        const html = `
          <h2>${summary.title}</h2>
          <p><strong>${eventCount}</strong> eventos <code>*_BLOCKED</code> em <strong>${windowMinutes} min</strong>
             (limite: ${threshold}).</p>
          <p>Distribuição: <pre>${JSON.stringify(byType, null, 2)}</pre></p>
          <p><a href="${summary.dashboard_url}">Abrir trilha de auditoria</a></p>
        `;
        const r = await admin.functions.invoke("send-transactional-email", {
          body: {
            to: alertEmail,
            subject: `[Segurança] ${eventCount} eventos bloqueados em ${windowMinutes} min`,
            html,
            purpose: "transactional",
          },
        });
        emailStatus = r.error ? `error: ${r.error.message}` : "queued";
      } catch (e) {
        emailStatus = `error: ${(e as Error).message}`;
      }
    } else {
      emailStatus = "not_configured";
    }

    await admin.from("security_alert_dispatches").insert({
      event_count: eventCount,
      window_minutes: windowMinutes,
      threshold,
      channels,
      webhook_status: webhookStatus,
      email_status: emailStatus,
      details: { by_event_type: byType, sample_size: (sample ?? []).length },
    });

    return new Response(
      JSON.stringify({
        triggered: true,
        event_count: eventCount,
        webhook_status: webhookStatus,
        email_status: emailStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("security-alert-monitor error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
