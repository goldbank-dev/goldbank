import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Upload, CheckCircle2, Clock, AlertCircle,
  FileText, UserCheck, ShieldAlert, Loader2, XCircle,
  Camera, RefreshCw, ChevronRight, ScanFace, ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type KycStatus = 'not_started' | 'pending_upload' | 'under_review' | 'approved' | 'rejected';
type Step = 'front' | 'back' | 'selfie' | 'sending' | 'done';

// Converte File/Blob para base64 sem prefixo data:...
async function toBase64(file: File | Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res((reader.result as string).split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// Captura frame da webcam como base64
async function captureFrame(video: HTMLVideoElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

const STEP_META: Record<Step, { label: string; icon: any; desc: string }> = {
  front:   { label: 'Frente do documento', icon: FileText,  desc: 'RG ou CNH — lado frente' },
  back:    { label: 'Verso do documento',  icon: FileText,  desc: 'RG ou CNH — lado verso' },
  selfie:  { label: 'Selfie com documento',icon: ScanFace,  desc: 'Segure o documento próximo ao rosto' },
  sending: { label: 'Enviando...',         icon: Loader2,   desc: 'Aguarde enquanto processamos' },
  done:    { label: 'Enviado!',            icon: CheckCircle2, desc: 'Em análise pela Asaas' },
};

export default function KYCPage() {
  const [kycStatus, setKycStatus]   = useState<KycStatus>('not_started');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading]       = useState(true);
  const [step, setStep]             = useState<Step>('front');
  const [frontB64, setFrontB64]     = useState('');
  const [backB64, setBackB64]       = useState('');
  const [selfieB64, setSelfieB64]   = useState('');
  const [cameraOn, setCameraOn]     = useState(false);
  const [cameraErr, setCameraErr]   = useState('');
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ── Carrega status KYC atual ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles').select('kyc_status').eq('user_id', user.id).maybeSingle();
      const { data: doc } = await supabase
        .from('kyc_documents').select('status, review_notes')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

      const raw = (profile?.kyc_status ?? doc?.status ?? 'not_started').toLowerCase();
      const map: Record<string, KycStatus> = {
        not_started: 'not_started', pending: 'under_review',
        under_review: 'under_review', approved: 'approved',
        rejected: 'rejected',
      };
      setKycStatus(map[raw] ?? 'not_started');
      if (doc?.review_notes) setReviewNotes(doc.review_notes);
      setLoading(false);
    })();
  }, []);

  // ── Câmera ───────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: step === 'selfie' ? 'user' : 'environment', width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setCameraErr('Câmera não disponível. Use o upload de arquivo abaixo.');
    }
  }, [step]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    const b64 = await captureFrame(videoRef.current);
    applyImage(b64);
    stopCamera();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Máximo 10MB.' });
      return;
    }
    const b64 = await toBase64(file);
    applyImage(b64);
    e.target.value = '';
  };

  const applyImage = (b64: string) => {
    if (step === 'front')  { setFrontB64(b64);  setStep('back'); }
    if (step === 'back')   { setBackB64(b64);   setStep('selfie'); }
    if (step === 'selfie') { setSelfieB64(b64); }
  };

  // ── Envio para Asaas via Edge Function ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!frontB64 || !backB64 || !selfieB64) {
      toast({ variant: 'destructive', title: 'Faltam documentos', description: 'Envie frente, verso e selfie.' });
      return;
    }
    setStep('sending');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kyc-upload`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body:    JSON.stringify({ frontBase64: frontB64, backBase64: backB64, selfieBase64: selfieB64 }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw result;
      setKycStatus('under_review');
      setStep('done');
      toast({ title: '✅ Documentos enviados!', description: result.message ?? 'Análise em até 24h.' });
    } catch (err: any) {
      setStep('selfie');
      toast({ variant: 'destructive', title: 'Erro no envio', description: err?.error ?? 'Tente novamente.' });
    }
  };

  const reset = () => {
    setFrontB64(''); setBackB64(''); setSelfieB64('');
    setStep('front'); stopCamera();
    setKycStatus('not_started');
  };

  // ── Renderização condicional por status ──────────────────────────────────────
  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black italic tracking-tighter">Verificação de Identidade</h1>
          <p className="text-muted-foreground mt-1">KYC obrigatório para saques e limites maiores.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="md:col-span-2 space-y-6">

            {/* ── APROVADO ───────────────────────────────────────────────── */}
            {kycStatus === 'approved' && (
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-7 h-7 text-green-400" />
                  </div>
                  <div>
                    <p className="font-black text-green-400 text-lg">Identidade Verificada</p>
                    <p className="text-sm text-green-400/70">Sua conta tem acesso completo a todas as funcionalidades.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── EM ANÁLISE ─────────────────────────────────────────────── */}
            {kycStatus === 'under_review' && (
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-7 h-7 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-black text-amber-400 text-lg">Em Análise</p>
                    <p className="text-sm text-amber-400/70">Documentos enviados. Prazo: até 24 horas úteis.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── REJEITADO ──────────────────────────────────────────────── */}
            {kycStatus === 'rejected' && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                      <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <p className="font-black text-red-400 text-lg">Documentação Rejeitada</p>
                      {reviewNotes && <p className="text-sm text-red-400/70">Motivo: {reviewNotes}</p>}
                    </div>
                  </div>
                  <Button onClick={reset} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <RefreshCw className="w-4 h-4 mr-2" /> Enviar novamente
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── FLUXO DE UPLOAD ────────────────────────────────────────── */}
            {(kycStatus === 'not_started' || kycStatus === 'pending_upload') && step !== 'done' && (
              <Card className="bg-neutral-900/50 border-white/5">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {/* Steps indicator */}
                    {(['front','back','selfie'] as Step[]).map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                          step === s ? "bg-primary text-black scale-110" :
                          (frontB64 && s === 'front') || (backB64 && s === 'back') || (selfieB64 && s === 'selfie')
                            ? "bg-green-500 text-black" : "bg-white/10 text-white/40"
                        )}>
                          {(frontB64 && s === 'front') || (backB64 && s === 'back') || (selfieB64 && s === 'selfie')
                            ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        {i < 2 && <ChevronRight className="w-3 h-3 text-white/20" />}
                      </div>
                    ))}
                  </div>
                  <CardTitle className="flex items-center gap-2 mt-2">
                    {(() => { const M = STEP_META[step]; return <><M.icon className="w-5 h-5 text-primary" />{M.label}</>; })()}
                  </CardTitle>
                  <CardDescription>{STEP_META[step].desc}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {step === 'sending' && (
                    <div className="flex flex-col items-center py-12 gap-4">
                      <Loader2 className="w-12 h-12 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Enviando para Asaas... Aguarde.</p>
                    </div>
                  )}

                  {step !== 'sending' && (
                    <>
                      {/* Preview da imagem capturada */}
                      {((step === 'back' && frontB64) || (step === 'selfie' && backB64)) && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-xs text-green-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          {step === 'back' ? 'Frente capturada ✓' : 'Verso capturado ✓'}
                        </div>
                      )}

                      {/* Câmera */}
                      {cameraOn ? (
                        <div className="space-y-3">
                          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/10">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            {step === 'selfie' && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-48 h-64 border-2 border-primary/60 rounded-full opacity-50" />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleCapture} className="flex-1 bg-primary text-black font-bold">
                              <Camera className="w-4 h-4 mr-2" />
                              {step === 'selfie' ? 'Tirar selfie' : 'Capturar'}
                            </Button>
                            <Button onClick={stopCamera} variant="outline" className="border-white/10">
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cameraErr && (
                            <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                              ⚠️ {cameraErr}
                            </p>
                          )}
                          {/* Área de captura */}
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={startCamera}
                              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-primary/30 rounded-2xl hover:border-primary/60 hover:bg-primary/5 transition-all group"
                            >
                              <Camera className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-bold text-primary">Usar câmera</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-white/10 rounded-2xl hover:border-white/30 hover:bg-white/5 transition-all group"
                            >
                              <ImageIcon className="w-8 h-8 text-white/40 group-hover:text-white/70 transition-colors" />
                              <span className="text-xs font-bold text-white/40 group-hover:text-white/70">Enviar arquivo</span>
                            </button>
                          </div>
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          <p className="text-[10px] text-center text-white/20">PNG, JPG — Máx. 10MB</p>
                        </div>
                      )}

                      {/* Preview selfie + botão de envio */}
                      {step === 'selfie' && selfieB64 && (
                        <div className="space-y-4">
                          <div className="relative rounded-2xl overflow-hidden border border-primary/20 aspect-video bg-black">
                            <img src={`data:image/jpeg;base64,${selfieB64}`} alt="selfie" className="w-full h-full object-cover" />
                            <Badge className="absolute top-2 right-2 bg-primary text-black font-bold">Preview</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSubmit}
                              className="flex-1 bg-primary text-black font-bold h-12 text-base"
                            >
                              <ShieldCheck className="w-5 h-5 mr-2" /> Enviar para verificação
                            </Button>
                            <Button
                              onClick={() => setSelfieB64('')}
                              variant="outline"
                              className="border-white/10 h-12"
                            >
                              Refazer
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── ENVIADO COM SUCESSO ─────────────────────────────────────── */}
            {step === 'done' && (
              <Card className="bg-neutral-900/50 border-white/5">
                <CardContent className="flex flex-col items-center py-12 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <p className="font-black text-xl text-green-400">Documentos enviados!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A Asaas analisará sua identidade em até 24 horas úteis.<br />
                      Você será notificado por email quando aprovado.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            <Card className="bg-neutral-900/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Por que verificar?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: UserCheck, title: 'Maior Segurança', desc: 'Protege sua conta contra fraudes.' },
                  { icon: FileText,  title: 'Limites Elevados', desc: 'Operações até R$ 100.000/dia.' },
                  { icon: AlertCircle, title: 'Saques Rápidos', desc: 'PIX liberado sem restrições.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{title}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}

                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 mt-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-400 leading-relaxed">
                    Sem verificação: limite de R$ 1.000/mês e sem saques.
                  </p>
                </div>

                {/* Checklist documentos */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Documentos aceitos</p>
                  {['RG (frente e verso)', 'CNH (frente e verso)', 'Selfie segurando o documento'].map(d => (
                    <div key={d} className="flex items-center gap-2 text-[11px] text-white/50">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> {d}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
