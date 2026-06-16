import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AdminStatProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  color: string;
  bg: string;
  delay: number;
}

export const AdminStatCard = ({ title, value, icon: Icon, trend, color, bg, delay }: AdminStatProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="glass-card group cursor-default">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{title}</CardTitle>
        <div className={cn("p-2 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6", bg)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/5", color)}>
            {trend}
          </span>
        </div>
        <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className={cn("h-full opacity-50", color.replace('text', 'bg'))}
            initial={{ width: 0 }}
            animate={{ width: "70%" }}
            transition={{ duration: 1.5, delay: delay + 0.1, ease: "circOut" }}
          />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);
