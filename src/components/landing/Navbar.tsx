import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, TrendingUp, TrendingDown, Accessibility, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const TickerBar = () => {
  const [prices, setPrices] = useState<any[]>([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,pax-gold,binancecoin&vs_currencies=brl&include_24hr_change=true');
        const data = await res.json();
        const formatted = [
          { name: 'BTC/BRL', price: data.bitcoin.brl, change: data.bitcoin.brl_24h_change },
          { name: 'ETH/BRL', price: data.ethereum.brl, change: data.ethereum.brl_24h_change },
          { name: 'PAXG/BRL', price: data['pax-gold'].brl, change: data['pax-gold'].brl_24h_change },
          { name: 'USDT/BRL', price: data.tether.brl, change: data.tether.brl_24h_change },
          { name: 'GTK/BRL', price: 1250.45, change: 0.85 },
        ];
        setPrices(formatted);
      } catch (e) {
        console.error("Ticker error:", e);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  if (prices.length === 0) return null;

  return (
    <div className="w-full bg-black/40 backdrop-blur-md border-b border-white/5 py-1 overflow-hidden whitespace-nowrap relative">
      <div className="flex animate-infinite-scroll gap-12 px-4 items-center">
        {[...prices, ...prices].map((coin, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-tighter">
            <span className="text-white/40">{coin.name}</span>
            <span className="text-white/90 font-bold">R$ {coin.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className={cn("flex items-center", coin.change >= 0 ? "text-green-400" : "text-red-400")}>
              {coin.change >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
              {Math.abs(coin.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [vlibrasState, setVlibrasState] = useState<"idle" | "loading" | "active">("idle");
  const { t } = useTranslation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { name: t("nav.home"), href: "#" },
    { name: t("nav.backing"), href: "#lastro" },
    { name: t("nav.about"), href: "#sobre" },
    { name: t("nav.tokenization"), href: "#token" },
    { name: t("nav.vipList"), href: "#vip" },
  ];

  const openVLibras = () => {
    if (vlibrasState === "loading") return; // prevent double clicks while loading
    const wrapper = document.querySelector('[vw]') as HTMLElement | null;
    if (wrapper) {
      wrapper.classList.add('enabled', 'active');
      wrapper.style.display = 'block';
    }

    const tryClick = () => {
      const widget = document.querySelector('[vw-access-button]') as HTMLElement | null;
      if (widget) {
        widget.classList.add('active');
        widget.click();
        setVlibrasState("active");
        return true;
      }
      return false;
    };

    if (tryClick()) return;

    // Widget not ready: show loading and poll up to ~10s
    setVlibrasState("loading");
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (tryClick()) {
        window.clearInterval(interval);
      } else if (Date.now() - start > 10000) {
        window.clearInterval(interval);
        setVlibrasState("idle");
        console.warn("VLibras não carregou a tempo");
      }
    }, 300);
  };

  const vlibrasIcon =
    vlibrasState === "loading" ? (
      <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
    ) : vlibrasState === "active" ? (
      <Check className="w-6 h-6" aria-hidden="true" />
    ) : (
      <Accessibility className="w-6 h-6 group-hover/libras:scale-110 transition-transform" aria-hidden="true" />
    );

  const vlibrasLabel =
    vlibrasState === "loading"
      ? "Carregando VLibras…"
      : vlibrasState === "active"
      ? "VLibras ativo"
      : "Abrir acessibilidade em Libras (VLibras)";

  const vlibrasButtonClass = cn(
    "w-10 h-10 rounded-full text-primary transition-all duration-300 group/libras",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    vlibrasState === "loading" && "opacity-70 cursor-wait",
    vlibrasState === "active" && "bg-primary/15 ring-2 ring-primary/60 animate-pulse",
    vlibrasState === "idle" && "hover:bg-primary/10 hover:text-primary"
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <TickerBar />
      <nav className={cn(
        "transition-all duration-300 px-4",
        isScrolled ? "py-2" : "py-4"
      )}>
        <div className={cn(
          "container mx-auto flex items-center justify-between transition-all duration-300 rounded-full px-6 py-2",
          isScrolled ? "glass border-primary/20 shadow-lg" : "bg-transparent"
        )}>
          <Link to="/" className="shrink-0 group flex items-center">
            <Logo size="md" className="transition-transform duration-300 group-hover:scale-105" />
          </Link>


        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={vlibrasLabel}
            aria-busy={vlibrasState === "loading"}
            aria-pressed={vlibrasState === "active"}
            disabled={vlibrasState === "loading"}
            title={vlibrasLabel}
            className={vlibrasButtonClass}
            onClick={openVLibras}
          >
            {vlibrasIcon}
          </Button>
          {session ? (
            <Link to="/dashboard">
              <Button className="rounded-full px-6 font-bold gap-2">
                <LayoutDashboard className="w-4 h-4" /> {t("nav.clientPanel")}
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth?mode=login">
                <Button variant="ghost" className="text-sm font-medium">{t("common.login")}</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="rounded-full px-6 font-bold">{t("common.signup")}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-4 right-4 glass rounded-3xl p-8 border-primary/20 animate-fade-in">
          <div className="flex flex-col gap-6 items-center">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-lg font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <hr className="w-full border-white/10" />
            {session ? (
              <Link to="/dashboard" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full rounded-full gap-2 font-bold">
                  <LayoutDashboard className="w-4 h-4" /> {t("nav.dashboard")}
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth?mode=login" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full border-primary/30">{t("common.login")}</Button>
                </Link>
                <Link to="/auth?mode=signup" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full rounded-full font-bold">{t("common.signup")}</Button>
                </Link>
                <div className="flex justify-center items-center gap-4 w-full pt-2">
                  <LanguageSwitcher />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label={vlibrasLabel}
                    aria-busy={vlibrasState === "loading"}
                    aria-pressed={vlibrasState === "active"}
                    disabled={vlibrasState === "loading"}
                    title={vlibrasLabel}
                    className={vlibrasButtonClass}
                    onClick={() => {
                      openVLibras();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {vlibrasIcon}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </nav>
    </header>
  );
};
