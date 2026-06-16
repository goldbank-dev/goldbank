import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  KeyRound, ShieldCheck, ShieldAlert, ExternalLink, RefreshCw, Eye, EyeOff, Lock, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/utils/error-handler.tsx";
import { cn } from "@/lib/utils";

interface SecretMeta {
  key: string;
  label: string;
  description: string;
  category: "Pagamentos" | "Email" | "AI" | "Mensageria" | "Plataforma";
  required: boolean;
}

const SECRETS: SecretMeta[] = [
  { key: "STRIPE_SECRET_KEY",      label: "Stripe Secret Key",     description: "Chave secreta do Stripe (sk_live_…)",       category: "Pagamentos", required: false },
  { key: "STRIPE_WEBHOOK_SECRET",  label: "Stripe Webhook Secret", description: "Segredo de assinatura dos webhooks Stripe",  category: "Pagamentos", required: false },
  { key: "PIX_PROVIDER_API_KEY",   label: "PIX Provider Key",      description: "Chave do provedor PIX (Asaas, Gerencianet…)",category: "Pagamentos", required: false },
  { key: "RESEND_API_KEY",         label: "Resend API Key",        description: "Envio de emails transacionais via Resend",   category: "Email",      required: false },
  { key: "OPENAI_API_KEY",         label: "OpenAI API Key",        description: "Apenas se preferir OpenAI ao Lovable AI",    category: "AI",         required: false },
  { key: "TWILIO_ACCOUNT_SID",     label: "Twilio Account SID",    description: "ID da conta Twilio para SMS",                category: "Mensageria", required: false },
  { key: "TWILIO_AUTH_TOKEN",      label: "Twilio Auth Token",     description: "Token de autenticação Twilio",               category: "Mensageria", required: false },
  { key: "WEBHOOK_SIGNING_SECRET", label: "Webhook Signing Secret",description: "HMAC para assinar webhooks de saída",        category: "Plataforma", required: false },
  { key: "LOVABLE_API_KEY",        label: "Lovable API Key",       description: "Provisionada automaticamente",               category: "Plataforma", required: true  },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service Role Key",   description: "Acesso elevado nas edge functions",          category: "Plataforma", required: true  },
];

const SECRETS_DASHBOARD =
  "https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/settings/functions";

export const SecretsManagement = () => {
  const [statusMap, setStatusMap] = useState<Record<string, { configured: boolean; length: number }>>({});
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("secrets-status");
      if (error) throw error;
      setStatusMap(data?.status ?? {});
      setCheckedAt(data?.checked_at ? new Date(data.checked_at) : new Date());
    } catch (e) {
      handleError(e, "Não foi possível verificar os secrets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const grouped = SECRETS.reduce<Record<string, SecretMeta[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  const total = SECRETS.length;
  const configured = SECRETS.filter(s => statusMap[s.key]?.configured).length;
  const missingRequired = SECRETS.filter(s => s.required && !statusMap[s.key]?.configured);

  const mask = (len: number) => "•".repeat(Math.min(Math.max(len, 6), 16));

  return (
    <div className="space-y-6">
      <Alert className="bg-amber-500/5 border-amber-500/20">
        <Lock className="h-4 w-4 text-amber-400" />
        <AlertTitle className="text-amber-300 font-bold">Os valores nunca aparecem aqui</AlertTitle>
        <AlertDescription className="text-amber-200/70 text-xs leading-relaxed">
          Por segurança, esta tela mostra apenas se cada secret está <strong>configurado</strong> ou
          <strong> faltando</strong>. Os valores reais ficam protegidos no Lovable Cloud (variáveis de ambiente
          das edge functions) e não trafegam pelo navegador. Use o botão "Configurar" para defini-los com segurança.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Badge className="border-green-500/30 bg-green-500/10 text-green-400 font-bold">
            <ShieldCheck className="w-3 h-3 mr-1" /> {configured}/{total} configurados
          </Badge>
          {missingRequired.length > 0 && (
            <Badge className="border-red-500/30 bg-red-500/10 text-red-400 font-bold">
              <ShieldAlert className="w-3 h-3 mr-1" /> {missingRequired.length} obrigatórios faltando
            </Badge>
          )}
          {checkedAt && (
            <span className="text-[11px] text-white/40">
              Verificado às {checkedAt.toLocaleTimeString("pt-BR")}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setReveal(r => !r)} variant="outline" size="sm" className="rounded-xl border-white/10">
            {reveal ? <EyeOff className="w-3.5 h-3.5 mr-2" /> : <Eye className="w-3.5 h-3.5 mr-2" />}
            {reveal ? "Ocultar máscaras" : "Ver máscaras"}
          </Button>
          <Button onClick={loadStatus} disabled={loading} variant="outline" size="sm" className="rounded-xl border-white/10">
            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} />
            Verificar
          </Button>
          <Button asChild size="sm" className="rounded-xl bg-primary text-black font-bold">
            <a href={SECRETS_DASHBOARD} target="_blank" rel="noreferrer">
              <KeyRound className="w-3.5 h-3.5 mr-2" /> Gerenciar
              <ExternalLink className="w-3 h-3 ml-2" />
            </a>
          </Button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
      )}

      {!loading && Object.entries(grouped).map(([category, list]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((s) => {
              const st = statusMap[s.key];
              const ok = !!st?.configured;
              return (
                <Card
                  key={s.key}
                  className={cn(
                    "p-4 rounded-2xl border bg-neutral-900/40 flex flex-col gap-3 transition-colors",
                    ok ? "border-green-500/20 hover:border-green-500/40" : "border-white/5 hover:border-amber-500/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm truncate">{s.label}</h4>
                        {s.required && (
                          <Badge variant="outline" className="text-[9px] border-white/10 text-white/50 font-bold">
                            obrigatório
                          </Badge>
                        )}
                      </div>
                      <code className="text-[10px] text-white/40 font-mono">{s.key}</code>
                      <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{s.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 font-bold text-[10px]",
                        ok
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      )}
                    >
                      {ok ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                      {ok ? "Configurado" : "Faltando"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3 h-3 text-white/30 shrink-0" />
                      <code className="text-[11px] font-mono text-white/40 truncate">
                        {ok ? (reveal ? mask(st!.length) : "•••• protegido ••••") : "não definido"}
                      </code>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] hover:bg-white/5 shrink-0">
                      <a href={SECRETS_DASHBOARD} target="_blank" rel="noreferrer">
                        Configurar <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Alert className="bg-blue-500/5 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200/70 text-xs leading-relaxed">
          Para adicionar um secret novo (não listado), abra o Lovable Cloud → <strong>Edge Functions → Secrets</strong>
          e clique em <em>Add new secret</em>. Ele ficará disponível imediatamente em todas as edge functions via
          <code className="mx-1 px-1.5 py-0.5 bg-blue-500/10 rounded">Deno.env.get()</code>.
        </AlertDescription>
      </Alert>
    </div>
  );
};
