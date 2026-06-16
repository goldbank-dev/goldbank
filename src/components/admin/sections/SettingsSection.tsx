import { 
  Settings, Shield, Lock, Bell, Globe, Save, Plug, Mail, 
  Brain, CreditCard, Database, Coins, Vault, FileCheck,
  AlertTriangle, CheckCircle2, KeyRound, Zap, Users
} from "lucide-react";
import { SecretsManagement } from "./SecretsManagement";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IntegrationStatusCards } from "./IntegrationStatusCards";
import { SecurityStatusCards } from "./SecurityStatusCards";

interface SettingsSectionProps {
  systemSettings: any;
  handleUpdateSetting: (key: string, value: any) => void;
}

// Helper to safely parse JSON values from system_settings
const parseVal = (raw: any, fallback: any) => {
  if (raw === undefined || raw === null) return fallback;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return raw;
  }
};

const SettingCard = ({ icon: Icon, title, description, children }: any) => (
  <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 rounded-2xl shadow-xl overflow-hidden">
    <CardHeader className="border-b border-white/5 bg-white/5">
      <CardTitle className="text-lg flex items-center gap-2 font-bold">
        <Icon className="text-primary w-5 h-5" /> {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="p-6 space-y-6">{children}</CardContent>
  </Card>
);

const ToggleRow = ({ label, hint, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
    <div className="space-y-0.5 pr-4">
      <Label className="text-sm font-bold group-hover:text-primary transition-colors">{label}</Label>
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
    <Switch checked={!!checked} onCheckedChange={onChange} />
  </div>
);

const NumberField = ({ label, settingKey, value, onSave, placeholder, suffix }: any) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold text-white/50 uppercase tracking-widest">
      {label} {suffix && <span className="text-white/30 normal-case">({suffix})</span>}
    </Label>
    <Input
      type="number"
      placeholder={placeholder}
      className="bg-white/5 border-white/10 focus:border-primary/50 transition-all rounded-xl h-11"
      defaultValue={value}
      onBlur={(e) => onSave(settingKey, Number(e.target.value))}
    />
  </div>
);

const TextField = ({ label, settingKey, value, onSave, placeholder }: any) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold text-white/50 uppercase tracking-widest">{label}</Label>
    <Input
      placeholder={placeholder}
      className="bg-white/5 border-white/10 focus:border-primary/50 transition-all rounded-xl h-11"
      defaultValue={value}
      onBlur={(e) => onSave(settingKey, e.target.value)}
    />
  </div>
);

