import { Wallet, ChevronDown, CheckCircle2, XCircle, Search, Filter, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useState } from "react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { Inbox } from "lucide-react";

interface FinancialSectionProps {
  financialRequests: any[];
  handleUpdateFinancialRequest: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

export const FinancialSection = ({
  financialRequests,
  handleUpdateFinancialRequest,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter
}: FinancialSectionProps) => {
  const filteredRequests = useMemo(() => {
    return financialRequests.filter(fr => {
      const matchesSearch = 
        fr.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fr.user_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || fr.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [financialRequests, searchQuery, statusFilter]);

  const { page, pageSize, setPage, setPageSize, resetPage } = useUrlPagination({ prefix: "fin" });

  useEffect(() => { resetPage(); }, [searchQuery, statusFilter, resetPage]);

  const isFiltering = searchQuery.trim() !== "" || statusFilter !== "all";
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  const [openMobileItem, setOpenMobileItem] = useState<string>("");
  useEffect(() => { setOpenMobileItem(""); }, [page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="text-primary w-5 h-5" /> Operações Financeiras
        </h2>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Buscar por nome ou ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white/5 border-white/10 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/10 text-white">
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Filter Button */}
        <div className="md:hidden flex w-full gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Buscar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-xl h-10"
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
                  <Filter className="w-5 h-5 text-primary" /> Filtros
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Status da Operação</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['all', 'pending', 'approved', 'rejected'].map((s) => (
                      <Button
                        key={s}
                        variant={statusFilter === s ? "default" : "outline"}
                        className={cn(
                          "rounded-xl h-11 font-bold text-xs uppercase tracking-tight",
                          statusFilter === s ? "bg-primary text-black" : "border-white/10 text-white/60"
                        )}
                        onClick={() => setStatusFilter(s)}
                      >
                        {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendente' : s === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button 
                  className="w-full h-12 rounded-xl bg-primary text-black font-black uppercase tracking-widest"
                  onClick={() => {}} // Just close sheet (SheetClose handles it automatically if wrapped, but here it's simple)
                >
                  Aplicar Filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="hidden lg:block">
        <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 overflow-hidden rounded-2xl shadow-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="py-4 font-bold text-white/50">Usuário</TableHead>
                  <TableHead className="font-bold text-white/50">Tipo</TableHead>
                  <TableHead className="font-bold text-white/50">Valor</TableHead>
                  <TableHead className="font-bold text-white/50">Status</TableHead>
                  <TableHead className="text-right font-bold text-white/50">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.length > 0 ? paginatedRequests.map(fr => (
                  <TableRow key={fr.id} className="border-white/5 hover:bg-white/5 transition-all group">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-white group-hover:text-primary transition-colors">{fr.profiles?.display_name || "N/A"}</span>
                        <span className="text-[10px] text-white/30 font-mono">{fr.user_id?.substring(0, 8)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full",
                        fr.type === 'deposit' ? "border-green-500/20 text-green-500 bg-green-500/5" : "border-blue-500/20 text-blue-500 bg-blue-500/5"
                      )}>
                        {fr.type === 'deposit' ? 'Depósito' : 'Saque'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold text-white/80">
                      R$ {Number(fr.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase px-2 py-1",
                        fr.status === 'pending' ? "bg-amber-500/20 text-amber-500 border-amber-500/20 animate-pulse" :
                        fr.status === 'approved' ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-red-500/20 text-red-500 border-red-500/20"
                      )}>
                        {fr.status === 'pending' ? 'Pendente' : fr.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {fr.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 rounded-lg text-green-500 hover:bg-green-500/10 hover:scale-105 transition-transform" 
                            onClick={() => handleUpdateFinancialRequest(fr.id, 'approved')}
                          >
                            Aprovar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 rounded-lg text-red-500 hover:bg-red-500/10 hover:scale-105 transition-transform" 
                            onClick={() => handleUpdateFinancialRequest(fr.id, 'rejected', 'Recusado pelo administrador')}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="p-6">
                      <EmptyState
                        icon={isFiltering ? undefined : Inbox}
                        title={isFiltering ? "Nenhum resultado encontrado" : "Nenhuma solicitação no momento"}
                        description={isFiltering
                          ? "Sua busca ou filtros não retornaram nenhuma solicitação. Tente ajustar os critérios."
                          : "Quando novas solicitações de depósito ou saque chegarem, elas aparecerão aqui."}
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
        </Card>
      </div>

      <div className="lg:hidden">
        <Accordion type="single" collapsible className="space-y-4" value={openMobileItem} onValueChange={setOpenMobileItem}>
          {paginatedRequests.length > 0 ? paginatedRequests.map(fr => (
            <AccordionItem key={fr.id} value={fr.id} className="border-none">
              <Card className="bg-neutral-900/40 border-white/5 overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex flex-col items-start text-left w-full gap-2">
                    <div className="flex justify-between items-center w-full pr-4">
                      <p className="font-bold text-white text-base">{fr.profiles?.display_name || "N/A"}</p>
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5",
                        fr.status === 'pending' ? "bg-amber-500/20 text-amber-500 border-amber-500/20" :
                        fr.status === 'approved' ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-red-500/20 text-red-500 border-red-500/20"
                      )}>
                        {fr.status === 'pending' ? 'Pendente' : fr.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="text-sm font-mono font-bold text-white/80">
                        R$ {Number(fr.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Badge variant="outline" className={cn(
                        "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full",
                        fr.type === 'deposit' ? "border-green-500/20 text-green-500 bg-green-500/5" : "border-blue-500/20 text-blue-500 bg-blue-500/5"
                      )}>
                        {fr.type === 'deposit' ? 'Depósito' : 'Saque'}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20 text-white">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">ID Usuário</p>
                        <p className="text-[10px] text-white/60 font-mono truncate">{fr.user_id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Data</p>
                        <p className="text-[10px] text-white/60 font-mono">
                          {new Date(fr.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {fr.rejection_reason && (
                      <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-lg">
                        <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Motivo da Rejeição</p>
                        <p className="text-[11px] text-red-400/80 italic">{fr.rejection_reason}</p>
                      </div>
                    )}

                    {fr.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          className="flex-1 bg-green-500 text-black hover:bg-green-400 h-10 rounded-xl font-bold text-xs"
                          onClick={() => handleUpdateFinancialRequest(fr.id, 'approved')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar
                        </Button>
                        <Button 
                          className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 h-10 rounded-xl font-bold text-xs"
                          onClick={() => handleUpdateFinancialRequest(fr.id, 'rejected', 'Recusado pelo administrador')}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )) : (
            <EmptyState
              icon={isFiltering ? undefined : Inbox}
              title={isFiltering ? "Nenhum resultado encontrado" : "Nenhuma solicitação no momento"}
              description={isFiltering
                ? "Sua busca ou filtros não retornaram nenhuma solicitação. Tente ajustar os critérios."
                : "Quando novas solicitações chegarem, elas aparecerão aqui."}
              actionLabel={isFiltering ? "Limpar filtros" : undefined}
              onAction={isFiltering ? handleClearFilters : undefined}
            />
          )}
        </Accordion>
      </div>

      <PaginationControls
        currentPage={page}
        totalItems={filteredRequests.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

    </div>
  );
};
