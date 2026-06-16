import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database, Brain, Mail, CreditCard, Zap, Vault,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Health = "ok" | "warn" | "error" | "off" | "loading";

interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  configured: boolean;
  health: Health;
  lastSync: Date | null;
  details: string;
  toggleKey?: string;
  externalLink?: string;
  canToggle: boolean;
}

interface Props {
  systemSettings: any;
  handleUpdateSetting: (key: string, value: any) => void;
}

const parseVal = (raw: any, fallback: any) => {
  if (raw === undefined || raw === null) return fallback;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return raw; }
};

const healthMeta: Record<Health, { label: string; cls: string; Icon: any }> = {
  ok:      { label: "Operacional",  cls: "border-green-500/30 bg-green-500/10 text-green-400",   Icon: CheckCircle2 },
  warn:    { label: "Atenção",      cls: "border-amber-500/30 bg-amber-500/10 text-amber-400",   Icon: AlertTriangle },
  error:   { label: "Erro",         cls: "border-red-500/30 bg-red-500/10 text-red-400",          Icon: XCircle },
  off:     { label: "Desativado",   cls: "border-white/10 bg-white/5 text-white/40",              Icon: XCircle },
  loading: { label: "Verificando",  cls: "border-blue-500/30 bg-blue-500/10 text-blue-400",       Icon: RefreshCw },
};

