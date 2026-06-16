import { motion } from "framer-motion";
import { Shield } from "lucide-react";

interface PhysicalAssetSectionProps {
  goldVault: string;
  items: Array<{
    icon: any;
    title: string;
    desc: string;
  }>;
}

export const PhysicalAssetSection = ({ goldVault, items }: PhysicalAssetSectionProps) => {
  return (
    <section className="py-24 bg-gradient-to-b from-transparent to-primary/5" id="sobre">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 md:order-1"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-amber-600 rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <img 
                src={goldVault}
                alt="Interior de cofre de segurança máxima com barras de ouro fino auditadas, lastreando os ativos digitais do GoldBank" 
                loading="lazy"
                decoding="async"
                width={640}
                height={448}
                className="relative rounded-3xl border border-primary/20 shadow-2xl w-full h-auto object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
              <div className="absolute -bottom-10 -left-10 hidden lg:block">
                <div className="glass p-6 rounded-2xl border border-primary/20 shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="text-primary w-5 h-5" />
                    <span className="font-bold">100% Auditado</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Reservas físicas verificadas em tempo real.</p>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 md:order-2"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Onde seu <span className="text-primary">GTK Realmente Está</span></h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              O Gold Bank opera sob o modelo de <strong>Lastro Físico 1:1</strong>. Para cada GTK digitalizado, existe uma grama de ouro físico em custódia institucional, auditada e guardada em cofres de segurança máxima.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
