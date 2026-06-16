import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError, handleSuccess } from "@/utils/error-handler.tsx";
import { Loader2, ArrowLeft, Search, Smartphone, ShieldCheck, Mail, CheckCircle2, RefreshCw, KeyRound, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCpfCnpj } from "@/hooks/use-cpf-cnpj";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/ui/logo";
import { SEO } from "@/components/SEO";
import { BreadcrumbSEO } from "@/components/BreadcrumbSEO";

type AuthMode = "login" | "signup" | "recovery" | "verify-phone" | "email-sent" | "update-password";

// Formata telefone para exibição: (11) 99999-9999
function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// Converte para E.164 (+55...)
function toE164(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return `+${d}`;
  return `+55${d}`;
}

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(
    (searchParams.get("mode") as AuthMode) || "login"
  );

  // ── Campos de cadastro ──────────────────────────────────────────────────────
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [name,         setName]         = useState("");
  const [phone,        setPhone]        = useState("");
  const [docType,      setDocType]      = useState<"CPF" | "CNPJ">("CPF");
  const [document,     setDocument]     = useState("");
  const [cep,          setCep]          = useState("");
  const [street,       setStreet]       = useState("");
  const [number,       setNumber]       = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city,         setCity]         = useState("");
  const [stateUF,      setStateUF]      = useState("");

  // ── Update password ──────────────────────────────────────────────────────────
  const [newPassword,    setNewPassword]    = useState("");
  const [confirmPass,    setConfirmPass]    = useState("");
  const [showPass,       setShowPass]       = useState(false);

  // ── Email enviado ────────────────────────────────────────────────────────────
  const [sentToEmail,  setSentToEmail]  = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResendTimer, setEmailResendTimer] = useState(0);

  // ── Verificação OTP ─────────────────────────────────────────────────────────
  const [pendingPhone, setPendingPhone] = useState("");   // E.164 do telefone pendente
  const [otpDigits,    setOtpDigits]    = useState(["","","","","",""]);
  const [resendTimer,  setResendTimer]  = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Estado geral ────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(false);
  const [searchingDoc,  setSearchingDoc]  = useState(false);
  const [searchingCep,  setSearchingCep]  = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { validateCPF, validateCNPJ, fetchCnpjData, fetchCepData, formatDocument, formatCep } = useCpfCnpj();

  useEffect(() => {
    // Detecta link de reset de senha (#access_token=... ou ?mode=update-password)
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || searchParams.get('mode') === 'update-password') {
      setMode('update-password');
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate, searchParams]);

  // Timers de reenvio
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  useEffect(() => {
    if (emailResendTimer <= 0) return;
    const t = setTimeout(() => setEmailResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [emailResendTimer]);

  // ── CNPJ lookup ─────────────────────────────────────────────────────────────
  const handleCnpjSearch = async () => {
    if (document.replace(/\D/g, '').length !== 14) return;
    setSearchingDoc(true);
    const data = await fetchCnpjData(document);
    if (data) {
      setName(data.nome || data.razao_social || "");
      if (data.cep) {
        const c = data.cep.replace(/\D/g, '');
        setCep(formatCep(c));
        handleCepSearch(c);
      }
      setStreet(data.logradouro || "");
      setNumber(data.numero || "");
      setNeighborhood(data.bairro || "");
      setCity(data.municipio || "");
      setStateUF(data.uf || "");
      toast({ title: "Dados encontrados", description: "Campos preenchidos automaticamente." });
    }
    setSearchingDoc(false);
  };

  // ── CEP lookup ───────────────────────────────────────────────────────────────
  const handleCepSearch = async (cepValue?: string) => {
    const v = cepValue || cep.replace(/\D/g, '');
    if (v.length !== 8) return;
    setSearchingCep(true);
    const data = await fetchCepData(v);
    if (data) {
      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setStateUF(data.uf || "");
    } else {
      toast({ variant: "destructive", title: "CEP inválido", description: "Informe um CEP válido." });
      setCep("");
    }
    setSearchingCep(false);
  };

  // ── Enviar OTP ───────────────────────────────────────────────────────────────
  const sendOtp = async (phoneE164: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
    if (error) throw error;
    setPendingPhone(phoneE164);
    setMode("verify-phone");
    setResendTimer(60);
    setOtpDigits(["","","","","",""]);
  };

  // ── Submit principal ─────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const cleanDoc = document.replace(/\D/g, '');
        if (docType === "CPF") {
          if (cleanDoc.length !== 11) throw new Error("CPF deve ter 11 dígitos");
          if (!validateCPF(cleanDoc))  throw new Error("CPF inválido");
        } else {
          if (cleanDoc.length !== 14)  throw new Error("CNPJ deve ter 14 dígitos");
          if (!validateCNPJ(cleanDoc)) throw new Error("CNPJ inválido");
        }
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) throw new Error("CEP deve ter 8 dígitos");
        if (!street || !city || !stateUF) throw new Error("Endereço incompleto. Verifique o CEP.");

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) throw new Error("Telefone inválido. Use DDD + número.");

        // 1. Cria conta no Supabase
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?mode=login`,
            data: {
              display_name: name,
              document_type: docType,
              document_number: cleanDoc,
              phone: toE164(cleanPhone),
              zip_code: cleanCep,
              street, number, neighborhood,
              city, state: stateUF,
            },
          },
        });
        if (signUpError) throw signUpError;

        // 2. Garante sessão
        let session = signUpData.session;
        if (!session) {
          const { data: ld } = await supabase.auth.signInWithPassword({ email, password });
          session = ld.session;
        }

        // 3. Cria subconta Asaas em background
        if (session) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ name, email, cpfCnpj: cleanDoc, phone: toE164(cleanPhone) }),
          }).catch(() => {});
        }

        // 4. Mostra tela de confirmação de email (obrigatória)
        setSentToEmail(email);
        setMode("email-sent");
        setEmailResendTimer(60);

      } else if (mode === "login") {
        const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Garante subconta Asaas — chama register-user em background se não tiver
        if (loginData.session) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${loginData.session.access_token}`,
            },
            body: JSON.stringify({ email }),
          }).catch(() => {});
        }

        navigate("/dashboard");

      } else if (mode === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=update-password`,
        });
        if (error) throw error;
        handleSuccess("Link de recuperação enviado para o seu email.");
      }
    } catch (err: any) {
      handleError(err, "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  // ── Verificar OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const token = otpDigits.join('');
    if (token.length !== 6) {
      toast({ variant: "destructive", title: "Digite os 6 dígitos do código." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token,
        type: 'sms',
      });
      if (error) throw error;
      handleSuccess("Telefone verificado com sucesso!");
      navigate("/dashboard");
    } catch (err: any) {
      handleError(err, "Código inválido ou expirado");
    } finally {
      setLoading(false);
    }
  };

  // ── Input OTP — navegação automática entre dígitos ──────────────────────────
  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    setOtpDigits([...digits, ...Array(6 - digits.length).fill('')]);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // ── Reenviar SMS ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await sendOtp(pendingPhone);
      toast({ title: "Código reenviado!", description: `SMS enviado para ${pendingPhone}` });
    } catch (err: any) {
      handleError(err, "Erro ao reenviar SMS");
    } finally {
      setLoading(false);
    }
  };

  // ── Atualizar senha (via link de recovery) ───────────────────────────────────
  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Mínimo 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPass) {
      toast({ variant: 'destructive', title: 'Senhas não conferem', description: 'Digite a mesma senha nos dois campos.' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      handleSuccess('Senha atualizada com sucesso!');
      navigate('/dashboard');
    } catch (err: any) {
      handleError(err, 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  // ── Reenvio de email de confirmação ─────────────────────────────────────────
  const handleResendEmail = async () => {
    if (emailResendTimer > 0 || resendingEmail) return;
    setResendingEmail(true);
    try {
      await supabase.auth.resend({ type: 'signup', email: sentToEmail });
      setEmailResendTimer(60);
      toast({ title: '📧 Email reenviado!', description: `Verifique ${sentToEmail}` });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível reenviar o email.' });
    } finally {
      setResendingEmail(false);
    }
  };

  // ── Labels dinâmicos ─────────────────────────────────────────────────────────
  const titleMap: Record<AuthMode, string> = {
    login:             "Bem-vindo de volta",
    signup:            "Criar sua conta",
    recovery:          "Recuperar senha",
    "verify-phone":    "Verificação de telefone",
    "email-sent":      "Confirme seu email",
    "update-password": "Criar nova senha",
  };
  const descMap: Record<AuthMode, string> = {
    login:             "Entre para gerenciar seu patrimônio em ouro",
    signup:            "Comece sua jornada no mercado de ativos digitais",
    recovery:          "Enviaremos um link de recuperação para seu email",
    "verify-phone":    `Insira o código de 6 dígitos enviado para ${pendingPhone}`,
    "email-sent":      "Verifique sua caixa de entrada e clique no link de confirmação.",
    "update-password": "Defina uma nova senha segura para sua conta.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <SEO
        title={mode === "login" ? "Login" : mode === "signup" ? "Cadastro" : "Verificação"}
        description="Acesse sua conta Gold Bank com segurança."
      />
      <BreadcrumbSEO />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.05),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl z-10"
      >
        <Button
          variant="ghost"
          className="mb-8 text-muted-foreground hover:text-primary"
          onClick={() =>
            mode === "verify-phone"    ? setMode("signup") :
            mode === "email-sent"      ? setMode("login")  :
            mode === "update-password" ? setMode("login")  :
            navigate("/")
          }
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {mode === "verify-phone"    ? "Voltar ao cadastro" :
           mode === "email-sent"      ? "Ir para o login"   :
           mode === "update-password" ? "Ir para o login"   :
           "Voltar para Home"}
        </Button>

        <Card className="glass border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {mode === "verify-phone"
                ? <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                : <Logo size="xl" />
              }
            </div>
            <CardTitle className="text-2xl font-bold">{titleMap[mode]}</CardTitle>
            <CardDescription>{descMap[mode]}</CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">

              {/* ── Criar nova senha (via link de recovery) ─────────────── */}
              {mode === "update-password" && (
                <motion.div
                  key="update-password"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <KeyRound className="w-8 h-8 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Nova senha</Label>
                      <div className="relative">
                        <Input
                          type={showPass ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-white/5 border-white/10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Confirmar nova senha</Label>
                      <Input
                        type={showPass ? "text" : "password"}
                        placeholder="Repita a nova senha"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                    </div>

                    {newPassword && confirmPass && newPassword !== confirmPass && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        ⚠️ As senhas não conferem
                      </p>
                    )}
                    {newPassword.length > 0 && newPassword.length < 8 && (
                      <p className="text-xs text-amber-400">Mínimo 8 caracteres ({newPassword.length}/8)</p>
                    )}
                  </div>

                  <Button
                    onClick={handleUpdatePassword}
                    disabled={loading || newPassword.length < 8 || newPassword !== confirmPass}
                    className="w-full bg-primary text-black font-black text-base h-12 glow-primary"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Salvar nova senha
                  </Button>
                </motion.div>
              )}

              {/* ── Email enviado — confirmação obrigatória ─────────────── */}
              {mode === "email-sent" && (
                <motion.div
                  key="email-sent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Ícone animado */}
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                        <Mail className="w-9 h-9 text-primary" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm text-white/50">Email de confirmação enviado para:</p>
                      <p className="font-black text-primary text-lg break-all">{sentToEmail}</p>
                    </div>
                  </div>

                  {/* Instruções */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    {[
                      { n: "1", text: "Abra sua caixa de entrada" },
                      { n: "2", text: "Encontre o email do GoldBank" },
                      { n: "3", text: 'Clique em "Confirmar email"' },
                      { n: "4", text: "Volte aqui para fazer login" },
                    ].map(({ n, text }) => (
                      <div key={n} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-primary">{n}</span>
                        </div>
                        <p className="text-sm text-white/70">{text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Botão OK — obrigatório */}
                  <Button
                    onClick={() => setMode("login")}
                    className="w-full bg-primary text-black font-black text-base h-12 glow-primary"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    OK, vou verificar meu email
                  </Button>

                  {/* Reenviar */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={emailResendTimer > 0 || resendingEmail}
                      className="text-sm text-white/40 hover:text-primary transition-colors disabled:opacity-30 flex items-center gap-1.5 mx-auto"
                    >
                      {resendingEmail
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                      {emailResendTimer > 0
                        ? `Reenviar em ${emailResendTimer}s`
                        : "Não recebi o email — reenviar"}
                    </button>
                  </div>

                  {/* Verificar spam */}
                  <p className="text-[11px] text-center text-white/20">
                    Não encontrou? Verifique a pasta de spam ou lixo eletrônico.
                  </p>

                  {/* Opção de usar outro email */}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setSentToEmail(""); }}
                    className="w-full text-xs text-white/20 hover:text-white/50 text-center transition-colors"
                  >
                    Email errado? Voltar ao cadastro →
                  </button>
                </motion.div>
              )}

              {/* ── Verificação OTP ─────────────────────────────────────── */}
              {mode === "verify-phone" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Dígitos OTP */}
                  <div className="flex justify-center gap-3">
                    {otpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className="w-12 h-14 text-center text-2xl font-black rounded-xl border border-white/10 bg-white/5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    ))}
                  </div>

                  <Button
                    onClick={handleVerifyOtp}
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="w-full font-bold glow-primary h-12"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Verificar código
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || loading}
                      className="text-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      {resendTimer > 0
                        ? `Reenviar em ${resendTimer}s`
                        : "Não recebeu? Reenviar SMS"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="w-full text-xs text-white/30 hover:text-white/60 text-center"
                  >
                    Verificar depois →
                  </button>
                </motion.div>
              )}

              {/* ── Formulário de login/signup/recovery ─────────────────── */}
              {mode !== "verify-phone" && mode !== "email-sent" && mode !== "update-password" && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleAuth}
                  className="space-y-4"
                >
                  {mode === "signup" && (
                    <>
                      {/* Tipo de documento */}
                      <div className="space-y-2">
                        <Label>Tipo de Documento</Label>
                        <RadioGroup
                          value={docType}
                          onValueChange={(v: "CPF" | "CNPJ") => setDocType(v)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="CPF" id="cpf" />
                            <Label htmlFor="cpf">CPF</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="CNPJ" id="cnpj" />
                            <Label htmlFor="cnpj">CNPJ</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Documento */}
                      <div className="space-y-2">
                        <Label htmlFor="document">{docType}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="document"
                            placeholder={docType === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                            value={document}
                            onChange={e => setDocument(formatDocument(e.target.value))}
                            required
                            className="bg-white/5 border-white/10"
                          />
                          {docType === "CNPJ" && (
                            <Button type="button" size="icon" variant="outline"
                              onClick={handleCnpjSearch}
                              disabled={searchingDoc || document.replace(/\D/g, '').length !== 14}>
                              {searchingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Nome */}
                      <div className="space-y-2">
                        <Label htmlFor="name">{docType === "CPF" ? "Nome Completo" : "Razão Social"}</Label>
                        <Input id="name" placeholder="Nome completo" value={name}
                          onChange={e => setName(e.target.value)} required className="bg-white/5 border-white/10" />
                      </div>

                      {/* Telefone */}
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5 text-primary" />
                          Telefone celular
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-bold">verificação SMS</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={phone}
                          onChange={e => setPhone(formatPhone(e.target.value))}
                          required
                          className="bg-white/5 border-white/10"
                        />
                        <p className="text-[11px] text-white/30">Você receberá um SMS para confirmar o número.</p>
                      </div>

                      {/* CEP */}
                      <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Dica</p>
                        <p className="text-[11px] text-muted-foreground">O endereço é preenchido automaticamente pelo CEP.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP</Label>
                          <Input id="cep" placeholder="00000-000" value={cep}
                            onChange={e => {
                              const v = formatCep(e.target.value);
                              setCep(v);
                              if (v.replace(/\D/g, '').length === 8) handleCepSearch(v.replace(/\D/g, ''));
                            }}
                            required className="bg-white/5 border-white/10" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">Estado</Label>
                          <Input id="state" value={stateUF} onChange={e => setStateUF(e.target.value)}
                            required className="bg-white/5 border-white/10" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" value={city} onChange={e => setCity(e.target.value)}
                          required className="bg-white/5 border-white/10" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="street">Logradouro</Label>
                        <Input id="street" value={street} onChange={e => setStreet(e.target.value)}
                          required className="bg-white/5 border-white/10" />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1 space-y-2">
                          <Label htmlFor="number">Número</Label>
                          <Input id="number" value={number} onChange={e => setNumber(e.target.value)}
                            required className="bg-white/5 border-white/10" />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="neighborhood">Bairro</Label>
                          <Input id="neighborhood" value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                            required className="bg-white/5 border-white/10" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" value={email}
                      onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10" />
                  </div>

                  {/* Senha */}
                  {mode !== "recovery" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Senha</Label>
                        {mode === "login" && (
                          <button type="button" onClick={() => setMode("recovery")}
                            className="text-xs text-primary hover:underline">
                            Esqueceu a senha?
                          </button>
                        )}
                      </div>
                      <Input id="password" type="password" placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)} required className="bg-white/5 border-white/10" />
                    </div>
                  )}

                  <Button type="submit" className="w-full font-bold glow-primary" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {mode === "login" ? "Entrar" : mode === "signup" ? "Criar Conta" : "Enviar Link"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>

          {mode !== "verify-phone" && mode !== "email-sent" && mode !== "update-password" && (
            <CardFooter className="flex flex-col gap-4">
              <div className="text-sm text-center text-muted-foreground">
                {mode === "login"
                  ? <>Não tem uma conta?{" "}
                      <button onClick={() => setMode("signup")} className="text-primary hover:underline">Cadastre-se</button>
                    </>
                  : <>Já tem uma conta?{" "}
                      <button onClick={() => setMode("login")} className="text-primary hover:underline">Entre aqui</button>
                    </>
                }
              </div>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
