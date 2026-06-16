import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  Search,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { 
  useProfile, 
  useNotifications, 
  useKYCStatus, 
  usePrefetchData 
} from "@/hooks/use-dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { BreadcrumbSEO } from "@/components/BreadcrumbSEO";


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { prefetchTransactions } = usePrefetchData();

  const { data: profile } = useProfile();
  const { data: notifications = [] } = useNotifications();
  const { data: kycStatus = 'pending' } = useKYCStatus();

  useEffect(() => {
    // Subscribe to notifications and KYC changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          toast({
            title: payload.new.title,
            description: payload.new.message,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kyc_documents' },
        () => queryClient.invalidateQueries({ queryKey: ["kyc-status"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear(); // Clear cache on logout
    navigate("/");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Carteira", href: "/dashboard/wallet", icon: Wallet },
    { name: "Extrato", href: "/dashboard/statement", icon: Clock },
    { name: "Auditoria", href: "/dashboard/audit", icon: ShieldAlert },
    { name: "Negociar", href: "/dashboard/trade", icon: ArrowLeftRight },
    { name: "Verificação", href: "/dashboard/kyc", icon: ShieldCheck },
    { name: "Configurações", href: "/dashboard/settings", icon: Settings },
  ];

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn("flex flex-col h-full bg-neutral-950 border-r border-white/5", className)}>
      <div className="p-6">
        <Logo size="md" />
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onMouseEnter={() => {
              if (item.href === "/dashboard/wallet" || item.href === "/dashboard/statement") {
                prefetchTransactions();
              }
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
              location.pathname === item.href 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              location.pathname === item.href ? "text-primary" : "group-hover:text-white"
            )} />
            {item.name}
            {location.pathname === item.href && (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className={cn(
          "rounded-2xl p-4 mb-4",
          kycStatus === 'approved' ? "bg-green-500/10 border border-green-500/20" :
          kycStatus === 'under_review' ? "bg-amber-500/10 border border-amber-500/20" :
          kycStatus === 'rejected' ? "bg-red-500/10 border border-red-500/20" : "bg-white/5"
        )}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status da Conta</p>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              kycStatus === 'approved' ? "bg-green-500 animate-pulse" :
              kycStatus === 'under_review' ? "bg-amber-500 animate-pulse" :
              kycStatus === 'rejected' ? "bg-red-500" : "bg-neutral-600"
            )} />
            <span className="text-xs font-medium capitalize">
              {kycStatus === 'approved' ? 'Verificada' : 
               kycStatus === 'under_review' ? 'Em Análise' :
               kycStatus === 'rejected' ? 'Rejeitada' : 'Não Verificada'}
            </span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-red-500 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex">
      <BreadcrumbSEO />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0">
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden hover:bg-white/5 transition-colors" aria-label="Abrir menu lateral">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-none w-72 bg-neutral-950">
                <Sidebar />
              </SheetContent>
            </Sheet>
            
            <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 w-64 lg:w-96 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
              <Search className="w-4 h-4 text-white/20" />
              <input 
                type="text" 
                placeholder="Pesquisar ativos, ordens..." 
                className="bg-transparent border-none outline-none text-xs w-full placeholder:text-white/20 text-white"
                aria-label="Campo de pesquisa"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-white">
                  <Bell className="w-5 h-5" />
                  {notifications.some(n => !n.is_read) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-neutral-900 border-white/10 text-white">
                <DropdownMenuLabel className="flex justify-between items-center">
                  Notificações
                  {notifications.some(n => !n.is_read) && (
                    <span className="text-[10px] bg-primary text-black px-1.5 py-0.5 rounded-full font-bold">
                      {notifications.filter(n => !n.is_read).length} Novas
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      Nenhuma notificação por enquanto.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem 
                        key={n.id} 
                        className={cn(
                          "flex flex-col items-start gap-1 p-4 border-b border-white/5 cursor-default focus:bg-white/5",
                          !n.is_read ? "bg-primary/5" : ""
                        )}
                        onSelect={() => markAsRead(n.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            n.type === 'success' ? "bg-green-500" : n.type === 'error' ? "bg-red-500" : "bg-blue-500"
                          )} />
                          <p className="font-bold text-xs truncate flex-1">{n.title}</p>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-3.5">
                          {n.message}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="h-8 w-px bg-white/10" />
            
            <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-white/10 group cursor-pointer" onClick={() => navigate("/dashboard/settings")}>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold truncate max-w-[150px] group-hover:text-primary transition-colors">{profile?.display_name || "Investidor"}</p>
                <div className="flex items-center justify-end gap-1">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <p className="text-[9px] text-primary/60 font-bold uppercase tracking-widest">Conta Prime</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-amber-600 p-[1.5px] transition-transform duration-300 group-hover:scale-110">
                <div className="w-full h-full rounded-[14px] bg-black flex items-center justify-center font-bold text-xs text-white">
                  {profile?.display_name?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
