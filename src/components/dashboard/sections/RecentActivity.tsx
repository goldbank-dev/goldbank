import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
  isLoading: boolean;
  transactions: any[];
}

export const RecentActivity = ({ isLoading, transactions }: RecentActivityProps) => {
  const navigate = useNavigate();

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Atividade Recente</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-primary hover:text-primary/80 p-0" 
          onClick={() => navigate("/dashboard/statement")}
          aria-label="Ver extrato completo"
        >
          Ver tudo <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
                <Skeleton className="h-4 w-16 bg-white/5" />
              </div>
            ))
          ) : transactions.length > 0 ? (
            transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center gap-4 group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                  tx.type === 'buy' 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  {tx.type === 'buy' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                    {tx.type === 'buy' ? 'Compra de GTK' : 'Venda de GTK'}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    {new Date(tx.created_at).toLocaleDateString()} • {tx.amount_grams}g
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    tx.type === 'buy' ? "text-red-400" : "text-green-400"
                  )}>
                    {tx.type === 'buy' ? '-' : '+'} R$ {Number(tx.amount_currency).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">Concluída</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">Sem movimentações ainda.</p>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2">Dica de Segurança</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Nunca compartilhe sua senha ou código 2FA com terceiros. O GoldBank nunca solicita esses dados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
