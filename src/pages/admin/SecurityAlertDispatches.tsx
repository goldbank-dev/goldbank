import { useState, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import { ChevronLeft, RefreshCw, Bell, Search, Calendar as CalendarIcon, FilterX, Download } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Dispatch = {
  id: string;
  dispatched_at: string;
  event_count: number;
  window_minutes: number;
  threshold: number;
  channels: string[] | null;
  webhook_status: string | null;
  email_status: string | null;
  details: Record<string, unknown> | null;
};

const statusVariant = (status: string | null) => {
  if (!status) return "secondary" as const;
  const s = status.toLowerCase();
  if (s.includes("success") || s.startsWith("2")) return "default" as const;
  if (s.includes("skip") || s.includes("disabled")) return "secondary" as const;
  return "destructive" as const;
};

const SecurityAlertDispatches = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [webhookStatus, setWebhookStatus] = useState<string>("all");
  const [emailStatus, setEmailStatus] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selected, setSelected] = useState<Dispatch | null>(null);

  const PAGE_SIZE = 50;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["security-alert-dispatches", search, webhookStatus, emailStatus, channel, date],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("security_alert_dispatches")
        .select("*", { count: "exact" })
        .order("dispatched_at", { ascending: false });

      if (search && search.match(/^[0-9a-fA-F-]{8,}$/)) {
        query = query.eq("id", search);
      }

      if (webhookStatus !== "all") {
        if (webhookStatus === "success") {
          query = query.ilike("webhook_status", "%success%");
        } else if (webhookStatus === "error") {
          query = query.not("webhook_status", "ilike", "%success%").not("webhook_status", "is", null);
        } else if (webhookStatus === "empty") {
          query = query.is("webhook_status", null);
        }
      }

      if (emailStatus !== "all") {
        if (emailStatus === "success") {
          query = query.ilike("email_status", "%success%");
        } else if (emailStatus === "error") {
          query = query.not("email_status", "ilike", "%success%").not("email_status", "is", null);
        } else if (emailStatus === "empty") {
          query = query.is("email_status", null);
        }
      }

      if (channel !== "all") {
        query = query.contains("channels", [channel]);
      }

      if (date) {
        query = query.gte("dispatched_at", startOfDay(date).toISOString());
        query = query.lte("dispatched_at", endOfDay(date).toISOString());
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return {
        rows: (data ?? []) as unknown as Dispatch[],
        nextPage: (data?.length ?? 0) === PAGE_SIZE ? (pageParam as number) + 1 : null,
        total: count ?? 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const rows = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearFilters = () => {
    setSearch("");
    setWebhookStatus("all");
    setEmailStatus("all");
    setChannel("all");
    setDate(undefined);
  };

  const [exporting, setExporting] = useState(false);
  const exportCSV = async () => {
    setExporting(true);
    try {
      // Re-run the filtered query with no pagination cap so the CSV reflects ALL matches.
      let query = supabase
        .from("security_alert_dispatches")
        .select("id, dispatched_at, event_count, threshold, window_minutes, channels, webhook_status, email_status")
        .order("dispatched_at", { ascending: false });

      if (search && search.match(/^[0-9a-fA-F-]{8,}$/)) query = query.eq("id", search);
      if (webhookStatus === "success") query = query.ilike("webhook_status", "%success%");
      else if (webhookStatus === "error") query = query.not("webhook_status", "ilike", "%success%").not("webhook_status", "is", null);
      else if (webhookStatus === "empty") query = query.is("webhook_status", null);
      if (emailStatus === "success") query = query.ilike("email_status", "%success%");
      else if (emailStatus === "error") query = query.not("email_status", "ilike", "%success%").not("email_status", "is", null);
      else if (emailStatus === "empty") query = query.is("email_status", null);
      if (channel !== "all") query = query.contains("channels", [channel]);
      if (date) {
        query = query.gte("dispatched_at", startOfDay(date).toISOString());
        query = query.lte("dispatched_at", endOfDay(date).toISOString());
      }

      const { data: all, error } = await query.limit(10000);
      if (error) throw error;
      if (!all || all.length === 0) {
        toast.info("Nenhum disparo para exportar com os filtros atuais.");
        return;
      }

      const escape = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const header = ["id", "timestamp", "eventos", "limite", "janela_min", "canais", "webhook_status", "email_status"];
      const lines = [header.join(",")];
      for (const r of all as any[]) {
        lines.push([
          escape(r.id),
          escape(format(new Date(r.dispatched_at), "yyyy-MM-dd HH:mm:ss")),
          escape(r.event_count),
          escape(r.threshold),
          escape(r.window_minutes),
          escape(Array.isArray(r.channels) ? r.channels.join("|") : ""),
          escape(r.webhook_status ?? ""),
          escape(r.email_status ?? ""),
        ].join(","));
      }

      const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-alert-dispatches-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${all.length} registro(s) exportado(s).`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sanpainel/security-audit")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Histórico de alertas</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={exporting}>
            <Download className={`h-4 w-4 mr-2 ${exporting ? "animate-pulse" : ""}`} />
            {exporting ? "Exportando…" : "Exportar CSV"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="bg-neutral-900 border-white/10">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID..."
                className="pl-9 bg-neutral-950 border-white/10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={webhookStatus} onValueChange={setWebhookStatus}>
              <SelectTrigger className="bg-neutral-950 border-white/10">
                <SelectValue placeholder="Status Webhook" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Webhook: Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="empty">Não enviado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={emailStatus} onValueChange={setEmailStatus}>
              <SelectTrigger className="bg-neutral-950 border-white/10">
                <SelectValue placeholder="Status E-mail" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">E-mail: Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="empty">Não enviado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="bg-neutral-950 border-white/10">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Canal: Todos</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-neutral-950 border-white/10",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : <span>Filtrar data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-white/40 hover:text-white">
              <FilterX className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Disparos registrados</CardTitle>
          {!isLoading && (
            <span className="text-xs text-white/50">
              Exibindo {rows.length} de {total}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
              <p className="text-muted-foreground">Nenhum alerta encontrado com os filtros atuais.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="text-white/60">Quando</TableHead>
                    <TableHead className="text-right text-white/60">Eventos</TableHead>
                    <TableHead className="text-right text-white/60">Limite/Janela</TableHead>
                    <TableHead className="text-white/60">Canais</TableHead>
                    <TableHead className="text-white/60">Webhook Status</TableHead>
                    <TableHead className="text-white/60">E-mail Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => {
                    const channels = Array.isArray(d.channels) ? d.channels : [];
                    return (
                      <TableRow
                        key={d.id}
                        className="border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setSelected(d)}
                      >
                        <TableCell className="whitespace-nowrap font-medium">
                          {format(new Date(d.dispatched_at), "dd/MM HH:mm:ss")}
                          <div className="text-[10px] text-white/40 font-mono mt-0.5">{d.id.split("-")[0]}...</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            {d.event_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-white/60">
                          {d.threshold} / {d.window_minutes}min
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {channels.length === 0 ? (
                              <span className="text-white/20 text-xs">—</span>
                            ) : (
                              channels.map((c) => (
                                <Badge key={String(c)} variant="outline" className="text-[10px] border-white/10 text-white/60">
                                  {String(c)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {d.webhook_status ? (
                            <Badge variant={statusVariant(d.webhook_status)} className="capitalize text-[10px]">
                              {d.webhook_status}
                            </Badge>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {d.email_status ? (
                            <Badge variant={statusVariant(d.email_status)} className="capitalize text-[10px]">
                              {d.email_status}
                            </Badge>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div ref={sentinelRef} className="h-1" />

              <div className="flex justify-center pt-4">
                {hasNextPage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Carregando…</>
                    ) : (
                      "Carregar mais"
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-white/40">Fim dos resultados</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl bg-neutral-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-400" />
              Detalhes do disparo
            </DialogTitle>
            {selected && (
              <DialogDescription className="font-mono text-xs text-white/50 break-all">
                {selected.id}
              </DialogDescription>
            )}
          </DialogHeader>

          {selected && (
            <ScrollArea className="max-h-[70vh] pr-3">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Quando" value={format(new Date(selected.dispatched_at), "dd/MM/yyyy HH:mm:ss")} />
                  <Field label="Eventos" value={String(selected.event_count)} />
                  <Field label="Limite" value={String(selected.threshold)} />
                  <Field label="Janela" value={`${selected.window_minutes} min`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded border border-white/10 p-3 bg-neutral-950">
                    <div className="text-[11px] text-white/50 mb-1">Webhook status</div>
                    {selected.webhook_status ? (
                      <Badge variant={statusVariant(selected.webhook_status)}>{selected.webhook_status}</Badge>
                    ) : (
                      <span className="text-white/30 text-xs">Não enviado</span>
                    )}
                  </div>
                  <div className="rounded border border-white/10 p-3 bg-neutral-950">
                    <div className="text-[11px] text-white/50 mb-1">E-mail status</div>
                    {selected.email_status ? (
                      <Badge variant={statusVariant(selected.email_status)}>{selected.email_status}</Badge>
                    ) : (
                      <span className="text-white/30 text-xs">Não enviado</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-white/50 mb-1">Canais utilizados</div>
                  <div className="flex flex-wrap gap-1">
                    {(selected.channels ?? []).length === 0 ? (
                      <span className="text-white/30 text-xs">Nenhum</span>
                    ) : (
                      (selected.channels ?? []).map((c) => (
                        <Badge key={String(c)} variant="outline" className="border-white/10 text-white/70">
                          {String(c)}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <DetailsBreakdown details={selected.details} />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border border-white/10 p-3 bg-neutral-950">
    <div className="text-[11px] text-white/50">{label}</div>
    <div className="text-sm font-medium mt-0.5">{value}</div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-white/50 mb-1">{title}</div>
    <pre className="text-[11px] bg-neutral-950 border border-white/10 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
      {children}
    </pre>
  </div>
);

const formatJSON = (v: unknown) => {
  try {
    if (typeof v === "string") return v;
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

const DetailsBreakdown = ({ details }: { details: Record<string, unknown> | null }) => {
  if (!details || Object.keys(details).length === 0) {
    return (
      <Section title="Detalhes brutos">
        <span className="text-white/30">Sem dados adicionais.</span>
      </Section>
    );
  }

  // Try to surface common known shapes
  const known = ["payload", "request", "webhook_response", "webhook_body", "email_response", "error", "errors", "attempt", "attempts", "cooldown", "cooldown_until", "next_attempt_at"];
  const surfaced: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (known.includes(k)) surfaced[k] = v;
    else rest[k] = v;
  }

  return (
    <div className="space-y-3">
      {Object.entries(surfaced).map(([k, v]) => (
        <Section key={k} title={k.replace(/_/g, " ")}>{formatJSON(v)}</Section>
      ))}
      {Object.keys(rest).length > 0 && (
        <Section title="Outros campos">{formatJSON(rest)}</Section>
      )}
    </div>
  );
};

export default SecurityAlertDispatches;
