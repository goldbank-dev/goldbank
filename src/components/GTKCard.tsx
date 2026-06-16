import { useQuery } from '@tanstack/react-query';
import { getGTKSystemInfo, getGTKHealth } from '@/lib/gtkApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Coins, TrendingUp } from 'lucide-react';

export function GTKCard() {
  const { data: info, isLoading, isError } = useQuery({
    queryKey: ['gtk-system-info'],
    queryFn: getGTKSystemInfo,
    refetchInterval: 60_000,
    retry: 2,
  });

  const { data: health } = useQuery({
    queryKey: ['gtk-health'],
    queryFn: getGTKHealth,
    refetchInterval: 30_000,
  });

  const online = health?.status === 'healthy';

  return (
    <Card className="border border-yellow-500/30 bg-gradient-to-br from-yellow-950/20 to-amber-900/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-yellow-400">
            <Coins className="h-4 w-4" />
            Gold Token (GTK)
          </CardTitle>
          <Badge
            variant="outline"
            className={online
              ? 'border-green-500/50 text-green-400 text-xs'
              : 'border-red-500/50 text-red-400 text-xs'}
          >
            {online ? '● Mainnet' : '○ Offline'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">1 GTK = 1 grama de ouro 99,99%</p>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando dados on-chain...
          </div>
        )}

        {isError && (
          <p className="text-xs text-red-400">Erro ao carregar dados GTK.</p>
        )}

        {info && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Preço do ouro</p>
              <p className="font-semibold text-yellow-300">
                ${Number(info.goldPricePerGram).toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/g</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Supply GTK</p>
              <p className="font-semibold text-white">
                {Number(info.totalSupply).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                <span className="text-xs font-normal text-muted-foreground ml-1">GTK</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Reservas de ouro</p>
              <p className="font-semibold text-white">
                {Number(info.totalGoldReserves).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                <span className="text-xs font-normal text-muted-foreground ml-1">g</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <ShieldCheck className={`h-4 w-4 ${info.isFullyBacked ? 'text-green-400' : 'text-red-400'}`} />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Lastro</p>
                <p className={`font-semibold text-xs ${info.isFullyBacked ? 'text-green-400' : 'text-red-400'}`}>
                  {info.isFullyBacked ? '100% lastreado' : 'Parcial'}
                </p>
              </div>
            </div>

            {info.usdToBrl > 0 && (
              <div className="col-span-2 pt-1 border-t border-yellow-500/10 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                USD/BRL: R$ {info.usdToBrl?.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
