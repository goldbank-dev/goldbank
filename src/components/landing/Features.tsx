import { Shield, Lock, Award, Eye, Zap, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";


export const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Shield,
      title: t("features.f1_title"),
      description: t("features.f1_desc")
    },
    {
      icon: Award,
      title: t("features.f2_title"),
      description: t("features.f2_desc")
    },
    {
      icon: Lock,
      title: t("features.f3_title"),
      description: t("features.f3_desc")
    },
    {
      icon: Eye,
      title: t("features.f4_title"),
      description: t("features.f4_desc")
    },
    {
      icon: Zap,
      title: t("features.f5_title"),
      description: t("features.f5_desc")
    },
    {
      icon: Globe,
      title: t("features.f6_title"),
      description: t("features.f6_desc")
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden" id="lastro">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.badge")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("features.description")}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
