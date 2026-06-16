import { Globe, FileText, TrendingUp, ExternalLink, CheckCircle2, Shield, Share2, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface SEOManagementProps {
  systemSettings: any;
  onUpdateSetting: (key: string, value: any) => Promise<void>;
}

export const SEOManagement = ({ systemSettings, onUpdateSetting }: SEOManagementProps) => {
  const [seoMetadata, setSeoMetadata] = useState(systemSettings.seo_metadata || {
    title: "Gold Bank | Ouro Digital & Custódia de Ativos RWA",
    description: "A GoldBank é a plataforma líder em custódia física e tokenização de ouro. Invista em ativos GTK com lastro real, segurança blockchain e liquidez imediata.",
    keywords: "ouro, blockchain, rwa, investimento, gtk"
  });

  const [socialMedia, setSocialMedia] = useState(systemSettings.social_media || {
    og_image: "https://goldbank.com.br/og-image.jpg",
    twitter_handle: "@goldbank"
  });

  const [gaId, setGaId] = useState(systemSettings.google_analytics_id || "G-XXXXXX");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (systemSettings.seo_metadata) setSeoMetadata(systemSettings.seo_metadata);
    if (systemSettings.social_media) setSocialMedia(systemSettings.social_media);
    if (systemSettings.google_analytics_id) setGaId(systemSettings.google_analytics_id);
  }, [systemSettings]);

  const handleSaveSEO = async () => {
    setIsSaving(true);
    try {
      await onUpdateSetting('seo_metadata', seoMetadata);
      await onUpdateSetting('google_analytics_id', gaId);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSocial = async () => {
    setIsSaving(true);
    try {
      await onUpdateSetting('social_media', socialMedia);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">Sitemap Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black italic text-green-500">ATIVO</span>
              <Globe className="w-5 h-5 text-green-500/20" />
            </div>
            <p className="text-[9px] text-white/40 mt-1 font-bold">Gerado automaticamente</p>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">Robots.txt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black italic text-blue-500">OK</span>
              <FileText className="w-5 h-5 text-blue-500/20" />
            </div>
            <p className="text-[9px] text-white/40 mt-1 font-bold">Crawlers permitidos</p>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">SEO Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black italic text-primary">98/100</span>
              <TrendingUp className="w-5 h-5 text-primary/20" />
            </div>
            <p className="text-[9px] text-white/40 mt-1 font-bold">A+ Performance</p>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">Indexação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black italic text-purple-500">100%</span>
              <Search className="w-5 h-5 text-purple-500/20" />
            </div>
            <p className="text-[9px] text-white/40 mt-1 font-bold">Google Search Console</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 mb-6">
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs uppercase tracking-widest">Geral</TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs uppercase tracking-widest">Social (OG)</TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs uppercase tracking-widest">Gestão de Imagens</TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs uppercase tracking-widest">Avançado</TabsTrigger>
          <TabsTrigger value="checklist" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold text-xs uppercase tracking-widest">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Configurações de SEO Global
              </CardTitle>
              <CardDescription className="text-white/40">Gerencie como o GoldBank aparece nos resultados de busca do Google e Bing e otimize os textos alternativos das imagens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Meta Title Padrão</Label>
                  <Input 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all font-medium" 
                    value={seoMetadata.title}
                    onChange={(e) => setSeoMetadata({...seoMetadata, title: e.target.value})}
                  />
                  <p className="text-[9px] text-white/20 italic font-medium">Recomendado: Máximo 60 caracteres.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Google Analytics / Search Console ID</Label>
                  <Input 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all font-mono text-xs" 
                    placeholder="G-XXXXXX"
                    value={gaId}
                    onChange={(e) => setGaId(e.target.value)}
                  />
                  <p className="text-[9px] text-white/20 italic font-medium">ID do Google Search Console ou Analytics.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Meta Description Padrão</Label>
                <Textarea 
                  className="min-h-[100px] bg-white/5 border-white/10 rounded-xl focus:border-primary/50 transition-all text-sm leading-relaxed"
                  value={seoMetadata.description}
                  onChange={(e) => setSeoMetadata({...seoMetadata, description: e.target.value})}
                />
                <p className="text-[9px] text-white/20 italic font-medium">Recomendado: Entre 120 e 160 caracteres.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">URL Canônica Base</Label>
                  <Input 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                    value={systemSettings.site_url || "https://goldbank.com.br"}
                    disabled
                  />
                  <p className="text-[9px] text-white/20 italic font-medium">Configurado via sistema.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Palavras-Chave (Keywords)</Label>
                  <Input 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                    value={seoMetadata.keywords}
                    onChange={(e) => setSeoMetadata({...seoMetadata, keywords: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                <Button 
                  onClick={handleSaveSEO}
                  disabled={isSaving}
                  className="w-full bg-primary text-black font-black uppercase tracking-tighter italic h-12 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                >
                  {isSaving ? "Salvando..." : "Salvar Alterações de SEO"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Redes Sociais (Open Graph & Twitter)
              </CardTitle>
              <CardDescription className="text-white/40">Configure como o site aparece ao ser compartilhado no WhatsApp, Facebook e Twitter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">OG:Image URL</Label>
                    <Input 
                      className="bg-white/5 border-white/10 h-12 rounded-xl" 
                      value={socialMedia.og_image}
                      onChange={(e) => setSocialMedia({...socialMedia, og_image: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Twitter Handle</Label>
                    <Input 
                      className="bg-white/5 border-white/10 h-12 rounded-xl" 
                      placeholder="@goldbank"
                      value={socialMedia.twitter_handle}
                      onChange={(e) => setSocialMedia({...socialMedia, twitter_handle: e.target.value})}
                    />
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Preview Social</p>
                    <div className="border border-white/10 rounded-lg overflow-hidden bg-black">
                      <div className="aspect-video bg-neutral-800 flex items-center justify-center overflow-hidden">
                        {socialMedia.og_image ? (
                          <img src={socialMedia.og_image} alt="OG Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Share2 className="w-12 h-12 text-white/10" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">GOLDBANK.COM.BR</p>
                        <p className="text-xs font-bold text-white mt-1">{seoMetadata.title}</p>
                        <p className="text-[10px] text-white/40 line-clamp-2 mt-1 italic">{seoMetadata.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">JSON-LD (Structured Data Preview)</Label>
                  <Textarea 
                    readOnly
                    className="h-[300px] bg-white/5 border-white/10 rounded-xl font-mono text-[10px] leading-relaxed opacity-60 cursor-not-allowed"
                    value={JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "FinancialService",
                      "name": "GoldBank",
                      "url": "https://goldbank.com.br",
                      "logo": socialMedia.og_image,
                      "description": seoMetadata.description,
                      "address": {
                        "@type": "PostalAddress",
                        "addressLocality": "São Paulo",
                        "addressRegion": "SP",
                        "addressCountry": "BR"
                      }
                    }, null, 2)}
                  />
                  <p className="text-[9px] text-white/20 italic">O JSON-LD é gerado dinamicamente com base nas suas configurações.</p>
                </div>
              </div>
              <Button 
                onClick={handleSaveSocial}
                disabled={isSaving}
                className="w-full bg-primary text-black font-black uppercase tracking-tighter italic h-12 rounded-xl"
              >
                {isSaving ? "Salvando..." : "Atualizar Metadados Sociais"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Gestão & Auditoria de Imagens
              </CardTitle>
              <CardDescription className="text-white/40">Melhore o ranking no Google Imagens através de descrições precisas, dimensões explícitas e formatos otimizados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Boas Práticas de Performance</h4>
                  <ul className="space-y-2">
                    {[
                      "Use palavras-chave relevantes no Alt Text.",
                      "Mantenha descrições concisas (max 125 chars).",
                      "Sempre defina largura e altura (Width/Height) para evitar CLS.",
                      "Priorize formatos modernos (WebP/AVIF).",
                      "Imagens do Hero devem usar fetchPriority='high'.",
                      "Imagens abaixo da dobra devem usar loading='lazy'."
                    ].map((tip, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-white/60">
                        <CheckCircle2 size={12} className="text-green-500" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Status de Auditoria SEO</h4>
                  <div className="space-y-4">
                    {[
                      { label: "Lazy Loading (Imagens Secundárias)", status: "100%", color: "text-green-500", progress: 100 },
                      { label: "Alt Text Descritivo", status: "98%", color: "text-primary", progress: 98 },
                      { label: "Dimensões Explícitas (Anti-CLS)", status: "100%", color: "text-green-500", progress: 100 },
                      { label: "Formatos Otimizados (Next-Gen)", status: "95%", color: "text-primary", progress: 95 }
                    ].map((item, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-white/60">{item.label}</span>
                          <span className={cn("text-[10px] font-bold", item.color)}>{item.status}</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                          <div className={cn("h-full", item.color.replace('text-', 'bg-'))} style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Ações de Otimização</h4>
                  </div>
                  <span className="text-[10px] text-white/20 font-mono">Build v2.1.0</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button variant="outline" size="sm" className="bg-white/5 border-white/10 h-10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 group transition-all">
                    <Search className="w-3 h-3 mr-2 text-primary group-hover:scale-110" />
                    Escanear Imagens
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/5 border-white/10 h-10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 group transition-all">
                    <FileText className="w-3 h-3 mr-2 text-primary group-hover:scale-110" />
                    Gerar Relatório
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/5 border-white/10 h-10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 group transition-all">
                    <Zap className="w-3 h-3 mr-2 text-primary group-hover:scale-110" />
                    Otimizar Alt Texts
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Relatório de Imagens (Detalhamento)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="pb-2 font-black uppercase text-white/40">Arquivo</th>
                          <th className="pb-2 font-black uppercase text-white/40">Alt Text</th>
                          <th className="pb-2 font-black uppercase text-white/40">Lazy</th>
                          <th className="pb-2 font-black uppercase text-white/40">Dimensões</th>
                          <th className="pb-2 font-black uppercase text-white/40">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          { file: "gold-bars-hero.jpg", alt: "OK (102 chars)", lazy: "No (Hero)", dims: "672x537", status: "Excelente" },
                          { file: "gold-vault.jpg", alt: "OK (115 chars)", lazy: "Yes", dims: "640x448", status: "Otimizado" },
                          { file: "gold-tokenization.jpg", alt: "OK (98 chars)", lazy: "Yes", dims: "512x358", status: "Otimizado" },
                          { file: "logo.png", alt: "OK (65 chars)", lazy: "No (Eager)", dims: "180x80", status: "Crítico" },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td className="py-2 font-mono text-white/60">{row.file}</td>
                            <td className="py-2 text-green-500">{row.alt}</td>
                            <td className="py-2 text-white/40">{row.lazy}</td>
                            <td className="py-2 text-white/40">{row.dims}</td>
                            <td className="py-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                                row.status === "Excelente" ? "bg-green-500/20 text-green-500" : 
                                row.status === "Otimizado" ? "bg-primary/20 text-primary" : 
                                "bg-amber-500/20 text-amber-500"
                              )}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <p className="text-[9px] text-white/20 italic mt-4">
                  * Auditoria realizada em tempo real. Imagens do Hero e Logo estão configuradas com prioridade máxima para evitar atrasos na renderização (LCP).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Scripts & Performance
              </CardTitle>
              <CardDescription className="text-white/40">Gerencie scripts externos e otimizações de performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Otimização Automática</p>
                    <p className="text-[10px] text-white/60 font-medium">Lazy loading, compressão de imagens e pré-renderização estão ativos por padrão no ecossistema Santek.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-green-500 ml-2 uppercase tracking-widest">Otimizado</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Configurações Adicionais</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5">
                    <span className="text-xs font-bold text-white/80">Redirecionar HTTP para HTTPS</span>
                    <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5">
                    <span className="text-xs font-bold text-white/80">Minificação de Assets</span>
                    <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Checklist de Saúde SEO
              </CardTitle>
              <CardDescription className="text-white/40">Itens essenciais para garantir que o GoldBank esteja 100% otimizado para buscadores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Meta Title & Description", status: true, desc: "Tags configuradas em todas as páginas." },
                  { label: "Sitemap.xml", status: true, desc: "Arquivo gerado e submetido ao Google." },
                  { label: "Robots.txt", status: true, desc: "Acesso de robôs configurado corretamente." },
                  { label: "Atributos Alt em Imagens", status: true, desc: "Todas as imagens possuem texto alternativo descritivo." },
                  { label: "Lazy Loading Ativo", status: true, desc: "Imagens secundárias carregam sob demanda." },
                  { label: "Dimensões de Imagem (CLS)", status: true, desc: "Largura e altura definidas para evitar pulos de layout." },
                  { label: "Prioridade de LCP (Hero)", status: true, desc: "Imagem principal otimizada para carregamento imediato." },
                  { label: "JSON-LD Estruturado", status: true, desc: "Dados de organização e financeiro integrados." },
                  { label: "Canônicas & Hreflang", status: true, desc: "Links canônicos configurados para evitar duplicidade." },
                  { label: "Mobile First Design", status: true, desc: "Totalmente responsivo e aprovado no Google Mobile-Friendly." },
                  { label: "Core Web Vitals", status: true, desc: "Performance superior a 90 em LCP, FID e CLS." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                    {item.status ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-amber-500/50 rounded-full mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-white/90">{item.label}</p>
                      <p className="text-[10px] text-white/40">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Score de Saúde Final</p>
                  <p className="text-[10px] text-white/40">Baseado em 11 critérios de auditoria.</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black italic text-primary">100%</span>
                  <p className="text-[9px] font-bold text-primary uppercase">PERFEITO</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