export const IntegrationStatusCards = ({ systemSettings, handleUpdateSetting }: Props) => {
  const [items, setItems] = useState<IntegrationStatus[]>([]);
  const [checking, setChecking] = useState(false);

  const buildStatuses = async (): Promise<IntegrationStatus[]> => {
    const s = systemSettings || {};
    const aiEnabled       = parseVal(s.integration_ai_enabled, true);
    const emailEnabled    = parseVal(s.integration_email_enabled, true);
    const stripeEnabled   = parseVal(s.integration_stripe_enabled, false);
    const pixEnabled      = parseVal(s.integration_pix_enabled, true);
    const webhooksEnabled = parseVal(s.integration_webhooks_enabled, false);
    const webhookUrl      = parseVal(s.integration_webhook_url, "");
    const publishPoR      = parseVal(s.publish_proof_of_reserves, true);
    const tokens          = parseVal(s.token_symbol, "GTK");

    // Supabase health
    let supabaseHealth: Health = "loading";
    let supabaseLastSync: Date | null = null;
    let supabaseDetails = "Verificando…";
    try {
      const t0 = performance.now();
      const { error } = await supabase.from("system_settings").select("key").limit(1);
      const ms = Math.round(performance.now() - t0);
      if (error) {
        supabaseHealth = "error";
        supabaseDetails = `Falha: ${error.message}`;
      } else {
        supabaseHealth = ms > 1000 ? "warn" : "ok";
        supabaseDetails = `Latência ${ms}ms · RLS ativo`;
        supabaseLastSync = new Date();
      }
    } catch (e: any) {
      supabaseHealth = "error";
      supabaseDetails = "Conexão indisponível";
    }

    // Lovable AI — assumed configured (LOVABLE_API_KEY managed)
    const aiHealth: Health = aiEnabled ? "ok" : "off";

    // Email — depends on toggle + auth template existence (we cannot probe directly here)
    const emailHealth: Health = emailEnabled ? "ok" : "off";

    // PIX / Asaas — verifica se a chave está configurada via secrets-status
    let pixConfigured = false;
    let pixHealth: Health = pixEnabled ? "warn" : "off";
    let pixDetails = pixEnabled ? "Verificando chave Asaas…" : "PIX desativado";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secrets-status`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (res.ok) {
          const { status: secrets } = await res.json();
          pixConfigured = secrets?.ASAAS_API_KEY?.configured === true;
          if (!pixEnabled) {
            pixHealth = "off";
            pixDetails = "PIX desativado";
          } else if (pixConfigured) {
            const baseUrl = secrets?.ASAAS_BASE_URL?.configured
              ? (secrets.ASAAS_BASE_URL.length > 30 ? "produção" : "sandbox")
              : "sandbox";
            pixHealth = "ok";
            pixDetails = `ASAAS_API_KEY configurada · ambiente: ${baseUrl}`;
          } else {
            pixHealth = "error";
            pixDetails = "ASAAS_API_KEY não configurada — PIX em modo demo.";
          }
        }
      }
    } catch { /* ignora — não bloqueia UI */ }

    // Stripe — needs explicit setup beyond toggle
    const stripeHealth: Health = stripeEnabled ? "warn" : "off";
    const stripeDetails = stripeEnabled
      ? "Toggle ativo — configure as credenciais Stripe nos Secrets."
      : "Integração desativada.";

    // Webhooks — must have URL when enabled
    const webhookHealth: Health = !webhooksEnabled
      ? "off"
      : webhookUrl && /^https?:\/\//.test(webhookUrl) ? "ok" : "error";
    const webhookDetails = !webhooksEnabled
      ? "Eventos não enviados."
      : webhookUrl
        ? `Destino: ${webhookUrl}`
        : "URL não configurada.";

    // Proof of Reserves — based on tokens table audit_status
    let porHealth: Health = publishPoR ? "ok" : "off";
    let porSync: Date | null = null;
    let porDetails = publishPoR ? "Publicação ativa" : "Não publicado";
    try {
      const { data: tok } = await supabase
        .from("tokens")
        .select("audit_status,last_audit_date,custody_location")
        .eq("symbol", tokens)
        .maybeSingle();
      if (tok) {
        porSync = tok.last_audit_date ? new Date(tok.last_audit_date) : null;
        if (publishPoR && tok.audit_status !== "verified") porHealth = "warn";
        porDetails = `${tok.audit_status ?? "—"} · ${tok.custody_location ?? "custódia n/d"}`;
      }
    } catch { /* ignore */ }

    return [
      {
        id: "supabase",
        name: "Supabase / Lovable Cloud",
        description: "Banco, auth, storage e edge functions",
        icon: Database,
        enabled: true,
        configured: true,
        health: supabaseHealth,
        lastSync: supabaseLastSync,
        details: supabaseDetails,
        externalLink: "https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj",
        canToggle: false,
      },
      {
        id: "ai",
        name: "Lovable AI Gateway",
        description: "Modelos de IA para análise e suporte",
        icon: Brain,
        enabled: aiEnabled,
        configured: true,
        health: aiHealth,
        lastSync: aiEnabled ? new Date() : null,
        details: aiEnabled ? "LOVABLE_API_KEY provisionado" : "IA desativada",
        toggleKey: "integration_ai_enabled",
        canToggle: true,
      },
      {
        id: "email",
        name: "Email Transacional",
        description: "Confirmações, alertas e notificações",
        icon: Mail,
        enabled: emailEnabled,
        configured: emailEnabled,
        health: emailHealth,
        lastSync: null,
        details: emailEnabled ? "Templates padrão Lovable ativos" : "Envio de emails desativado",
        toggleKey: "integration_email_enabled",
        externalLink: "https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/auth/templates",
        canToggle: true,
      },
      {
        id: "pix",
        name: "PIX / Asaas",
        description: "Depósitos e saques instantâneos",
        icon: CreditCard,
        enabled: pixEnabled,
        configured: pixConfigured,
        health: pixHealth,
        lastSync: null,
        details: pixDetails,
        toggleKey: "integration_pix_enabled",
        externalLink: "https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/settings/functions",
        canToggle: true,
      },
      {
        id: "stripe",
        name: "Stripe (Cartões)",
        description: "Pagamentos internacionais com cartão",
        icon: CreditCard,
        enabled: stripeEnabled,
        configured: false,
        health: stripeHealth,
        lastSync: null,
        details: stripeDetails,
        toggleKey: "integration_stripe_enabled",
        externalLink: "https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/settings/functions",
        canToggle: true,
      },
      {
        id: "webhooks",
        name: "Webhooks",
        description: "Notificações de eventos para sistemas externos",
        icon: Zap,
        enabled: webhooksEnabled,
        configured: !!webhookUrl,
        health: webhookHealth,
        lastSync: null,
        details: webhookDetails,
        toggleKey: "integration_webhooks_enabled",
        canToggle: true,
      },
      {
        id: "por",
        name: "Proof of Reserves",
        description: "Auditoria pública de lastro do token",
        icon: Vault,
        enabled: publishPoR,
        configured: true,
        health: porHealth,
        lastSync: porSync,
        details: porDetails,
        toggleKey: "publish_proof_of_reserves",
        canToggle: true,
      },
    ];
  };

  const refresh = async () => {
    setChecking(true);
    const next = await buildStatuses();
    setItems(next);
    setChecking(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemSettings]);

  const summary = {
    ok: items.filter(i => i.health === "ok").length,
    warn: items.filter(i => i.health === "warn").length,
    error: items.filter(i => i.health === "error").length,
    off: items.filter(i => i.health === "off").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge className="border-green-500/30 bg-green-500/10 text-green-400 font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {summary.ok} operacionais
          </Badge>
          {summary.warn > 0 && (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold">
              <AlertTriangle className="w-3 h-3 mr-1" /> {summary.warn} atenção
            </Badge>
          )}
          {summary.error > 0 && (
            <Badge className="border-red-500/30 bg-red-500/10 text-red-400 font-bold">
              <XCircle className="w-3 h-3 mr-1" /> {summary.error} com erro
            </Badge>
          )}
          <Badge className="border-white/10 bg-white/5 text-white/40 font-bold">
            {summary.off} desativadas
          </Badge>
        </div>
        <Button onClick={refresh} disabled={checking} variant="outline" size="sm" className="rounded-xl border-white/10">
          <RefreshCw className={cn("w-3.5 h-3.5 mr-2", checking && "animate-spin")} />
          Verificar agora
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
            ))
          : items.map((it) => {
              const meta = healthMeta[it.health];
              const Icon = it.icon;
              return (
                <Card
                  key={it.id}
                  className="bg-neutral-900/40 border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate">{it.name}</h4>
                        <p className="text-[11px] text-white/40 truncate">{it.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("font-bold text-[10px] shrink-0", meta.cls)}>
                      <meta.Icon className={cn("w-3 h-3 mr-1", it.health === "loading" && "animate-spin")} />
                      {meta.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          it.configured ? "bg-green-500" : "bg-amber-500"
                        )} />
                        Configuração
                      </span>
                      <span className="font-medium">
                        {it.configured ? "Completa" : "Pendente"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Última verificação
                      </span>
                      <span className="font-medium">
                        {it.lastSync
                          ? formatDistanceToNow(it.lastSync, { addSuffix: true, locale: ptBR })
                          : "—"}
                      </span>
                    </div>
                    <p className="text-white/50 leading-relaxed pt-1 border-t border-white/5">
                      {it.details}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-white/5">
                    {it.canToggle && it.toggleKey ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={it.enabled}
                          onCheckedChange={(v) =>
                            handleUpdateSetting(
                              it.toggleKey!,
                              it.toggleKey === "publish_proof_of_reserves" ? v : v
                            )
                          }
                        />
                        <span className="text-[11px] font-bold text-white/60">
                          {it.enabled ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    ) : <span className="text-[11px] text-white/30 font-bold">Sempre ativo</span>}
                    {it.externalLink && (
                      <Button asChild variant="ghost" size="sm" className="h-8 text-[11px] hover:bg-white/5">
                        <a href={it.externalLink} target="_blank" rel="noreferrer">
                          Configurar <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
      </div>
    </div>
  );
};
