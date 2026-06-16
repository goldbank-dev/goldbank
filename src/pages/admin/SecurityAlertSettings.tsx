import { useEffect, useState } from "react";
import { Bell, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const KEYS = [
  "security_alert_webhook_url",
  "security_alert_email",
  "security_alert_threshold",
  "security_alert_window_minutes",
  "security_alert_cooldown_minutes",
] as const;

type Settings = {
  webhook: string;
  email: string;
  threshold: number;
  window: number;
  cooldown: number;
};

const SecurityAlertSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    webhook: "",
    email: "",
    threshold: 25,
    window: 15,
    cooldown: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("key,value")
        .in("key", KEYS as unknown as string[]);
      const map = new Map((data ?? []).map((r: any) => [r.key, r.value]));
      const parse = (v: any) =>
        typeof v === "string" ? v : v == null ? "" : String(v);
      setSettings({
        webhook: parse(map.get("security_alert_webhook_url")),
        email: parse(map.get("security_alert_email")),
        threshold: Number(map.get("security_alert_threshold") ?? 25),
        window: Number(map.get("security_alert_window_minutes") ?? 15),
        cooldown: Number(map.get("security_alert_cooldown_minutes") ?? 15),
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const updates: { key: string; value: any }[] = [
      { key: "security_alert_webhook_url", value: settings.webhook.trim() },
      { key: "security_alert_email", value: settings.email.trim() },
      { key: "security_alert_threshold", value: Number(settings.threshold) },
      { key: "security_alert_window_minutes", value: Number(settings.window) },
      { key: "security_alert_cooldown_minutes", value: Number(settings.cooldown) },
    ];
    for (const u of updates) {
      const { error } = await supabase
        .from("system_settings")
        .update({ value: u.value, updated_by: (await supabase.auth.getUser()).data.user?.id })
        .eq("key", u.key);
      if (error) {
        toast.error(`Falha ao salvar ${u.key}: ${error.message}`);
        setSaving(false);
        return;
      }
    }
    toast.success("Configurações de alerta salvas");
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("security-alert-monitor", {
      body: { source: "manual-test" },
    });
    setTesting(false);
    if (error) return toast.error(`Erro: ${error.message}`);
    const info = data as any;
    if (info?.triggered) {
      toast.success(
        `Alerta disparado: ${info.event_count} eventos. Webhook: ${info.webhook_status}, E-mail: ${info.email_status}`,
      );
    } else if (info?.skipped === "cooldown") {
      toast.info("Em cooldown — aguarde o próximo intervalo.");
    } else {
      toast.info(
        `Sem alerta: ${info?.event_count ?? 0} eventos (limite ${info?.threshold}/${info?.window_minutes}min)`,
      );
    }
  };

  return (
    <Card className="bg-neutral-900 border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-400" />
          Alertas de eventos bloqueados
        </CardTitle>
        <p className="text-xs text-white/60">
          Verificação automática a cada 5 minutos. Quando o número de eventos
          <code className="mx-1">*_BLOCKED</code> ultrapassar o limite na janela
          configurada, dispara webhook e/ou e-mail.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs text-white/60">Webhook URL (POST JSON)</Label>
          <Input
            disabled={loading}
            value={settings.webhook}
            onChange={(e) => setSettings({ ...settings, webhook: e.target.value })}
            placeholder="https://hooks.slack.com/... ou seu endpoint"
            className="bg-neutral-950 border-white/10"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs text-white/60">E-mail destinatário</Label>
          <Input
            disabled={loading}
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            placeholder="seguranca@suaempresa.com"
            className="bg-neutral-950 border-white/10"
          />
          <p className="text-[11px] text-white/40">
            Envio de e-mail requer um domínio configurado em Lovable Cloud →
            Emails. Sem isso, o alerta por webhook continua funcionando.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Limite (eventos)</Label>
          <Input
            type="number"
            min={1}
            disabled={loading}
            value={settings.threshold}
            onChange={(e) => setSettings({ ...settings, threshold: Number(e.target.value) })}
            className="bg-neutral-950 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Janela (min)</Label>
          <Input
            type="number"
            min={1}
            disabled={loading}
            value={settings.window}
            onChange={(e) => setSettings({ ...settings, window: Number(e.target.value) })}
            className="bg-neutral-950 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Cooldown (min)</Label>
          <Input
            type="number"
            min={1}
            disabled={loading}
            value={settings.cooldown}
            onChange={(e) => setSettings({ ...settings, cooldown: Number(e.target.value) })}
            className="bg-neutral-950 border-white/10"
          />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-end pt-2 flex-wrap">
          <Button variant="ghost" asChild>
            <a href="/sanpainel/security-alerts">Ver histórico de disparos</a>
          </Button>
          <Button variant="outline" onClick={test} disabled={testing}>
            <Send className="h-4 w-4 mr-2" />
            {testing ? "Verificando…" : "Verificar agora"}
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityAlertSettings;
