import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { VipForm } from "@/components/landing/VipForm";
import { motion } from "framer-motion";
import { Globe, Lock, CheckCircle, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConsentBanner } from "@/components/LegalConsent";
import { SEO } from "@/components/SEO";
import { SEO_CONFIG } from "@/config/seo";
import goldVault from "@/assets/gold-vault.jpg";
import goldStack from "@/assets/gold-stack.jpg";
import goldTokenization from "@/assets/gold-tokenization.jpg";
import { PhysicalAssetSection } from "@/components/landing/PhysicalAssetSection";
import { TransparencySection } from "@/components/landing/TransparencySection";
import { PwaExperienceSection } from "@/components/landing/PwaExperienceSection";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/layout/Footer";
import { BreadcrumbSEO } from "@/components/BreadcrumbSEO";



const Index = () => {
  const { t } = useTranslation();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Gold Bank",
    "url": SEO_CONFIG.siteUrl,
    "logo": SEO_CONFIG.defaultOGImage,
    "sameAs": [
      "https://facebook.com/goldbank",
      "https://twitter.com/goldbank",
      "https://instagram.com/goldbank"
    ],
    "description": SEO_CONFIG.defaultDescription
  };

  const assetItems = [
    { icon: Globe, title: "Global", desc: "Acesso de qualquer lugar." },
    { icon: Lock, title: "Seguro", desc: "Custódia física auditada." },
    { icon: CheckCircle, title: "Validado", desc: "Tokenização RWA real." },
    { icon: Smartphone, title: "Digital", desc: "Gestão completa via App." }
  ];

  const transparencyBadges = [
    { label: "Criptografia SSL", desc: "256-bit AES" },
    { label: "Custódia Brinks", desc: "Seguro Total" },
    { label: "Blockchain", desc: "Transparência" },
    { label: "Auditoria 24/7", desc: "Tempo Real" }
  ];

  return (
    <div className="min-h-screen mesh-gradient selection:bg-primary selection:text-black">
      <SEO 
        title="Início" 
        jsonLd={organizationJsonLd}
      />
      <BreadcrumbSEO />


      <Navbar />

      <main>
        <Hero />
        
        <Features />
        
        <PhysicalAssetSection goldVault={goldVault} items={assetItems} />

        <TransparencySection badges={transparencyBadges} />

        <section className="py-24 bg-primary/5" id="token">
          <div className="container px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("eco.title").split(' ')[0]} <span className="text-primary">{t("eco.title").split(' ')[1]}</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
              {t("eco.description")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="group relative overflow-hidden rounded-3xl"
              >
                <img 
                  src={goldTokenization}
                  alt="Processo de digitalização de barras de ouro transformadas em tokens GTK com tecnologia blockchain segura" 
                  loading="lazy"
                  decoding="async"
                  width={512}
                  height={358}
                  className="border border-primary/20 opacity-90 shadow-2xl h-64 md:h-80 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8 transition-opacity duration-500 group-hover:from-black">
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="transform transition-transform duration-500 group-hover:-translate-y-2"
                  >
                    <p className="text-primary font-bold text-xs md:text-sm mb-1 tracking-[0.2em] uppercase drop-shadow-md">{t("eco.digital_gold")}</p>
                    <p className="text-white font-extrabold text-xl md:text-3xl leading-tight drop-shadow-lg">{t("eco.digital_assets")}</p>
                  </motion.div>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden rounded-3xl"
              >
                <img 
                  src={goldStack}
                  alt="Pilha organizada de barras de ouro fino em ambiente de custódia certificada" 
                  loading="lazy"
                  decoding="async"
                  width={512}
                  height={358}
                  className="border border-primary/20 opacity-90 shadow-2xl h-64 md:h-80 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8 transition-opacity duration-500 group-hover:from-black">
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="transform transition-transform duration-500 group-hover:-translate-y-2"
                  >
                    <p className="text-primary font-bold text-xs md:text-sm mb-1 tracking-[0.2em] uppercase drop-shadow-md">{t("eco.physical_assets")}</p>
                    <p className="text-white font-extrabold text-xl md:text-3xl leading-tight drop-shadow-lg">{t("eco.real_backing")}</p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <PwaExperienceSection goldTokenization={goldTokenization} />

        <FAQ />

        <VipForm />
        <ConsentBanner />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
