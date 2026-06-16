import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, X, FileText, Check, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

export const ConsentBanner = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<'banner' | 'details'>('banner');
  const [consents, setConsents] = useState({
    essential: true,
    analytics: true,
    marketing: false,
    banking: true
  });

  useEffect(() => {
    const consent = localStorage.getItem("gd-consent-v1");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("gd-consent-v1", "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-8 md:max-w-lg"
        >
          <Card className="bg-neutral-900/95 border-white/10 backdrop-blur-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-santek-gold/20 via-santek-gold to-santek-gold/20" />
            
            <AnimatePresence mode="wait">
              {step === 'banner' ? (
                <motion.div 
                  key="banner"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-start gap-4"
                >
                  <div className="bg-santek-gold/10 p-2.5 rounded-xl shrink-0">
                    <ShieldCheck className="w-6 h-6 text-santek-gold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                      Portal de Privacidade
                      <span className="text-[10px] bg-santek-gold/20 text-santek-gold px-2 py-0.5 rounded-full uppercase tracking-widest font-black">LGPD 2026</span>
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed mb-6">
                      Sua segurança bancária começa com a proteção de seus dados. Utilizamos cookies e tecnologias de rastreamento para garantir a integridade de suas operações financeiras e conformidade com os regulamentos da LGPD.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={handleAccept}
                        className="flex-1 bg-white text-black hover:bg-white/90 font-bold rounded-xl h-11"
                      >
                        Aceitar Tudo
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setStep('details')}
                        className="flex-1 text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-xs h-11 border border-white/5"
                      >
                        Configurar Preferências
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-6">
                      <Link to="/terms" className="text-[10px] text-white/30 hover:text-santek-gold transition-colors flex items-center gap-1">
                        <FileText size={10} /> Termos Bancários
                      </Link>
                      <Link to="/privacy" className="text-[10px] text-white/30 hover:text-santek-gold transition-colors flex items-center gap-1">
                        <Lock size={10} /> Política de Dados
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-bold text-sm">Preferências de Privacidade</h4>
                    <Button variant="ghost" size="sm" onClick={() => setStep('banner')} className="text-white/40 h-8 px-2">Voltar</Button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'essential', label: 'Essenciais e Segurança', desc: 'Necessários para o funcionamento do banco e ledger.', required: true },
                      { id: 'banking', label: 'Operações Bancárias', desc: 'Dados de KYC e validação de transações RWA.', required: true },
                      { id: 'analytics', label: 'Análise de Performance', desc: 'Melhorias na experiência do app e dashboard.', required: false },
                      { id: 'marketing', label: 'Comunicações VIP', desc: 'Alertas de cotação e oportunidades exclusivas.', required: false }
                    ].map((pref) => (
                      <div key={pref.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <Checkbox 
                          id={pref.id} 
                          checked={consents[pref.id as keyof typeof consents]} 
                          disabled={pref.required}
                          onCheckedChange={(checked) => setConsents({...consents, [pref.id]: !!checked})}
                          className="mt-1 border-white/20 data-[state=checked]:bg-santek-gold data-[state=checked]:text-black"
                        />
                        <div className="flex-1">
                          <label htmlFor={pref.id} className="text-xs font-bold text-white block mb-0.5 cursor-pointer">
                            {pref.label} {pref.required && <span className="text-[9px] text-santek-gold font-normal opacity-60 ml-1">(Obrigatório)</span>}
                          </label>
                          <p className="text-[10px] text-white/40">{pref.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={handleAccept}
                    className="w-full bg-santek-gold text-black hover:bg-santek-gold/90 font-bold rounded-xl h-11"
                  >
                    Salvar e Confirmar Escolhas
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button 
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 text-white/10 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
