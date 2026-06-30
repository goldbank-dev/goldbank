import { CheckCircle } from "lucide-react";

interface TransparencySectionProps {
  badges: Array<{
    label: string;
    desc: string;
  }>;
}

export const TransparencySection = ({ badges }: TransparencySectionProps) => {
  return (
    <section className="py-24 bg-background relative overflow-hidden" id="seguranca">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="container px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Transparência <span className="text-primary">Total</span></h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-16 text-lg">
          Estamos criando o padrão ouro da economia digital, unindo a imutabilidade da blockchain com a tangibilidade dos ativos minerais.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {badges.map((badge, i) => (
            <div key={i} className="glass p-6 rounded-2xl border border-primary/20 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                <CheckCircle className="text-primary w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm mb-1">{badge.label}</h4>
              <p className="text-xs text-muted-foreground">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
