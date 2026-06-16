import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ShieldAlert, RefreshCw, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SecurityAlertSettings from "./SecurityAlertSettings";

const EVENT_TYPES = [
  { value: "all", label: "Todos os eventos" },
  { value: "KYC_PROBE_BLOCKED", label: "KYC Probe Bloqueado" },
  { value: "KYC_INSERT_BLOCKED", label: "KYC Insert Bloqueado" },
  { value: "FIN_REQUEST_INSERT_BLOCKED", label: "Pedido Financeiro Bloqueado" },
];

const SecurityAuditLogPage = () => {
  const navigate = useNavigate();
  const [eventType, setEventType] = useState<string>("all");
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const [requestId, setRequestId] = useState<string>("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["security-audit-log", eventType, from?.toISOString(), to?.toISOString(), requestId],
    queryFn: async () => {
      let query = supabase
        .from("security_audit_log")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(500);

      if (eventType !== "all") query = query.eq("event_type", eventType);
      if (from) query = query.gte("occurred_at", from.toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query = query.lte("occurred_at", end.toISOString());
      }
      if (requestId.trim()) query = query.eq("request_id", requestId.trim());

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (data ?? []).forEach((row: any) => {
      map.set(row.event_type, (map.get(row.event_type) ?? 0) + 1);
    });
    return map;
  }, [data]);

  const clearFilters = () => {
    setEventType("all");
    setFrom(undefined);
    setTo(undefined);
    setRequestId("");
  };

  const exportCsv = () => {
    const rows = data ?? [];
    if (rows.length === 0) return;

    const headers = [
      "occurred_at",
      "request_id",
      "event_type",
      "actor_id",
      "target_table",
      "target_function",
      "reason",
      "attempted_payload",
      "metadata",
    ];

    const escape = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(","),
      ...rows.map((r: any) =>
        headers.map((h) => escape(r[h])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security_audit_log_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/sanpainel")}
          className="hover:bg-white/5 text-white/60"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </Button>

        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold">Trilha de Auditoria de Segurança</h1>
            <p className="text-sm text-white/60">
              Registros de tentativas bloqueadas por RLS e funções de segurança. Dados sensíveis são automaticamente mascarados.
            </p>
          </div>
        </div>

        <SecurityAlertSettings />

        <Card className="bg-neutral-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Tipo de evento</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="bg-neutral-950 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60">De</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-neutral-950 border-white/10",
                      !from && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {from ? format(from, "dd/MM/yyyy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={from}
                    onSelect={setFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60">Até</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-neutral-950 border-white/10",
                      !to && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {to ? format(to, "dd/MM/yyyy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={to}
                    onSelect={setTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60">Request ID</label>
              <Input
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="Correlation id"
                className="bg-neutral-950 border-white/10"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Limpar
              </Button>
              <Button onClick={() => refetch()} disabled={isFetching} className="flex-1">
                <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
                Atualizar
              </Button>
              <Button
                variant="secondary"
                onClick={exportCsv}
                disabled={!data || data.length === 0}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EVENT_TYPES.filter((t) => t.value !== "all").map((t) => (
            <Card key={t.value} className="bg-neutral-900 border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-white/60">{t.label}</p>
                <p className="text-2xl font-bold mt-1">{counts.get(t.value) ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-neutral-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-base">
              Eventos ({data?.length ?? 0}{(data?.length ?? 0) >= 500 ? "+" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/60">Data/Hora</TableHead>
                    <TableHead className="text-white/60">Request ID</TableHead>
                    <TableHead className="text-white/60">Tipo</TableHead>
                    <TableHead className="text-white/60">Actor ID</TableHead>
                    <TableHead className="text-white/60">Tabela / Função</TableHead>
                    <TableHead className="text-white/60">Motivo</TableHead>
                    <TableHead className="text-white/60">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-white/40 py-8">
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : (data?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-white/40 py-8">
                        Nenhum evento encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data!.map((row: any) => (
                      <TableRow key={row.id} className="border-white/10">
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(row.occurred_at), "dd/MM/yy HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-white/70">
                          <button
                            type="button"
                            onClick={() => setRequestId(row.request_id ?? "")}
                            className="hover:text-amber-300 underline-offset-2 hover:underline"
                            title={row.request_id ?? "—"}
                          >
                            {row.request_id ? row.request_id.slice(0, 12) + "…" : "—"}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs border-amber-400/30 text-amber-200">
                            {row.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-white/70">
                          {row.actor_id ? row.actor_id.slice(0, 8) + "…" : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-white/70">
                          {row.target_table || row.target_function || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-white/80 max-w-xs">
                          {row.reason}
                        </TableCell>
                        <TableCell className="text-xs">
                          <pre className="text-xs text-white/60 max-w-xs overflow-x-auto">
                            {row.attempted_payload
                              ? JSON.stringify(row.attempted_payload, null, 0)
                              : "—"}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityAuditLogPage;
