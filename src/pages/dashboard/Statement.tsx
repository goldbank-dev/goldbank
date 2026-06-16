import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  Filter,
  Download,
  Wallet,
  Coins,
  RefreshCw,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const StatementPage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [profileRes, txRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      ]);
      setProfile(profileRes.data);
      setTransactions(txRes.data || []);
    }
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">Concluída</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">Pendente</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider">Falhou</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-neutral-500/10 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Extrato Completo</h1>
            <p className="text-muted-foreground mt-1">Visualize todas as movimentações detalhadas da sua conta.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-white/10 rounded-xl" onClick={fetchData}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Atualizar
            </Button>
            <Button className="glow-primary rounded-xl gap-2">
              <Download className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-neutral-900 border-white/5 overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-500" /> Saldo BRL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-muted-foreground">R$</span>
                <span className="text-3xl font-bold">{Number(profile?.currency_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-white/5 overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" /> Patrimônio GTK
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{profile?.gold_balance || "0.00"}</span>
                <span className="text-sm font-medium text-primary uppercase">g</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-neutral-900 border-white/5">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por descrição ou tipo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por tipo" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10 text-white">
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="deposit">Depósitos</SelectItem>
                  <SelectItem value="withdraw">Saques</SelectItem>
                  <SelectItem value="buy">Compras</SelectItem>
                  <SelectItem value="sell">Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Table */}
        <Card className="bg-neutral-900 border-white/5 overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Moeda/Token</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto opacity-20" />
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                          (tx.type === 'buy' || tx.type === 'withdraw') 
                            ? "bg-red-500/10 text-red-500 border-red-500/20" 
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                        )}>
                          {(tx.type === 'buy' || tx.type === 'withdraw') ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold capitalize">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs group-hover:text-primary transition-colors">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium">
                        {tx.amount_grams > 0 ? `${tx.amount_grams}g GTK` : 'BRL'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-xs font-bold",
                        (tx.type === 'buy' || tx.type === 'withdraw') ? "text-red-400" : "text-green-400"
                      )}>
                        {(tx.type === 'buy' || tx.type === 'withdraw') ? '-' : '+'} R$ {Number(tx.amount_currency).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(tx.status)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 opacity-10" />
                      <p className="text-sm">Nenhuma transação encontrada para os filtros aplicados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StatementPage;