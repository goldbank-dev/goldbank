import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const PaginationControls = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationControlsProps) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 md:p-4 bg-neutral-900/40 border border-white/5 rounded-xl",
        className
      )}
    >
      <div className="flex items-center justify-between md:justify-start gap-3 text-xs text-white/60">
        <span className="font-mono">
          {start}–{end} de <span className="text-white font-bold">{totalItems}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold hidden sm:inline">Por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              onPageSizeChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-9 w-[78px] bg-white/5 border-white/10 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/10 text-white">
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-white/10 bg-white/5 rounded-lg"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          aria-label="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-white/10 bg-white/5 rounded-lg"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-mono px-3 text-white/80 min-w-[80px] text-center">
          {safePage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-white/10 bg-white/5 rounded-lg"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-white/10 bg-white/5 rounded-lg"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          aria-label="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
