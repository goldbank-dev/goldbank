import { Smartphone, Apple, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

interface PwaExperienceSectionProps {
  goldTokenization: string;
}

export const PwaExperienceSection = ({ goldTokenization }: PwaExperienceSectionProps) => {
  return (
    <section className="py-24 bg-black overflow-hidden" id="pwa">
      <div className="container px-4">
        <div className="bg-gradient-to-br from-neutral-900 to-black p-8 md:p-16 rounded-[2rem] border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-santek-gold/10 rounded-full blur-[100px] group-hover:bg-santek-gold/20 transition-colors duration-1000" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-santek-gold/10 text-santek-gold p-2 rounded-lg">
                  <Smartphone size={20} />
                </span>
                <span className="text-santek-gold font-bold tracking-widest text-xs uppercase">App Experience</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-6 italic leading-tight">
                Leve o <span className="text-santek-gold">GoldBank</span> <br />Sempre com Você
              </h2>
              <p className="text-lg text-white/60 mb-8 max-w-lg">
                Instale nosso Web App (PWA) e tenha acesso instantâneo ao seu ouro digital diretamente da tela inicial, sem precisar de lojas de aplicativos.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Apple className="w-5 h-5 text-white/40" />
                  <div>
                    <h4 className="text-xs font-bold text-white">iOS / iPhone</h4>
                    <p className="text-[10px] text-white/40">Compartilhar {"->"} Tela de Início</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Download className="w-5 h-5 text-white/40" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Android / Chrome</h4>
                    <p className="text-[10px] text-white/40">Menu {"->"} Instalar Aplicativo</p>
                  </div>
                </div>
              </div>

              <Button className="w-full sm:w-auto bg-white text-black hover:bg-white/90 font-bold rounded-xl px-8 h-12">
                Como Instalar Agora
              </Button>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] bg-neutral-800 rounded-[2.5rem] border-[8px] border-neutral-900 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-neutral-900/40 to-black/80 z-10" />
                <img 
                  src={goldTokenization} 
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={500}
                  className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-1000"
                  alt="Interface mobile do aplicativo GoldBank PWA em smartphone mostrando saldo de ouro digital"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center">
                  <Logo size="lg" className="mb-4" />
                  <p className="text-santek-gold font-bold italic mb-2">Sua Carteira de Ouro</p>
                  <div className="w-32 h-1 bg-santek-gold/30 rounded-full" />
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-santek-gold/30 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