const StatusPill = ({ active, label }: { active: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={
      active
        ? "border-green-500/30 bg-green-500/10 text-green-400 font-bold"
        : "border-white/10 bg-white/5 text-white/40"
    }
  >
    {active ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
    {label}
  </Badge>
);

export const SettingsSection = ({ systemSettings, handleUpdateSetting }: SettingsSectionProps) => {
  const s = systemSettings || {};

  // Parse all settings with sensible defaults for a backed-currency platform
  const platformName = parseVal(s.platform_name, "Santek");
  const defaultCurrency = parseVal(s.default_currency, "BRL");
  const supportEmail = parseVal(s.support_email, "suporte@santek.com");
  const maintenanceMode = parseVal(s.maintenance_mode, false);
  const allowRegistrations = parseVal(s.allow_registrations, true);

  // Financial
  const minDeposit = parseVal(s.min_deposit, 50);
  const maxDeposit = parseVal(s.max_deposit, 100000);
  const depositFee = parseVal(s.deposit_fee, 0);
  const minWithdrawal = parseVal(s.min_withdrawal, 50);
  const maxWithdrawalDaily = parseVal(s.max_withdrawal_daily, 25000);
  const withdrawalFee = parseVal(s.withdrawal_fee, 1.5);
  const transferFee = parseVal(s.transfer_fee, 0);
  const tradingFee = parseVal(s.trading_fee, 0.5);
  const minTrade = parseVal(s.min_trade_amount, 10);

  // Security
  const kycRequired = parseVal(s.kyc_required?.enabled ?? s.kyc_required, false);
  const twoFaRequired = parseVal(s.two_fa_required, false);
  const leakedPasswordCheck = parseVal(s.leaked_password_check, false);
  const sessionTimeout = parseVal(s.session_timeout_minutes, 60);
  const ipWhitelistAdmin = parseVal(s.ip_whitelist_admin, false);
  const rateLimitPerMin = parseVal(s.rate_limit_per_min, 60);

  // Reserves & lastro
  const reserveRatioMin = parseVal(s.reserve_ratio_min, 100);
  const auditFrequencyDays = parseVal(s.audit_frequency_days, 30);
  const custodyProvider = parseVal(s.custody_provider, "Cofre Institucional SP");
  const tokenSymbol = parseVal(s.token_symbol, "GTK");
  const backingAsset = parseVal(s.backing_asset, "Ouro 999.9");
  const publishProofOfReserves = parseVal(s.publish_proof_of_reserves, true);

  // Integrations toggles
  const aiEnabled = parseVal(s.integration_ai_enabled, true);
  const emailEnabled = parseVal(s.integration_email_enabled, true);
  const stripeEnabled = parseVal(s.integration_stripe_enabled, false);
  const pixEnabled = parseVal(s.integration_pix_enabled, true);
  const webhooksEnabled = parseVal(s.integration_webhooks_enabled, false);
  const webhookUrl = parseVal(s.integration_webhook_url, "");

  // Notifications
  const notifyEmail = parseVal(s.notify_email, true);
  const notifySms = parseVal(s.notify_sms, false);
  const notifyPush = parseVal(s.notify_push, true);
  const notifyKycUpdates = parseVal(s.notify_kyc_updates, true);
  const notifyLargeWithdraw = parseVal(s.notify_large_withdraw, true);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-neutral-900/60 border border-white/5 rounded-2xl p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs">
            <Globe className="w-3.5 h-3.5 mr-1.5" /> Geral
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs">
            <Plug className="w-3.5 h-3.5 mr-1.5" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs">
            <Shield className="w-3.5 h-3.5 mr-1.5" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="financial" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="reserves" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs">
            <Vault className="w-3.5 h-3.5 mr-1.5" /> Lastro
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs">
            <Bell className="w-3.5 h-3.5 mr-1.5" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="secrets" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs">
            <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Secrets
          </TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <SettingCard icon={Globe} title="Configurações Gerais" description="Parâmetros fundamentais do ecossistema.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField label="Nome da Plataforma" settingKey="platform_name" value={platformName} onSave={handleUpdateSetting} placeholder="Santek" />
              <TextField label="Moeda Padrão" settingKey="default_currency" value={defaultCurrency} onSave={handleUpdateSetting} placeholder="BRL" />
              <TextField label="Email de Suporte" settingKey="support_email" value={supportEmail} onSave={handleUpdateSetting} placeholder="suporte@..." />
              <TextField label="Símbolo do Token" settingKey="token_symbol" value={tokenSymbol} onSave={handleUpdateSetting} placeholder="GTK" />
            </div>
            <Separator className="bg-white/5" />
            <div className="space-y-4">
              <ToggleRow
                label="Modo de Manutenção"
                hint="Bloqueia acesso público à plataforma."
                checked={maintenanceMode}
                onChange={(v: boolean) => handleUpdateSetting("maintenance_mode", v)}
              />
              <ToggleRow
                label="Novos Cadastros"
                hint="Permite criação de novas contas."
                checked={allowRegistrations}
                onChange={(v: boolean) => handleUpdateSetting("allow_registrations", v)}
              />
            </div>
          </SettingCard>
        </TabsContent>

        {/* INTEGRATIONS */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          <IntegrationStatusCards systemSettings={systemSettings} handleUpdateSetting={handleUpdateSetting} />
          {webhooksEnabled && (
            <SettingCard icon={Zap} title="Configuração de Webhook" description="URL que receberá os eventos POST.">
              <TextField label="Webhook URL" settingKey="integration_webhook_url" value={webhookUrl} onSave={handleUpdateSetting} placeholder="https://api.exemplo.com/webhook" />
            </SettingCard>
          )}
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <SecurityStatusCards systemSettings={systemSettings} handleUpdateSetting={handleUpdateSetting} />
          <SettingCard icon={Shield} title="Políticas de Segurança" description="Controles de autenticação e proteção da plataforma.">
            <div className="space-y-4">
              <ToggleRow
                label="KYC Obrigatório"
                hint="Exige verificação de identidade para operar."
                checked={kycRequired}
                onChange={(v: boolean) => handleUpdateSetting("kyc_required", { enabled: v })}
              />
              <ToggleRow
                label="2FA Obrigatório"
                hint="Autenticação em dois fatores para todos usuários."
                checked={twoFaRequired}
                onChange={(v: boolean) => handleUpdateSetting("two_fa_required", v)}
              />
              <ToggleRow
                label="Verificação de Senhas Vazadas"
                hint="Bloqueia senhas presentes no HaveIBeenPwned."
                checked={leakedPasswordCheck}
                onChange={(v: boolean) => handleUpdateSetting("leaked_password_check", v)}
              />
              <ToggleRow
                label="IP Whitelist (Admin)"
                hint="Restringe acesso administrativo a IPs conhecidos."
                checked={ipWhitelistAdmin}
                onChange={(v: boolean) => handleUpdateSetting("ip_whitelist_admin", v)}
              />
            </div>
            <Separator className="bg-white/5" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberField label="Timeout de Sessão" suffix="minutos" settingKey="session_timeout_minutes" value={sessionTimeout} onSave={handleUpdateSetting} placeholder="60" />
              <NumberField label="Rate Limit" suffix="req/min por IP" settingKey="rate_limit_per_min" value={rateLimitPerMin} onSave={handleUpdateSetting} placeholder="60" />
            </div>
          </SettingCard>
        </TabsContent>

        {/* FINANCIAL */}
        <TabsContent value="financial" className="mt-6 space-y-6">
          <SettingCard icon={CreditCard} title="Limites de Operação" description="Valores mínimos e máximos para movimentações financeiras.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberField label="Depósito Mínimo" suffix="BRL" settingKey="min_deposit" value={minDeposit} onSave={handleUpdateSetting} placeholder="50" />
              <NumberField label="Depósito Máximo" suffix="BRL" settingKey="max_deposit" value={maxDeposit} onSave={handleUpdateSetting} placeholder="100000" />
              <NumberField label="Saque Mínimo" suffix="BRL" settingKey="min_withdrawal" value={minWithdrawal} onSave={handleUpdateSetting} placeholder="50" />
              <NumberField label="Saque Diário Máximo" suffix="BRL" settingKey="max_withdrawal_daily" value={maxWithdrawalDaily} onSave={handleUpdateSetting} placeholder="25000" />
              <NumberField label="Negociação Mínima" suffix="BRL" settingKey="min_trade_amount" value={minTrade} onSave={handleUpdateSetting} placeholder="10" />
            </div>
          </SettingCard>
          <SettingCard icon={Coins} title="Taxas e Tarifas" description="Defina o percentual cobrado por operação.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberField label="Taxa de Depósito" suffix="%" settingKey="deposit_fee" value={depositFee} onSave={handleUpdateSetting} placeholder="0" />
              <NumberField label="Taxa de Saque" suffix="%" settingKey="withdrawal_fee" value={withdrawalFee} onSave={handleUpdateSetting} placeholder="1.5" />
              <NumberField label="Taxa de Transferência" suffix="%" settingKey="transfer_fee" value={transferFee} onSave={handleUpdateSetting} placeholder="0" />
              <NumberField label="Taxa de Negociação" suffix="%" settingKey="trading_fee" value={tradingFee} onSave={handleUpdateSetting} placeholder="0.5" />
            </div>
          </SettingCard>
        </TabsContent>

        {/* RESERVES / LASTRO */}
        <TabsContent value="reserves" className="mt-6 space-y-6">
          <SettingCard icon={Vault} title="Lastro & Custódia" description="Configurações de reserva física e auditoria do token.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField label="Ativo de Lastro" settingKey="backing_asset" value={backingAsset} onSave={handleUpdateSetting} placeholder="Ouro 999.9" />
              <TextField label="Custodiante" settingKey="custody_provider" value={custodyProvider} onSave={handleUpdateSetting} placeholder="Cofre Institucional SP" />
              <NumberField label="Reserva Mínima" suffix="% do circulante" settingKey="reserve_ratio_min" value={reserveRatioMin} onSave={handleUpdateSetting} placeholder="100" />
              <NumberField label="Frequência de Auditoria" suffix="dias" settingKey="audit_frequency_days" value={auditFrequencyDays} onSave={handleUpdateSetting} placeholder="30" />
            </div>
            <Separator className="bg-white/5" />
            <ToggleRow
              label="Publicar Proof of Reserves"
              hint="Exibe relatório público de reservas no painel do cliente."
              checked={publishProofOfReserves}
              onChange={(v: boolean) => handleUpdateSetting("publish_proof_of_reserves", v)}
            />
          </SettingCard>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <SettingCard icon={Bell} title="Canais de Notificação" description="Como os usuários e admins recebem alertas.">
            <div className="space-y-4">
              <ToggleRow label="Email" hint="Notificações por email." checked={notifyEmail} onChange={(v: boolean) => handleUpdateSetting("notify_email", v)} />
              <ToggleRow label="SMS" hint="Notificações críticas via SMS." checked={notifySms} onChange={(v: boolean) => handleUpdateSetting("notify_sms", v)} />
              <ToggleRow label="Push" hint="Notificações push no app." checked={notifyPush} onChange={(v: boolean) => handleUpdateSetting("notify_push", v)} />
            </div>
            <Separator className="bg-white/5" />
            <div className="space-y-4">
              <ToggleRow label="Atualizações de KYC" hint="Avisar usuário em mudanças de status." checked={notifyKycUpdates} onChange={(v: boolean) => handleUpdateSetting("notify_kyc_updates", v)} />
              <ToggleRow label="Saques de Alto Valor" hint="Alertar admin sobre saques acima do limite." checked={notifyLargeWithdraw} onChange={(v: boolean) => handleUpdateSetting("notify_large_withdraw", v)} />
            </div>
          </SettingCard>
        </TabsContent>
        {/* SECRETS */}
        <TabsContent value="secrets" className="mt-6 space-y-6">
          <SecretsManagement />
        </TabsContent>
      </Tabs>

      {/* Quick actions footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 rounded-2xl p-6">
          <h3 className="font-black text-primary uppercase tracking-tighter text-base mb-2 italic flex items-center gap-2">
            <Lock className="w-4 h-4" /> Bloqueio Global
          </h3>
          <p className="text-xs text-primary/60 mb-4">Ative o modo de manutenção para suspender operações.</p>
          <Button
            className="w-full bg-primary text-black font-bold rounded-xl"
            onClick={() => handleUpdateSetting("maintenance_mode", !maintenanceMode)}
          >
            {maintenanceMode ? "Desativar Manutenção" : "Ativar Manutenção"}
          </Button>
        </Card>
        <Card className="bg-neutral-900/40 border-white/5 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <KeyRound className="text-blue-500 w-4 h-4" /> Gerenciar Secrets
          </h3>
          <p className="text-xs text-white/40 mb-4">Chaves de API e credenciais ficam no Lovable Cloud.</p>
          <Button asChild variant="secondary" className="w-full rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold">
            <a href="https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/settings/functions" target="_blank" rel="noreferrer">Abrir Secrets</a>
          </Button>
        </Card>
        <Card className="bg-neutral-900/40 border-white/5 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <Save className="text-green-500 w-4 h-4" /> Backup
          </h3>
          <p className="text-xs text-white/40 mb-4">Snapshots automáticos diários do banco.</p>
          <Button asChild variant="secondary" className="w-full rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold">
            <a href="https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/database/backups" target="_blank" rel="noreferrer">Ver Backups</a>
          </Button>
        </Card>
      </div>
    </div>
  );
};
