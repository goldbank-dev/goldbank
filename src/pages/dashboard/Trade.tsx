import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  TrendingUp,
  Info,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError, handleSuccess } from "@/utils/error-handler.tsx";
import { cn } from "@/lib/utils";

import { useProfile, useTokens } from "@/hooks/use-dashboard";

const TradePage = () => {
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { data: tokens = [], refetch: refetchTokens } = useTokens();
  const [amount, setAmount] = useState<string>("1");
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    await Promise.all([refetchProfile(), refetchTokens()]);
  };

  const goldToken = tokens.find(t => t.symbol === 'GTK') || { current_price: 350.50, symbol: 'GTK' };
  const totalCost = Number(amount || 0) * goldToken.current_price;

  const handleTrade = async () => {
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) {
      handleError("Por favor, insira uma quantidade válida.");
      return;
    }

    setLoading(true);
    try {
      const { error: tradeError } = await supabase.rpc('execute_trade' as any, {
        p_type: type,
        p_amount: numAmount,
      });

      if (tradeError) throw tradeError;

      handleSuccess(`Você ${type === 'buy' ? 'comprou' : 'vendeu'} ${amount}g de ouro com sucesso.`);
      fetchData();
    } catch (error: any) {
      handleError(error, "Erro ao processar negociação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Negociar Ativos</h1>
          <p className="text-muted-foreground mt-1">Compre ou venda ouro digital com liquidez imediata.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <Card className="md:col-span-3 bg-neutral-900 border-white/5">
            <CardHeader>
              <div className="flex bg-white/5 p-1 rounded-xl mb-4">
                <button 
                  onClick={() => setType('buy')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    type === 'buy' ? "bg-primary text-black" : "text-muted-foreground hover:text-white"
                  )}
                >
                  COMPRAR
                </button>
                <button 
                  onClick={() => setType('sell')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    type === 'sell' ? "bg-red-500 text-white" : "text-muted-foreground hover:text-white"
                  )}
                >
                  VENDER
                </button>
              </div>
              <CardTitle>XAU / GTK Token</CardTitle>
              <CardDescription>Cotação em tempo real lastreada em ouro físico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Quantidade (em gramas)</Label>
                <div className="relative">
                  <Input 
                    id="amount" 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-white/5 border-white/10 h-14 text-lg font-bold pl-4 pr-12 rounded-xl focus:border-primary/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">g</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço por grama</span>
                  <span className="font-bold">R$ {goldToken.current_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de operação (0.1%)</span>
                  <span className="font-bold">R$ {(totalCost * 0.001).toFixed(2)}</span>
                </div>
                <hr className="border-white/5" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-lg">Total estimado</span>
                  <span className="text-2xl font-black text-primary">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <Button 
                onClick={handleTrade} 
                className={cn(
                  "w-full h-16 text-lg font-black rounded-2xl transition-all duration-300",
                  type === 'buy' ? "glow-primary" : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                )}
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
                  type === 'buy' ? 'CONFIRMAR COMPRA' : 'CONFIRMAR VENDA'
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card className="bg-neutral-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Meus Saldos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Ouro (GTK)</span>
                  </div>
                  <span className="text-sm font-bold">{profile?.gold_balance || "0.00"} g</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Real (BRL)</span>
                  </div>
                  <span className="text-sm font-bold">R$ {Number(profile?.currency_balance || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Informações Importantes</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Liquidez imediata disponível 24/7.",
                  "Lastro físico auditado por terceiros.",
                  "Transferência para carteira fria habilitada.",
                  "Custódia em cofres de segurança máxima."
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground leading-relaxed">
                    <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TradePage;
