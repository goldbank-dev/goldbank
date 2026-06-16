import { Navbar } from "@/components/landing/Navbar";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Fingerprint, Scale } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BreadcrumbSEO } from "@/components/BreadcrumbSEO";


const Legal = () => {
  const { pathname } = useLocation();
  const isPrivacy = pathname === "/privacy";

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO 
        title={isPrivacy ? "Política de Privacidade" : "Termos de Uso"} 
        description={isPrivacy ? "Nossa política de privacidade e compromisso com a LGPD." : "Termos e condições de uso da plataforma Gold Bank."}
      />
      <BreadcrumbSEO />
      <Navbar />

      <main className="container px-4 pt-32 pb-24 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-santek-gold/10 text-santek-gold px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-santek-gold/20">
              Conformidade Legal
            </span>
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-500/20">
              LGPD 2026
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">
            {isPrivacy ? "Política de Privacidade" : "Termos e Condições"}
          </h1>
          <p className="text-muted-foreground mb-12">Transparência total sobre como operamos como sua instituição de ativos digitais.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-santek-gold mb-4" />
              <h3 className="font-bold text-white mb-2">Segurança Bancária</h3>
              <p className="text-xs text-white/40">Criptografia de ponta a ponta em todas as operações de custódia e transferência.</p>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <Fingerprint className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="font-bold text-white mb-2">Dados Protegidos</h3>
              <p className="text-xs text-white/40">Seus dados pessoais nunca são compartilhados. Você tem controle total sob a LGPD.</p>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <Scale className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="font-bold text-white mb-2">Regulamentação</h3>
              <p className="text-xs text-white/40">Operamos sob rigorosos padrões de conformidade para ativos tokenizados.</p>
            </div>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-12 text-muted-foreground bg-white/5 p-8 md:p-12 rounded-3xl border border-white/10">
            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-santek-gold flex items-center justify-center text-black text-sm">01</span>
                Transparência e Consentimento
              </h2>
              <p>
                Como sua plataforma de ativos lastreados (GTK), a GoldBank prioriza o consentimento livre e informado. Ao utilizar nosso sistema, você concorda com o processamento de dados necessários para a manutenção de sua conta e registro de suas transações no ledger double-entry.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-santek-gold flex items-center justify-center text-black text-sm">02</span>
                Proteção de Dados (LGPD)
              </h2>
              <p>
                Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantimos o direito de acesso, correção, anonimização ou exclusão de seus dados. Utilizamos as informações de KYC (Know Your Customer) exclusivamente para prevenir fraudes e garantir a segurança do ecossistema.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-santek-gold flex items-center justify-center text-black text-sm">03</span>
                Ativos e Tokenização
              </h2>
              <p>
                A moeda GTK é um ativo digital lastreado em reserva física. Nossas políticas bancárias internas garantem que para cada GTK emitido, exista o equivalente em custódia segura, auditada e registrada em nosso livro-razão (ledger) digital.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-santek-gold flex items-center justify-center text-black text-sm">04</span>
                Segurança de Acesso
              </h2>
              <p>
                O acesso à conta é pessoal e intransferível. Recomendamos o uso de autenticação de dois fatores (2FA). Tentativas de acesso não autorizado ou manipulação de saldos via ledger serão registradas e reportadas conforme as normas de auditoria bancária vigentes.
              </p>
            </section>
          </div>

          <div className="mt-12 text-center text-xs text-white/20">
            GoldBank &copy; 2026 • Todos os direitos reservados • CNPJ 00.000.000/0001-00
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Legal;
