import { LucideIcon, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 gap-4 bg-neutral-900/40 border border-dashed border-white/10 rounded-2xl",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/40">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-bold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-white/50 leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-2 bg-primary text-black font-bold rounded-xl h-10 px-6 hover:scale-105 transition-transform"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
