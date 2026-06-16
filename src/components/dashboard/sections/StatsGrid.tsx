import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Wallet, ArrowUpRight, TrendingUp } from "lucide-react";

interface StatsGridProps {
  isLoading: boolean;
  profile: any;
  goldToken: any;
}

export const StatsGrid = ({ isLoading, profile, goldToken }: StatsGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-16 h-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" /> Patrimônio em GTK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              {isLoading ? <Skeleton className="h-9 w-24 bg-white/5" /> : <span className="text-3xl font-bold">{profile?.gold_balance || "0.00"}</span>}
              <span className="text-sm font-medium text-primary uppercase">g</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ≈ R$ {((profile?.gold_balance || 0) * (goldToken?.current_price || 350.50)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card overflow-hidden group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-500" /> Saldo em Carteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-muted-foreground">R$</span>
              {isLoading ? <Skeleton className="h-9 w-32 bg-white/5" /> : <span className="text-3xl font-bold">{Number(profile?.currency_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Disponível</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card overflow-hidden group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-blue-500" /> Preço do Ouro (GTK)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-muted-foreground">R$</span>
              {isLoading ? <Skeleton className="h-9 w-28 bg-white/5" /> : <span className="text-3xl font-bold">{goldToken?.current_price || "350.50"}</span>}
            </div>
            <p className="text-xs text-green-500 mt-2 font-bold">+2.45% <span className="text-muted-foreground font-normal ml-1">nas últimas 24h</span></p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
