import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssetEvolutionChartProps {
  data: any[];
}

const PerformanceChart = React.memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
      <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
      <YAxis hide />
      <Tooltip 
        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
        itemStyle={{ color: '#CC9933' }}
      />
      <Area 
        type="monotone" 
        dataKey="price" 
        stroke="var(--primary)" 
        fillOpacity={1} 
        fill="url(#colorPrice)" 
        strokeWidth={3}
      />
    </AreaChart>
  </ResponsiveContainer>
));

PerformanceChart.displayName = 'PerformanceChart';

export const AssetEvolutionChart = ({ data }: AssetEvolutionChartProps) => {
  return (
    <Card className="lg:col-span-2 glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Evolução do Ativo</CardTitle>
          <p className="text-sm text-muted-foreground">Valorização histórica do GTK Token (R$/g)</p>
        </div>
        <div className="flex gap-2">
          {['1D', '1W', '1M', '1Y'].map((range) => (
            <Button 
              key={range} 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2 text-[10px] rounded-md transition-all", 
                range === '1M' ? "bg-primary text-black font-bold" : "hover:bg-white/5"
              )}
            >
              {range}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <PerformanceChart data={data} />
        </div>
      </CardContent>
    </Card>
  );
};
