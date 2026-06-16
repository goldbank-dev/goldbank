import { Fingerprint, Download, History, ExternalLink, ShieldCheck, Search, SlidersHorizontal, Filter, ShieldAlert, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { Inbox } from "lucide-react";

interface AuditSectionProps {
  auditLogs: any[];
  transferAuditLogs: any[];
  transferFilters: any;
  exportAuditLogsToCSV: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

export const AuditSection = ({
  auditLogs,
  transferAuditLogs,
  transferFilters,
  exportAuditLogsToCSV,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter
}: AuditSectionProps) => {
  const filteredAdminLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target_table?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || log.operation === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [auditLogs, searchQuery, statusFilter]);

  const filteredTransferLogs = useMemo(() => {
    return transferAuditLogs.filter(log => {
      const matchesSearch = 
        log.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [transferAuditLogs, searchQuery, statusFilter]);

  const [activeAuditTab, setActiveAuditTab] = useState<string>("admin");
  const adminPag = useUrlPagination({ prefix: "audit" });
  const transferPag = useUrlPagination({ prefix: "tx" });
  const { page: adminPage, pageSize: adminPageSize, setPage: setAdminPage, setPageSize: setAdminPageSize, resetPage: resetAdminPage } = adminPag;
  const { page: transferPage, pageSize: transferPageSize, setPage: setTransferPage, setPageSize: setTransferPageSize, resetPage: resetTransferPage } = transferPag;
  useEffect(() => { resetAdminPage(); resetTransferPage(); }, [searchQuery, statusFilter, resetAdminPage, resetTransferPage]);

  const isFiltering = searchQuery.trim() !== "" || statusFilter !== "all";
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const paginatedAdminLogs = useMemo(() => {
    const start = (adminPage - 1) * adminPageSize;
    return filteredAdminLogs.slice(start, start + adminPageSize);
  }, [filteredAdminLogs, adminPage, adminPageSize]);

  const paginatedTransferLogs = useMemo(() => {
    const start = (transferPage - 1) * transferPageSize;
    return filteredTransferLogs.slice(start, start + transferPageSize);
  }, [filteredTransferLogs, transferPage, transferPageSize]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Mobile Filter & Search Bar Fixed */}
      <div className="lg:hidden sticky top-[72px] z-30 bg-neutral-950/80 backdrop-blur-md p-2 -mx-4 mb-4 border-b border-white/5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input 
            placeholder="Buscar logs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 rounded-xl h-10 text-sm"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 bg-white/5 rounded-xl">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-neutral-950 border-white/5 rounded-t-3xl p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" /> Filtros de Auditoria
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Operação / Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['all', 'INSERT', 'UPDATE', 'DELETE', 'success', 'failed'].map((s) => (
                    <Button
                      key={s}
                      variant={statusFilter === s ? "default" : "outline"}
                      className={cn(
                        "rounded-xl h-11 font-bold text-xs uppercase tracking-tight",
                        statusFilter === s ? "bg-primary text-black" : "border-white/10 text-white/60"
                      )}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === 'all' ? 'Todos' : s}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="bg-neutral-900/60 border border-white/5 p-6 rounded-2xl mb-8 backdrop-blur-md">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tight">Guia de Auditoria e Logs</h2>
            <p className="text-sm text-white/40">Entenda como funciona o sistema de rastreamento e segurança do painel.</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">O que é auditado?</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Toda alteração em tabelas sensíveis (usuários, configurações, tokens) é registrada. Isso inclui o autor, a data exata e o valor anterior/novo do registro.
            </p>
          </div>
          <div className="space-y-2 border-x border-white/5 px-6">
            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Critérios de Filtro</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Você pode identificar ações por <strong>Operação</strong> (INSERT, UPDATE, DELETE), por <strong>Tabela</strong> ou pelo <strong>Administrador</strong> responsável pela ação.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Integridade</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Os logs de transferências utilizam o sistema de <strong>Ledger</strong> (partida dobrada), garantindo que cada débito corresponda a um crédito exato no sistema.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4">
          <Link 
            to="/sanpainel/security-audit" 
            className="flex-1 flex items-center justify-between p-4 bg-amber-400/5 border border-amber-400/10 rounded-xl hover:bg-amber-400/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400/20 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">Trilha de Segurança (RLS)</h4>
                <p className="text-[10px] text-amber-200/50">Veja tentativas bloqueadas e abusos.</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-amber-400/40 group-hover:text-amber-400 transition-colors" />
          </Link>

          <Link 
            to="/sanpainel/docs" 
            className="flex-1 flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl hover:bg-primary/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">Documentação Técnica</h4>
                <p className="text-[10px] text-primary/50">Guias de uso e APIs.</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>

      <Tabs
        value={activeAuditTab}
        onValueChange={(v) => {
          setActiveAuditTab(v);
          // Reset both paginations to avoid bleeding state between tabs
          resetAdminPage();
          resetTransferPage();
        }}
        className="w-full"
      >
        <TabsList className="bg-neutral-900/50 border border-white/5 p-1 mb-8 rounded-xl h-auto flex-wrap lg:h-12">
          <TabsTrigger value="admin" className="rounded-lg px-6 flex-1 lg:flex-none data-[state=active]:bg-primary data-[state=active]:text-black font-bold transition-all py-2">
            Auditoria Admin
          </TabsTrigger>
          <TabsTrigger value="transfers" className="rounded-lg px-6 flex-1 lg:flex-none data-[state=active]:bg-primary data-[state=active]:text-black font-bold transition-all py-2">
            Transferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="mt-0 outline-none">
          <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 rounded-2xl shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 font-bold">
                    <Fingerprint className="text-primary w-6 h-6" /> Auditoria do Sistema
                  </CardTitle>
                  <CardDescription className="text-white/40 mt-1">Histórico completo de alterações realizadas por administradores.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="py-5 px-6 font-bold text-white/50">Data/Hora</TableHead>
                      <TableHead className="font-bold text-white/50">Administrador</TableHead>
                      <TableHead className="font-bold text-white/50">Tabela</TableHead>
                      <TableHead className="font-bold text-white/50">Operação</TableHead>
                      <TableHead className="font-bold text-white/50">Resumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAdminLogs.length > 0 ? paginatedAdminLogs.map((log) => (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-all group">
                        <TableCell className="px-6 text-xs text-white/40 font-mono">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                              {log.profiles?.display_name?.[0] || "A"}
                            </div>
                            <span className="font-bold text-sm group-hover:text-primary transition-colors">{log.profiles?.display_name || "Admin Sistema"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-white/20 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {log.target_table}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-black uppercase tracking-tighter px-2",
                            log.operation === 'UPDATE' ? "border-blue-500/30 text-blue-500 bg-blue-500/5" :
                            log.operation === 'INSERT' ? "border-green-500/30 text-green-500 bg-green-500/5" : "border-red-500/30 text-red-500 bg-red-500/5"
                          )}>
                            {log.operation}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate text-white/60 font-medium italic">
                          {log.target_table === 'system_settings' ? (
                            `Alterou ${log.new_value?.key || 'parâmetro'}`
                          ) : (
                            `Registro ${log.target_id?.substring(0, 8)}...`
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="p-6">
                          <EmptyState
                            icon={isFiltering ? undefined : Inbox}
                            title={isFiltering ? "Nenhum resultado encontrado" : "Nenhum registro de auditoria"}
                            description={isFiltering
                              ? "Sua busca ou filtros não retornaram nenhum log. Ajuste os critérios."
                              : "Os logs administrativos aparecerão aqui assim que houver atividades."}
                            actionLabel={isFiltering ? "Limpar filtros" : undefined}
                            onAction={isFiltering ? handleClearFilters : undefined}
                            className="border-0 bg-transparent py-10"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="lg:hidden p-4 space-y-4">
                {paginatedAdminLogs.length > 0 ? paginatedAdminLogs.map((log) => (
                  <div key={log.id} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold">
                          {log.profiles?.display_name?.[0] || "A"}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{log.profiles?.display_name || "Admin Sistema"}</p>
                          <p className="text-[10px] text-white/40 font-mono">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase px-2",
                        log.operation === 'UPDATE' ? "border-blue-500/30 text-blue-500 bg-blue-500/5" :
                        log.operation === 'INSERT' ? "border-green-500/30 text-green-500 bg-green-500/5" : "border-red-500/30 text-red-500 bg-red-500/5"
                      )}>
                        {log.operation}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-white/20 bg-white/5 px-2 py-0.5 rounded">
                        {log.target_table}
                      </span>
                      <p className="text-[10px] text-white/60 font-medium italic truncate max-w-[150px]">
                        {log.target_table === 'system_settings' ? (
                          `Alterou ${log.new_value?.key || 'parâmetro'}`
                        ) : (
                          `Registro ${log.target_id?.substring(0, 8)}...`
                        )}
                      </p>
                    </div>
                  </div>
                )) : (
                  <EmptyState
                    icon={isFiltering ? undefined : Inbox}
                    title={isFiltering ? "Nenhum resultado encontrado" : "Nenhum registro de auditoria"}
                    description={isFiltering
                      ? "Sua busca ou filtros não retornaram nenhum log. Ajuste os critérios."
                      : "Os logs administrativos aparecerão aqui."}
                    actionLabel={isFiltering ? "Limpar filtros" : undefined}
                    onAction={isFiltering ? handleClearFilters : undefined}
                  />
                )}
              </div>

            </CardContent>
          </Card>
          <div className="mt-4">
            <PaginationControls
              currentPage={adminPage}
              totalItems={filteredAdminLogs.length}
              pageSize={adminPageSize}
              onPageChange={setAdminPage}
              onPageSizeChange={setAdminPageSize}
            />
          </div>
        </TabsContent>

        <TabsContent value="transfers" className="mt-0 outline-none">
          <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 rounded-2xl shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 font-bold">
                    <History className="text-primary w-6 h-6" /> Auditoria de Transferências
                  </CardTitle>
                  <CardDescription className="text-white/40 mt-1">Histórico completo de transações e movimentações de usuários.</CardDescription>
                </div>
                <Button 
                  onClick={exportAuditLogsToCSV} 
                  className="bg-primary text-black font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                  <Download className="w-4 h-4 mr-2" /> Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="py-5 px-6 font-bold text-white/50">Data</TableHead>
                      <TableHead className="font-bold text-white/50">Usuário</TableHead>
                      <TableHead className="font-bold text-white/50">Tipo</TableHead>
                      <TableHead className="font-bold text-white/50">Valor</TableHead>
                      <TableHead className="font-bold text-white/50">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransferLogs.length > 0 ? paginatedTransferLogs.map((log) => (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-all group">
                        <TableCell className="px-6 text-xs text-white/40 font-mono">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-primary transition-colors">{log.profiles?.display_name || "N/A"}</p>
                            <p className="text-[10px] text-white/30 truncate max-w-[150px]">{log.profiles?.email || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-white/10 bg-white/5">
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-white/80">
                          R$ {Number(log.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-black uppercase px-2",
                            log.status === 'success' || log.status === 'completed' ? "bg-green-500/20 text-green-500 border-green-500/20" :
                            log.status === 'failed' ? "bg-red-500/20 text-red-500 border-red-500/20" : "bg-amber-500/20 text-amber-500 border-amber-500/20"
                          )}>
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="p-6">
                          <EmptyState
                            icon={isFiltering ? undefined : Inbox}
                            title={isFiltering ? "Nenhum resultado encontrado" : "Nenhuma transferência registrada"}
                            description={isFiltering
                              ? "Sua busca ou filtros não retornaram nenhuma transferência. Ajuste os critérios."
                              : "Quando houver transferências, elas serão exibidas aqui."}
                            actionLabel={isFiltering ? "Limpar filtros" : undefined}
                            onAction={isFiltering ? handleClearFilters : undefined}
                            className="border-0 bg-transparent py-10"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="lg:hidden p-4 space-y-4">
                {paginatedTransferLogs.length > 0 ? paginatedTransferLogs.map((log) => (
                  <div key={log.id} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-white">{log.profiles?.display_name || "N/A"}</p>
                        <p className="text-[10px] text-white/30 truncate max-w-[180px]">{log.profiles?.email || "N/A"}</p>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-2",
                        log.status === 'success' || log.status === 'completed' ? "bg-green-500/20 text-green-500 border-green-500/20" :
                        log.status === 'failed' ? "bg-red-500/20 text-red-500 border-red-500/20" : "bg-amber-500/20 text-amber-500 border-amber-500/20"
                      )}>
                        {log.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Valor</span>
                        <span className="font-mono text-xs font-bold text-white/80">
                          R$ {Number(log.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Tipo</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold border-white/10 bg-white/5">
                          {log.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="pt-1 text-right">
                      <span className="text-[9px] text-white/20 font-mono italic">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                )) : (
                  <EmptyState
                    icon={isFiltering ? undefined : Inbox}
                    title={isFiltering ? "Nenhum resultado encontrado" : "Nenhuma transferência registrada"}
                    description={isFiltering
                      ? "Sua busca ou filtros não retornaram nenhuma transferência. Ajuste os critérios."
                      : "Quando houver transferências, elas serão exibidas aqui."}
                    actionLabel={isFiltering ? "Limpar filtros" : undefined}
                    onAction={isFiltering ? handleClearFilters : undefined}
                  />
                )}
              </div>

            </CardContent>
          </Card>
          <div className="mt-4">
            <PaginationControls
              currentPage={transferPage}
              totalItems={filteredTransferLogs.length}
              pageSize={transferPageSize}
              onPageChange={setTransferPage}
              onPageSizeChange={setTransferPageSize}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
