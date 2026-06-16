import { ShieldCheck, CheckCircle2, XCircle, ExternalLink, User, Calendar, FileText, ChevronDown, Search, Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Sheet,
  SheetContent,
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

interface KYCSectionProps {
  kycs: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

export const KYCSection = ({ 
  kycs,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter
}: KYCSectionProps) => {
  const filteredKycs = useMemo(() => {
    return kycs.filter(k => {
      const matchesSearch = 
        k.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [kycs, searchQuery, statusFilter]);

  const { page, pageSize, setPage, setPageSize, resetPage } = useUrlPagination({ prefix: "kyc" });
  useEffect(() => { resetPage(); }, [searchQuery, statusFilter, resetPage]);

  const isFiltering = searchQuery.trim() !== "" || statusFilter !== "all";
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };
  const paginatedKycs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredKycs.slice(start, start + pageSize);
  }, [filteredKycs, page, pageSize]);

  const [openMobileItem, setOpenMobileItem] = useState<string>("");
  useEffect(() => { setOpenMobileItem(""); }, [page, pageSize]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-primary w-5 h-5" /> Verificações de Identidade (KYC)
        </h2>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Buscar por nome ou email..." 
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
                  <Filter className="w-5 h-5 text-primary" /> Filtros KYC
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Status da Verificação</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'under_review', label: 'Em Análise' },
                      { id: 'approved', label: 'Aprovado' },
                      { id: 'rejected', label: 'Rejeitado' }
                    ].map((s) => (
                      <Button
                        key={s.id}
                        variant={statusFilter === s.id ? "default" : "outline"}
                        className={cn(
                          "rounded-xl h-11 font-bold text-xs uppercase tracking-tight",
                          statusFilter === s.id ? "bg-primary text-black" : "border-white/10 text-white/60"
                        )}
                        onClick={() => setStatusFilter(s.id)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
            <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Pendentes</p>
            <p className="text-lg md:text-xl font-black">{kycs.filter(k => k.status === 'under_review').length}</p>
          </div>
        </Card>
        <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Aprovados</p>
            <p className="text-lg md:text-xl font-black">{kycs.filter(k => k.status === 'approved').length}</p>
          </div>
        </Card>
      </div>

      <div className="hidden lg:block">
        <Card className="bg-neutral-900/40 backdrop-blur-md border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="py-5 px-6 font-bold text-white/50">Usuário</TableHead>
                  <TableHead className="font-bold text-white/50">Tipo de Documento</TableHead>
                  <TableHead className="font-bold text-white/50">Data de Envio</TableHead>
                  <TableHead className="font-bold text-white/50">Status</TableHead>
                  <TableHead className="text-right font-bold text-white/50">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKycs.length > 0 ? paginatedKycs.map((kyc) => (
                  <TableRow key={kyc.id} className="border-white/5 hover:bg-white/5 transition-all group">
                    <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-primary transition-colors">{kyc.profiles?.display_name || "N/A"}</p>
                          <p className="text-[10px] text-white/30">{kyc.profiles?.email || "N/A"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-white/10 bg-white/5">
                        {kyc.document_type || "RG/CNH"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40 font-mono">
                      {new Date(kyc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase px-2 py-1",
                        kyc.status === 'under_review' ? "bg-amber-500/20 text-amber-500 border-amber-500/20" :
                        kyc.status === 'approved' ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-red-500/20 text-red-500 border-red-500/20"
                      )}>
                        {kyc.status === 'under_review' ? 'Em Análise' : kyc.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-white/10 text-xs gap-2">
                          <ExternalLink size={14} /> Ver Documentos
                        </Button>
                        {kyc.status === 'under_review' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:bg-green-500/10 rounded-lg">
                              <CheckCircle2 size={16} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg">
                              <XCircle size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="p-6">
                      <EmptyState
                        icon={isFiltering ? undefined : Inbox}
                        title={isFiltering ? "Nenhum resultado encontrado" : "Nenhum documento KYC enviado"}
                        description={isFiltering
                          ? "Sua busca ou filtros não retornaram nenhum documento. Ajuste os critérios para visualizar resultados."
                          : "Quando os usuários enviarem seus documentos, eles aparecerão aqui para análise."}
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
          {paginatedKycs.length > 0 ? paginatedKycs.map((kyc) => (
            <AccordionItem key={kyc.id} value={kyc.id} className="border-none">
              <Card className="bg-neutral-900/40 border-white/5 overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex flex-col items-start text-left w-full gap-2">
                    <div className="flex justify-between items-center w-full pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                          <User size={14} />
                        </div>
                        <p className="font-bold text-white text-sm">{kyc.profiles?.display_name || "N/A"}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5",
                        kyc.status === 'under_review' ? "bg-amber-500/20 text-amber-500 border-amber-500/20" :
                        kyc.status === 'approved' ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-red-500/20 text-red-500 border-red-500/20"
                      )}>
                        {kyc.status === 'under_review' ? 'Análise' : kyc.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20 text-white">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1">
                          <FileText size={10} /> Documento
                        </p>
                        <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] uppercase">
                          {kyc.document_type || "RG/CNH"}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1">
                          <Calendar size={10} /> Data
                        </p>
                        <p className="text-[11px] font-mono">{new Date(kyc.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Email</p>
                      <p className="text-[11px] text-white/60 truncate">{kyc.profiles?.email || "N/A"}</p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button variant="outline" className="w-full border-white/10 bg-white/5 h-10 rounded-xl text-xs gap-2 font-bold">
                        <ExternalLink size={14} /> Visualizar Documentos
                      </Button>
                      {kyc.status === 'under_review' && (
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-green-500 text-black hover:bg-green-400 h-10 rounded-xl font-bold text-xs">
                            <CheckCircle2 size={16} className="mr-2" /> Aprovar
                          </Button>
                          <Button className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 h-10 rounded-xl font-bold text-xs">
                            <XCircle size={16} className="mr-2" /> Recusar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )) : null}
        </Accordion>
        {filteredKycs.length === 0 && (
          <EmptyState
            icon={isFiltering ? undefined : Inbox}
            title={isFiltering ? "Nenhum resultado encontrado" : "Nenhum documento KYC enviado"}
            description={isFiltering
              ? "Sua busca ou filtros não retornaram nenhum documento. Ajuste os critérios."
              : "Quando os usuários enviarem documentos, eles aparecerão aqui."}
            actionLabel={isFiltering ? "Limpar filtros" : undefined}
            onAction={isFiltering ? handleClearFilters : undefined}
          />
        )}
      </div>

      <PaginationControls
        currentPage={page}
        totalItems={filteredKycs.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

    </div>
  );
};
