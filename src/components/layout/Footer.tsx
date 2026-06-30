import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";

export const Footer = () => {
  return (
    <footer className="py-12 border-t border-white/5 bg-background">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="mb-6 block">
              <Logo size="lg" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              A GoldBank é uma plataforma de tecnologia financeira focada na custódia e tokenização de metais preciosos. Todos os ativos GTK são garantidos por lastro físico auditado.
            </p>
            <p className="text-xs text-muted-foreground">© 2026 GoldBank. Todos os direitos reservados. CNPJ 00.000.000/0001-00</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contato</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>contato@goldbank.com.br</li>
              <li>Suporte 24/7 via App</li>
              <li>São Paulo, SP - Brasil</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Política de Privacidade (LGPD)</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/cookies" className="hover:text-primary transition-colors">Aviso de Cookies</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Security Seals */}
        <div className="pt-8 border-t border-white/5">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 group cursor-help">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">SSL Secure</span>
            </div>
            <div className="flex items-center gap-2 group cursor-help">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 group cursor-help">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:border-green-500/50 transition-colors">
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">PCI-DSS Ready</span>
            </div>
            <div className="flex items-center gap-2 group cursor-help">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:border-amber-500/50 transition-colors">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">256-bit AES</span>
            </div>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-white/5 text-center space-y-2">
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Investimento em ouro envolve riscos. Consulte um profissional financeiro.</p>
          <p className="text-xs text-muted-foreground">
            Plataforma desenvolvida pela{" "}
            <a
              href="https://www.santek.dev.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Santek
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
