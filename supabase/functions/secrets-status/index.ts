// Returns ONLY booleans indicating which integration secrets are configured.
// Never returns secret values. Admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Whitelist of secrets the admin UI can inspect (status only).
const KNOWN_SECRETS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "OPENAI_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "ASAAS_API_KEY",
  "ASAAS_BASE_URL",
  "ASAAS_WEBHOOK_TOKEN",
  "WEBHOOK_SIGNING_SECRET",
  // Always-present platform secrets:
  "LOVABLE_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin check
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roles) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status: Record<string, { configured: boolean; length: number }> = {};
    for (const key of KNOWN_SECRETS) {
      const v = Deno.env.get(key);
      status[key] = { configured: !!v && v.length > 0, length: v ? v.length : 0 };
    }

    return new Response(JSON.stringify({ status, checked_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorId = crypto.randomUUID();
    console.error(JSON.stringify({ fn: "secrets-status", error_id: errorId, error: String(e) }));
    return new Response(JSON.stringify({ error: "internal_error", error_id: errorId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
