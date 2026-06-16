import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "O que é o Gold Bank e como ele funciona?",
    answer: "O Gold Bank é uma plataforma de tokenização de ativos reais (RWA) focada em ouro. Nós transformamos barras físicas de ouro em tokens digitais (GTK), permitindo que você invista, armazene e transacione ouro com a facilidade de um clique, mantendo o lastro físico real em cofres de alta segurança."
  },
  {
    question: "Onde o ouro físico fica armazenado?",
    answer: "Todo o ouro que lastreia os tokens GTK é armazenado em cofres de segurança máxima de parceiros globais como a Brink's, com auditorias regulares para garantir a integridade do estoque físico."
  },
  {
    question: "Posso resgatar meu ouro físico?",
    answer: "Sim. O Gold Bank oferece a possibilidade de resgate físico para detentores de tokens GTK, respeitando as quantidades mínimas de barras padrão de mercado e os custos logísticos de entrega segura."
  },
  {
    question: "Quais são as taxas aplicadas?",
    answer: "Nossa estrutura de taxas é transparente e competitiva, cobrindo a custódia, seguro e a taxa de transação na rede. Detalhes específicos podem ser consultados na sua área logada ou no contrato de termos de uso."
  },
  {
    question: "Como é garantida a segurança digital?",
    answer: "Utilizamos criptografia de nível bancário (256-bit AES), autenticação de dois fatores e tecnologia blockchain para garantir que todas as transações sejam imutáveis, transparentes e rastreáveis."
  }
];

export const FAQ = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_DATA.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <section className="py-24 bg-background" id="faq">
      <SEO jsonLd={faqJsonLd} />
      <div className="container px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Dúvidas <span className="text-primary">Frequentes</span>
          </h2>
          <p className="text-muted-foreground">
            Encontre respostas para as principais perguntas sobre o ecossistema Gold Bank e a tokenização de ouro.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {FAQ_DATA.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AccordionItem value={`item-${index}`} className="border border-primary/20 rounded-2xl px-6 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-6">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
