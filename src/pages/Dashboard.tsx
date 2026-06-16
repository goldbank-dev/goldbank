/**
 * @module UserPages
 * @description Views accessible by authenticated users for account overview and investment management.
 */

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/use-dashboard";
import { StatsGrid } from "@/components/dashboard/sections/StatsGrid";
import { AssetEvolutionChart } from "@/components/dashboard/sections/AssetEvolutionChart";
import { RecentActivity } from "@/components/dashboard/sections/RecentActivity";

const chartData = [
  { name: 'Jan', price: 310 },
  { name: 'Fev', price: 325 },
  { name: 'Mar', price: 320 },
  { name: 'Abr', price: 345 },
  { name: 'Mai', price: 350.50 },
];

/**
 * Main User Dashboard
 * Displays asset balance, evolution charts, and recent transaction history.
 * 
 * @component Dashboard
 */
const Dashboard = () => {
  const { data, isLoading, refetch, isFetching } = useDashboardData();

  const profile = data?.profile;
  const tokens = data?.tokens || [];
  const transactions = data?.transactions || [];
  const goldToken = tokens.find((t: any) => t.symbol === 'GTK');

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Olá, <span className="text-primary">{profile?.display_name?.split(' ')[0] || "Investidor"}</span>
            </h1>
            <p className="text-muted-foreground mt-1">Bem-vindo de volta ao seu painel financeiro.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-white/10 hover:bg-white/5 gap-2 rounded-xl"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <StatsGrid isLoading={isLoading} profile={profile} goldToken={goldToken} />

        {/* Chart and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <AssetEvolutionChart data={chartData} />
          <RecentActivity isLoading={isLoading} transactions={transactions} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
