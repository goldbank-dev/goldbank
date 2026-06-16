import { useState, useMemo, useEffect, useRef } from "react";
import { Coins, Plus, ExternalLink, Edit, Trash2, TrendingUp, Loader2, Search, X, RefreshCw, Pause, Play, History, ArrowRight, ShieldCheck, ShieldAlert, Clock, ArrowUp, ArrowDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TokensSectionProps {
  tokens: any[];
  onRefresh?: () => void;
}

interface TokenForm {
  id?: string;
  symbol: string;
  name: string;
  current_price: number;
  total_supply: number;
  circulating_supply: number;
  decimals: number;
  custody_location: string;
  audit_status: string;
  is_active: boolean;
}

const emptyForm: TokenForm = {
  symbol: "",
  name: "",
  current_price: 0,
  total_supply: 0,
  circulating_supply: 0,
  decimals: 2,
  custody_location: "Cofre Institucional SP",
  audit_status: "verified",
  is_active: true,
};

export const TokensSection = ({ tokens, onRefresh }: TokensSectionProps) => {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any | null>(null);
  const [form, setForm] = useState<TokenForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const PREFS_KEY = "admin.tokens.prefs.v1";
  const loadPrefs = () => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(PREFS_KEY) : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };
  const savedPrefs = loadPrefs();

  const [searchQuery, setSearchQuery] = useState<string>(savedPrefs.searchQuery ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(savedPrefs.statusFilter ?? "all");
  const [auditFilter, setAuditFilter] = useState<"all" | "verified" | "pending" | "failed">(savedPrefs.auditFilter ?? "all");
  const [custodyFilter, setCustodyFilter] = useState<string>(savedPrefs.custodyFilter ?? "all");
  const [sortBy, setSortBy] = useState<"symbol" | "name" | "created_at" | "current_price">(savedPrefs.sortBy ?? "created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(savedPrefs.sortDir ?? "desc");
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
      setLastRefreshed(new Date());
      setCountdown(refreshInterval);
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (autoRefresh && refreshInterval > 0) {
      setCountdown(refreshInterval);
      intervalRef.current = setInterval(() => {
        handleRefresh();
      }, refreshInterval * 1000);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => (c <= 1 ? refreshInterval : c - 1));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]);

  const custodyOptions = useMemo(() => {
    const set = new Set<string>();
    tokens.forEach((t) => { if (t.custody_location) set.add(t.custody_location); });
    return Array.from(set).sort();
  }, [tokens]);

  const filteredTokens = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = tokens.filter((t) => {
      const matchesSearch = !q || t.symbol?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && t.is_active) ||
        (statusFilter === "inactive" && !t.is_active);
      const matchesAudit = auditFilter === "all" || t.audit_status === auditFilter;
      const matchesCustody = custodyFilter === "all" || t.custody_location === custodyFilter;
      return matchesSearch && matchesStatus && matchesAudit && matchesCustody;
    });

    const sorted = [...filtered].sort((a, b) => {
      let av: any = a[sortBy];
      let bv: any = b[sortBy];
      if (sortBy === "created_at") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else if (sortBy === "current_price") {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else {
        av = (av || "").toString().toLowerCase();
        bv = (bv || "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tokens, searchQuery, statusFilter, auditFilter, custodyFilter, sortBy, sortDir]);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(savedPrefs.pageSize ?? 6);

  // Persist filters/sort/pageSize to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        searchQuery, statusFilter, auditFilter, custodyFilter, sortBy, sortDir, pageSize,
      }));
    } catch {}
  }, [searchQuery, statusFilter, auditFilter, custodyFilter, sortBy, sortDir, pageSize]);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredTokens.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTokens = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTokens.slice(start, start + pageSize);
  }, [filteredTokens, safePage, pageSize]);

  // Reset to page 1 when filters/page size change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, auditFilter, custodyFilter, pageSize]);

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || auditFilter !== "all" || custodyFilter !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setAuditFilter("all");
    setCustodyFilter("all");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (token: any) => {
    setForm({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      current_price: Number(token.current_price) || 0,
      total_supply: Number(token.total_supply) || 0,
      circulating_supply: Number(token.circulating_supply) || 0,
      decimals: token.decimals ?? 2,
      custody_location: token.custody_location || "",
      audit_status: token.audit_status || "verified",
      is_active: token.is_active ?? true,
    });
    setIsFormOpen(true);
  };

  const openDetails = async (token: any) => {
    setSelectedToken(token);
    setIsDetailsOpen(true);
    setAuditHistory([]);
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*, profiles:admin_id(display_name)")
        .eq("target_table", "tokens")
        .eq("target_id", token.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setAuditHistory(data || []);
    } catch (e: any) {
      console.error("Error loading audit history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    if (!form.symbol || !form.name) {
      toast({ variant: "destructive", title: "Erro", description: "Símbolo e nome são obrigatórios." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        symbol: form.symbol.toUpperCase().trim(),
        name: form.name.trim(),
        current_price: form.current_price,
        total_supply: form.total_supply,
        circulating_supply: form.circulating_supply,
        decimals: form.decimals,
        custody_location: form.custody_location,
        audit_status: form.audit_status,
        is_active: form.is_active,
      };

      let error;
      if (form.id) {
        ({ error } = await supabase.from("tokens").update(payload).eq("id", form.id));
      } else {
        ({ error } = await supabase.from("tokens").insert(payload));
      }
      if (error) throw error;

      toast({ title: "Sucesso", description: form.id ? "Ativo atualizado." : "Ativo criado." });
      setIsFormOpen(false);
      onRefresh?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este ativo?")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("tokens").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Removido", description: "Ativo removido com sucesso." });
      onRefresh?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredTokens.length === 0) {
      toast({ variant: "destructive", title: "Nada para exportar", description: "Nenhum ativo corresponde aos filtros atuais." });
      return;
    }
    const headers = [
      "id","symbol","name","current_price","total_supply","circulating_supply",
      "decimals","custody_location","audit_status","last_audit_date","is_active","created_at","updated_at"
    ];
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const rows = filteredTokens.map((t) => headers.map((h) => escape(t[h])).join(","));
    const csv = "\ufeff" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `ativos-tokenizados_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: `${filteredTokens.length} ativo(s) exportado(s) para CSV.` });
  };

  const [updatingAuditId, setUpdatingAuditId] = useState<string | null>(null);
  const handleSetAuditStatus = async (token: any, newStatus: "verified" | "pending" | "failed") => {
    if (token.audit_status === newStatus) return;
    setUpdatingAuditId(token.id);
    try {
      const { error } = await supabase
        .from("tokens")
        .update({ audit_status: newStatus, last_audit_date: new Date().toISOString() })
        .eq("id", token.id);
      if (error) throw error;
      toast({ title: "Auditoria atualizada", description: `${token.symbol}: ${newStatus}` });
      onRefresh?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setUpdatingAuditId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Coins className="text-primary w-6 h-6" /> Ativos Tokenizados
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-xl h-10"
            title="Atualizar agora"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-xl h-10"
            title="Exportar CSV (com filtros aplicados)"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl h-10 px-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${autoRefresh ? "text-primary" : "text-white/50 hover:text-white"}`}
              title={autoRefresh ? "Pausar auto-atualização" : "Ativar auto-atualização"}
            >
              {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              AUTO
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-xs font-mono outline-none cursor-pointer"
              title="Intervalo de atualização"
            >
              <option value={10} className="bg-neutral-900">10s</option>
              <option value={30} className="bg-neutral-900">30s</option>
              <option value={60} className="bg-neutral-900">1min</option>
              <option value={300} className="bg-neutral-900">5min</option>
              <option value={600} className="bg-neutral-900">10min</option>
            </select>
            {autoRefresh && (
              <span className="text-[10px] font-mono text-primary/70 border-l border-white/10 pl-2">
                {countdown}s
              </span>
            )}
          </div>

          <Button onClick={openCreate} className="bg-primary text-black font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20 rounded-xl h-10">
            <Plus className="w-4 h-4 mr-2" /> Novo Ativo
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-white/30 -mt-3 mb-2">
        Última atualização: {lastRefreshed.toLocaleTimeString('pt-BR')}
        {autoRefresh && <span className="text-primary/60"> • Auto-refresh ativo</span>}
      </p>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por símbolo ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 h-11 rounded-xl focus:border-primary/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-sm focus:ring-1 focus:ring-primary/50 outline-none min-w-[160px]"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <select
          value={custodyFilter}
          onChange={(e) => setCustodyFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-sm focus:ring-1 focus:ring-primary/50 outline-none min-w-[200px]"
          title="Filtrar por custódia"
        >
          <option value="all">Toda custódia</option>
          {custodyOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={auditFilter}
          onChange={(e) => setAuditFilter(e.target.value as any)}
          className="bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-sm focus:ring-1 focus:ring-primary/50 outline-none min-w-[180px]"
        >
          <option value="all">Toda auditoria</option>
          <option value="verified">Verificado</option>
          <option value="pending">Pendente</option>
          <option value="failed">Reprovado</option>
        </select>

        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl h-11 px-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2">Ordenar</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-sm outline-none cursor-pointer pr-1"
          >
            <option value="created_at" className="bg-neutral-900">Data de criação</option>
            <option value="symbol" className="bg-neutral-900">Símbolo</option>
            <option value="name" className="bg-neutral-900">Nome</option>
            <option value="current_price" className="bg-neutral-900">Preço</option>
          </select>
          <button
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            className="text-primary hover:bg-primary/10 rounded-lg p-1.5 transition-colors"
            title={sortDir === "asc" ? "Crescente (clique para decrescente)" : "Decrescente (clique para crescente)"}
          >
            {sortDir === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </button>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-xl h-11"
          >
            <X className="w-4 h-4 mr-2" /> Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/40 mb-3">
        <span>
          Mostrando <span className="text-primary font-bold">
            {filteredTokens.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredTokens.length)}
          </span> de {filteredTokens.length} {filteredTokens.length !== tokens.length && <span className="text-white/30">(filtrados de {tokens.length})</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wider">Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg h-8 px-2 text-xs focus:ring-1 focus:ring-primary/50 outline-none"
          >
            {[3, 6, 9, 12, 24, 48].map((n) => (
              <option key={n} value={n} className="bg-neutral-900">{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedTokens.length > 0 ? paginatedTokens.map((token) => {
          const supply = Number(token.total_supply) || 0;
          const circ = Number(token.circulating_supply) || 0;
          const pct = supply > 0 ? (circ / supply) * 100 : 0;
          return (
            <Card key={token.id} className="bg-neutral-900/40 backdrop-blur-md border-white/5 p-6 rounded-2xl shadow-xl hover:border-primary/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-amber-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Coins size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{token.symbol}</h3>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">{token.name}</p>
                </div>
                <Badge className={`ml-auto text-[10px] font-black uppercase ${token.is_active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                  {token.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Preço Atual</span>
                  <span className="text-sm font-mono font-bold text-primary">R$ {Number(token.current_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Suprimento Total</span>
                  <span className="text-sm font-mono font-bold text-white/80">{supply.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Em Circulação</span>
                  <span className="text-sm font-mono font-bold text-primary">{circ.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/30 text-right">{pct.toFixed(1)}% emitido</p>
              </div>

              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auditoria
                  {updatingAuditId === token.id && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { v: "verified", label: "Verificado", base: "text-green-400 border-green-500/30", active: "bg-green-500/30 border-green-500/60" },
                    { v: "pending", label: "Pendente", base: "text-amber-400 border-amber-500/30", active: "bg-amber-500/30 border-amber-500/60" },
                    { v: "failed", label: "Reprovado", base: "text-red-400 border-red-500/30", active: "bg-red-500/30 border-red-500/60" },
                  ] as const).map((opt) => {
                    const isActive = token.audit_status === opt.v;
                    return (
                      <button
                        key={opt.v}
                        disabled={updatingAuditId === token.id}
                        onClick={() => handleSetAuditStatus(token, opt.v)}
                        className={`text-[10px] font-bold uppercase rounded-lg border px-1.5 py-1.5 transition-all ${isActive ? opt.active : opt.base + " bg-white/5 opacity-60 hover:opacity-100"}`}
                        title={`Marcar como ${opt.label}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => openDetails(token)} variant="outline" className="flex-1 text-xs border-white/5 bg-white/5 hover:bg-white/10 h-10 rounded-xl">
                  Detalhes
                </Button>
                <Button onClick={() => openEdit(token)} variant="outline" className="text-xs border-white/5 bg-white/5 hover:bg-primary/10 hover:text-primary h-10 w-10 p-0 rounded-xl" title="Editar">
                  <Edit size={14} />
                </Button>
                <Button onClick={() => handleDelete(token.id)} variant="outline" className="text-xs border-white/5 bg-white/5 hover:bg-red-500/10 hover:text-red-500 h-10 w-10 p-0 rounded-xl" title="Remover" disabled={deleting}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          );
        }) : (
          <div className="col-span-full py-20 text-center text-white/20">
            <Coins size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-sm font-medium">
              {tokens.length === 0 ? "Nenhum ativo tokenizado encontrado." : "Nenhum ativo corresponde aos filtros aplicados."}
            </p>
            {tokens.length === 0 ? (
              <Button onClick={openCreate} variant="outline" className="mt-4 border-primary/30 text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-2" /> Criar primeiro ativo
              </Button>
            ) : (
              <Button onClick={clearFilters} variant="outline" className="mt-4 border-primary/30 text-primary hover:bg-primary/10">
                <X className="w-4 h-4 mr-2" /> Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {filteredTokens.length > pageSize && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-4 border-t border-white/5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={safePage === 1}
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-lg h-9 px-3"
          >
            «
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-lg h-9 px-3"
          >
            Anterior
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
            .map((p, i, arr) => (
              <span key={p} className="flex items-center gap-2">
                {i > 0 && arr[i - 1] !== p - 1 && <span className="text-white/30 text-xs">…</span>}
                <Button
                  variant={p === safePage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(p)}
                  className={
                    p === safePage
                      ? "bg-primary text-black font-bold rounded-lg h-9 w-9 p-0"
                      : "border-white/10 bg-white/5 hover:bg-white/10 rounded-lg h-9 w-9 p-0"
                  }
                >
                  {p}
                </Button>
              </span>
            ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-lg h-9 px-3"
          >
            Próximo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safePage === totalPages}
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-lg h-9 px-3"
          >
            »
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight uppercase">
              {form.id ? "Editar Ativo" : "Novo Ativo Tokenizado"}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Configure os parâmetros do ativo digital lastreado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Símbolo</Label>
                <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="GTK" className="bg-white/5 border-white/10 rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GTK Token" className="bg-white/5 border-white/10 rounded-xl h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Preço (R$)</Label>
                <Input type="number" step="0.01" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: Number(e.target.value) })} className="bg-white/5 border-white/10 rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Decimais</Label>
                <Input type="number" value={form.decimals} onChange={(e) => setForm({ ...form, decimals: Number(e.target.value) })} className="bg-white/5 border-white/10 rounded-xl h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Suprimento Total</Label>
                <Input type="number" value={form.total_supply} onChange={(e) => setForm({ ...form, total_supply: Number(e.target.value) })} className="bg-white/5 border-white/10 rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Em Circulação</Label>
                <Input type="number" value={form.circulating_supply} onChange={(e) => setForm({ ...form, circulating_supply: Number(e.target.value) })} className="bg-white/5 border-white/10 rounded-xl h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Local de Custódia</Label>
              <Input value={form.custody_location} onChange={(e) => setForm({ ...form, custody_location: e.target.value })} className="bg-white/5 border-white/10 rounded-xl h-11" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Status Auditoria</Label>
                <select
                  value={form.audit_status}
                  onChange={(e) => setForm({ ...form, audit_status: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl h-11 px-3 text-sm focus:ring-1 focus:ring-primary/50 outline-none"
                >
                  <option value="verified">Verificado</option>
                  <option value="pending">Pendente</option>
                  <option value="failed">Reprovado</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Ativo</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-black font-bold rounded-xl px-6">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.id ? "Salvar Alterações" : "Criar Ativo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight uppercase flex items-center gap-2">
              <Coins className="text-primary" /> {selectedToken?.symbol}
            </DialogTitle>
            <DialogDescription className="text-white/50">{selectedToken?.name}</DialogDescription>
          </DialogHeader>
          {selectedToken && (
            <div className="grid md:grid-cols-2 gap-6 py-4">
              {/* Token Details */}
              <div className="space-y-2 text-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Informações
                </h3>
                {[
                  ["Preço Atual", `R$ ${Number(selectedToken.current_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                  ["Suprimento Total", Number(selectedToken.total_supply).toLocaleString()],
                  ["Em Circulação", Number(selectedToken.circulating_supply).toLocaleString()],
                  ["Decimais", selectedToken.decimals],
                  ["Custódia", selectedToken.custody_location || "—"],
                  ["Auditoria", selectedToken.audit_status || "—"],
                  ["Última Auditoria", selectedToken.last_audit_date ? new Date(selectedToken.last_audit_date).toLocaleDateString('pt-BR') : "—"],
                  ["Status", selectedToken.is_active ? "Ativo" : "Inativo"],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between items-center p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[11px] text-white/50 uppercase tracking-wider">{label}</span>
                    <span className="font-mono font-bold text-xs">{value}</span>
                  </div>
                ))}
              </div>

              {/* Audit History */}
              <div className="space-y-2 text-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-primary" /> Histórico de Auditoria
                  {auditHistory.length > 0 && (
                    <span className="text-[10px] text-primary/60 font-mono">({auditHistory.length})</span>
                  )}
                </h3>

                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12 text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : auditHistory.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-xs border border-dashed border-white/10 rounded-xl">
                    <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    Nenhuma alteração registrada ainda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {auditHistory.map((log) => {
                      const opColor =
                        log.operation === "INSERT" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                        log.operation === "UPDATE" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                        "text-red-400 bg-red-500/10 border-red-500/20";
                      const opLabel =
                        log.operation === "INSERT" ? "Criado" :
                        log.operation === "UPDATE" ? "Editado" :
                        "Removido";

                      // Compute changed fields
                      const changes: { field: string; from: any; to: any }[] = [];
                      if (log.operation === "UPDATE" && log.old_value && log.new_value) {
                        const trackedFields = ["current_price", "total_supply", "circulating_supply", "is_active", "audit_status", "custody_location", "name", "symbol"];
                        trackedFields.forEach((f) => {
                          const oldV = log.old_value[f];
                          const newV = log.new_value[f];
                          if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
                            changes.push({ field: f, from: oldV, to: newV });
                          }
                        });
                      }

                      const fieldLabels: Record<string, string> = {
                        current_price: "Preço",
                        total_supply: "Supr. Total",
                        circulating_supply: "Circulação",
                        is_active: "Ativo",
                        audit_status: "Auditoria",
                        custody_location: "Custódia",
                        name: "Nome",
                        symbol: "Símbolo",
                      };

                      return (
                        <div key={log.id} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${opColor}`}>
                              {opLabel}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">
                              {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 mb-2">
                            por <span className="text-primary/80 font-bold">{log.profiles?.display_name || "Sistema"}</span>
                          </p>
                          {changes.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-white/5">
                              {changes.map((c, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                                  <span className="text-white/50 min-w-[70px]">{fieldLabels[c.field] || c.field}:</span>
                                  <span className="text-red-400/80 line-through truncate max-w-[80px]">{String(c.from ?? "—")}</span>
                                  <ArrowRight className="w-3 h-3 text-white/30 shrink-0" />
                                  <span className="text-green-400 font-bold truncate max-w-[80px]">{String(c.to ?? "—")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {log.operation === "INSERT" && (
                            <p className="text-[10px] text-white/40 italic">Ativo criado no sistema.</p>
                          )}
                          {log.operation === "DELETE" && (
                            <p className="text-[10px] text-white/40 italic">Ativo removido.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setIsDetailsOpen(false); openEdit(selectedToken); }} variant="outline" className="border-white/10 rounded-xl">
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
            <Button onClick={() => setIsDetailsOpen(false)} className="bg-primary text-black font-bold rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
