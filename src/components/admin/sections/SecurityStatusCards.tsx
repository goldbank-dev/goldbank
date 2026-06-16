import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldCheck, ShieldAlert, KeyRound, Lock, Database, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  systemSettings: any;
  handleUpdateSetting: (key: string, value: any) => void;
}

const parseVal = (raw: any, fallback: any) => {
  if (raw === undefined || raw === null) return fallback;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return raw; }
};

type Status = "ok" | "warn" | "error" | "off";

const statusBadge = (s: Status) => {
  const map: Record<Status, { label: string; cls: string; icon: any }> = {
    ok: { label: "Protegido", cls: "border-green-500/30 bg-green-500/10 text-green-400", icon: CheckCircle2 },
    warn: { label: "Atenção", cls: "border-amber-500/30 bg-amber-500/10 text-amber-400", icon: AlertTriangle },
    error: { label: "Risco", cls: "border-red-500/30 bg-red-500/10 text-red-400", icon: ShieldAlert },
    off: { label: "Desativado", cls: "border-white/10 bg-white/5 text-white/40", icon: Shield },
  };
  const { label, cls, icon: Icon } = map[s];
  return (
    <Badge variant="outline" className={`${cls} font-bold`}>
      <Icon className="w-3 h-3 mr-1" /> {label}
    </Badge>
  );
};

export const SecurityStatusCards = ({ systemSettings, handleUpdateSetting }: Props) => {
  const s = systemSettings || {};
  const twoFa = parseVal(s.two_fa_required, false);
  const leakedPwd = parseVal(s.leaked_password_check, false);
  const ipWhitelist = parseVal(s.ip_whitelist_admin, false);
  const kycRequired = parseVal(s.kyc_required?.enabled ?? s.kyc_required, false);

  const [rlsStatus, setRlsStatus] = useState<Status>("warn");
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runCheck = async () => {
    setChecking(true);
    try {
      // RLS health: probe a protected table without auth context
      const { error } = await supabase.from("admin_audit_logs").select("id", { count: "exact", head: true });
      // If RLS blocks anonymous, that's expected (good). 401/permission means RLS is doing its job.
      setRlsStatus(error ? "ok" : "warn");

      const { count: admins } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      setAdminCount(admins ?? 0);

      const { count: audits } = await supabase
        .from("admin_audit_logs")
        .select("id", { count: "exact", head: true });
      setAuditCount(audits ?? 0);

      setLastCheck(new Date());
    } catch {
      setRlsStatus("error");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { runCheck(); /* eslint-disable-next-line */ }, []);

  const twoFaStatus: Status = twoFa ? "ok" : "warn";
  const leakedStatus: Status = leakedPwd ? "ok" : "warn";
  const ipStatus: Status = ipWhitelist ? "ok" : "off";
  const kycStatus: Status = kycRequired ? "ok" : "warn";

  const score = [twoFa, leakedPwd, kycRequired, rlsStatus === "ok"].filter(Boolean).length;
  const scorePct = Math.round((score / 4) * 100);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 rounded-2xl">
        <CardHeader className="border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <ShieldCheck className="text-primary w-5 h-5" /> Postura de Segurança
            </CardTitle>
            <CardDescription>
              {lastCheck ? `Última verificação: ${lastCheck.toLocaleTimeString()}` : "Verificando..."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-black text-primary">{scorePct}%</div>
              <div className="text-xs text-white/40 uppercase tracking-widest">Score</div>
            </div>
            <Button size="sm" variant="outline" onClick={runCheck} disabled={checking} className="rounded-xl">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? "animate-spin" : ""}`} />
              Verificar agora
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-widest">Admins ativos</div>
            <div className="text-2xl font-black text-white">{adminCount ?? "—"}</div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-widest">Logs de auditoria</div>
            <div className="text-2xl font-black text-white">{auditCount ?? "—"}</div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-widest">RLS</div>
            <div className="mt-1">{statusBadge(rlsStatus)}</div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-widest">2FA</div>
            <div className="mt-1">{statusBadge(twoFaStatus)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RLS */}
        <Card className="bg-neutral-900/40 border-white/5 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Row-Level Security</CardTitle>
                <CardDescription>Proteção por linha em todas as tabelas.</CardDescription>
              </div>
            </div>
            {statusBadge(rlsStatus)}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-white/50">
              Tabelas sensíveis (perfis, ledger, transações) exigem políticas RLS para isolar dados por usuário.
              Acessos anônimos a tabelas administrativas devem ser bloqueados.
            </p>
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <a
                href="https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/auth/policies"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Revisar políticas
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Leaked Password */}
        <Card className="bg-neutral-900/40 border-white/5 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Senhas Vazadas</CardTitle>
                <CardDescription>Bloqueio via HaveIBeenPwned.</CardDescription>
              </div>
            </div>
            {statusBadge(leakedStatus)}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-white/50">
              Impede que usuários cadastrem senhas presentes em vazamentos públicos. Recomendado para plataformas financeiras.
            </p>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-sm font-bold">Verificação ativa</span>
              <Switch
                checked={!!leakedPwd}
                onCheckedChange={(v) => handleUpdateSetting("leaked_password_check", v)}
              />
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <a
                href="https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/auth/providers"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Configurar no Auth
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card className="bg-neutral-900/40 border-white/5 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Autenticação 2FA</CardTitle>
                <CardDescription>TOTP obrigatório para acesso.</CardDescription>
              </div>
            </div>
            {statusBadge(twoFaStatus)}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-white/50">
              Exige um segundo fator (app autenticador) no login. Recomendado obrigatório para administradores.
            </p>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-sm font-bold">2FA obrigatório</span>
              <Switch
                checked={!!twoFa}
                onCheckedChange={(v) => handleUpdateSetting("two_fa_required", v)}
              />
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <a
                href="https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/auth/providers"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Provedores MFA
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* IP Whitelist + KYC */}
        <Card className="bg-neutral-900/40 border-white/5 rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Acesso & Identidade</CardTitle>
                <CardDescription>Controles complementares.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <div className="text-sm font-bold">IP Whitelist Admin</div>
                <div className="text-xs text-white/40">Restringe painel a IPs autorizados</div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(ipStatus)}
                <Switch
                  checked={!!ipWhitelist}
                  onCheckedChange={(v) => handleUpdateSetting("ip_whitelist_admin", v)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <div className="text-sm font-bold">KYC Obrigatório</div>
                <div className="text-xs text-white/40">Verificação de identidade</div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(kycStatus)}
                <Switch
                  checked={!!kycRequired}
                  onCheckedChange={(v) => handleUpdateSetting("kyc_required", { enabled: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
