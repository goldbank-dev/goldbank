import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, History, ArrowRight,
  ShieldCheck, Loader2, QrCode, Send, Key, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/error-handler.tsx";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useProfile, useTransactions } from "@/hooks/use-dashboard";
import { GTKCard } from "@/components/GTKCard";
import { PixQRCode } from "@/components/PixQRCode";
import { PixKeyManager } from "@/components/PixKeyManager";
import { usePixDeposit, useSendPix, usePixLookup } from "@/hooks/use-pix";
import type { PixDepositResult, PixLookupResult } from "@/lib/asaasApi";

type Modal = 'none' | 'deposit' | 'send' | 'keys' | 'transfer';
type SendStep = 'form' | 'confirm' | 'loading' | 'success' | 'error';

const WalletPage = () => {
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile();
  const { data: transactions = [], isLoading: isTxLoading, refetch: refetchTransactions } = useTransactions();
  const { toast } = useToast();

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [modal, setModal]   = useState<Modal>('none');
  const closeModal          = () => setModal('none');

  // ── PIX Deposit ─────────────────────────────────────────────────────────────
  const [depositAmount, setDepositAmount]   = useState('');
  const [depositResult, setDepositResult]   = useState<PixDepositResult | null>(null);
  const pixDeposit                          = usePixDeposit();

  async function handleDeposit() {
    const val = parseFloat(depositAmount.replace(',', '.'));
    if (!val || val < 1) {
      toast({ title: 'Valor inválido', description: 'Mínimo R$ 1,00.', variant: 'destructive' });
      return;
    }
    try {
      const result = await pixDeposit.mutateAsync({ amount: val, description: 'Depósito GoldBank Web' });
      setDepositResult(result);
    } catch (e: any) {
      handleError(e, 'Erro ao gerar QR Code PIX');
    }
  }

  function resetDeposit() {
    setDepositAmount('');
    setDepositResult(null);
    closeModal();
  }

  // ── PIX Send ────────────────────────────────────────────────────────────────
  const [sendStep, setSendStep]     = useState<SendStep>('form');
  const [pixKey, setPixKey]         = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendDesc, setSendDesc]     = useState('');
  const [sendError, setSendError]   = useState('');
  const [lookup, setLookup]         = useState<PixLookupResult | null>(null);
  const pixLookup                   = usePixLookup();
  const sendPixMutation             = useSendPix();

  async function handleNextSend() {
    const val = parseFloat(sendAmount.replace(',', '.'));
    if (!pixKey.trim()) { toast({ title: 'Informe a chave PIX', variant: 'destructive' }); return; }
    if (!val || val < 0.01) { toast({ title: 'Valor mínimo R$ 0,01', variant: 'destructive' }); return; }
    try {
      const result = await pixLookup.mutateAsync(pixKey.trim());
      setLookup(result);
    } catch { setLookup(null); }
    setSendStep('confirm');
  }

  async function handleConfirmSend() {
    setSendStep('loading');
    try {
      await sendPixMutation.mutateAsync({
        pixKey: pixKey.trim(),
        amount: parseFloat(sendAmount.replace(',', '.')),
        description: sendDesc || undefined,
      });
      setSendStep('success');
      refetchProfile();
      refetchTransactions();
    } catch (e: any) {
      setSendError(e?.error || e?.message || 'Erro ao enviar PIX.');
      setSendStep('error');
    }
  }

  function resetSend() {
    setPixKey(''); setSendAmount(''); setSendDesc('');
    setSendStep('form'); setLookup(null); setSendError('');
    closeModal();
  }

  // ── Transferência interna ───────────────────────────────────────────────────
  const [transferData, setTransferData] = useState({ receiver_id: '', amount: '' });
  const [isTransferring, setIsTransferring] = useState(false);

  async function handleTransfer() {
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      handleError('Valor inválido.'); return;
    }
    setIsTransferring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          receiver_id: transferData.receiver_id,
          amount: parseFloat(transferData.amount),
          currency: 'BRL',
          description: 'Transferência entre usuários',
          idempotency_key: crypto.randomUUID(),
        }),
      });
      if (!res.ok) throw await res.json();
      toast({ title: '✅ Transferência concluída!' });
      setTransferData({ receiver_id: '', amount: '' });
      closeModal();
      refetchTransactions();
    } catch (e: any) {
      handleError(e, 'Falha na transferência');
    } finally {
      setIsTransferring(false);
    }
  }

  const balance   = profile?.currency_balance ?? 0;
  const gtkBalance = profile?.gold_balance ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <GTKCard />

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter">Carteira Digital</h1>
            <p className="text-muted-foreground">Gerencie seus ativos e movimentações.</p>
          </div>
        </div>

        {/* ── Saldo Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponível</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black italic">
                {isProfileLoading ? '…' : `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ativos GTK (Ouro)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black italic text-primary">
                {isProfileLoading ? '…' : gtkBalance.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status da Conta</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="font-bold">Verificada</span>
            </CardContent>
          </Card>
        </div>

        {/* ── Ações rápidas ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: QrCode,         label: 'Depositar via PIX',  action: () => setModal('deposit') },
            { icon: Send,           label: 'Enviar PIX',          action: () => setModal('send') },
            { icon: ArrowRight,     label: 'Transferir',          action: () => setModal('transfer') },
            { icon: Key,            label: 'Minhas Chaves PIX',   action: () => setModal('keys') },
          ].map(({ icon: Icon, label, action }) => (
            <Button
              key={label}
              variant="outline"
              onClick={action}
              className="h-auto py-4 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-center leading-tight">{label}</span>
            </Button>
          ))}
        </div>

        {/* ── Histórico ── */}
        <Card className="bg-neutral-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Histórico de Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isTxLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={cn('p-2 rounded-full',
                        (tx.type === 'deposit' || tx.type === 'sell')
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500')}>
                        {(tx.type === 'deposit' || tx.type === 'sell')
                          ? <ArrowDownLeft className="w-4 h-4" />
                          : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{tx.description || 'Transação'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className={cn('font-mono font-bold text-sm',
                      (tx.type === 'deposit' || tx.type === 'sell') ? 'text-green-500' : 'text-white')}>
                      {(tx.type === 'deposit' || tx.type === 'sell') ? '+' : '-'}
                      R$ {tx.amount_currency?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAIS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal: Depositar via PIX ── */}
      <Dialog open={modal === 'deposit'} onOpenChange={(o) => { if (!o) resetDeposit(); }}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" /> Depositar via PIX
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Gere um QR Code para depositar em sua conta.
            </DialogDescription>
          </DialogHeader>

          {depositResult ? (
            <>
              <PixQRCode
                qrCodeBase64={depositResult.qrCodeBase64}
                qrCodePayload={depositResult.qrCodePayload}
                amount={depositResult.amount}
                expiresAt={depositResult.expiresAt}
                isMock={depositResult.isMock}
                description="Depósito GoldBank"
              />
              <Button onClick={resetDeposit} className="w-full rounded-xl" variant="outline">
                Fechar
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3 py-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Valor (R$)
                </Label>
                <div className="flex items-center bg-white/5 border border-primary/50 rounded-2xl px-5">
                  <span className="text-2xl font-black text-primary mr-2">R$</span>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="border-0 bg-transparent text-3xl font-black h-16 p-0 focus-visible:ring-0"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={resetDeposit} className="rounded-xl">Cancelar</Button>
                <Button
                  onClick={handleDeposit}
                  disabled={pixDeposit.isPending}
                  className="bg-primary text-black font-bold rounded-xl px-6"
                >
                  {pixDeposit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar QR Code'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Enviar PIX ── */}
      <Dialog open={modal === 'send'} onOpenChange={(o) => { if (!o) resetSend(); }}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Enviar PIX
            </DialogTitle>
          </DialogHeader>

          {sendStep === 'form' && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Chave PIX</Label>
                <Input
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Valor (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Descrição (opcional)</Label>
                <Input
                  placeholder="Ex: aluguel, divisão de conta…"
                  value={sendDesc}
                  onChange={(e) => setSendDesc(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11"
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="ghost" onClick={resetSend} className="rounded-xl">Cancelar</Button>
                <Button
                  onClick={handleNextSend}
                  disabled={pixLookup.isPending}
                  className="bg-primary text-black font-bold rounded-xl px-6"
                >
                  {pixLookup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Próximo →'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {sendStep === 'confirm' && (
            <div className="space-y-4 py-2">
              <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/10">
                <Row label="Chave" value={pixKey} />
                <Row label="Tipo" value={lookup?.keyTypeLabel ?? '—'} />
                {lookup?.ownerName && <Row label="Beneficiário" value={lookup.ownerName} />}
                {lookup?.bankName && <Row label="Banco" value={lookup.bankName} />}
                <Row label="Valor" value={`R$ ${parseFloat(sendAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} highlight />
              </div>
              {lookup?.found === false && (
                <p className="text-xs text-amber-400 text-center">⚠ Chave não encontrada no DICT. Confirme antes de prosseguir.</p>
              )}
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setSendStep('form')} className="rounded-xl">← Voltar</Button>
                <Button
                  onClick={handleConfirmSend}
                  className="bg-primary text-black font-bold rounded-xl px-6"
                >
                  Confirmar envio
                </Button>
              </DialogFooter>
            </div>
          )}

          {sendStep === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-white/60">Processando PIX…</p>
            </div>
          )}

          {sendStep === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="text-5xl">✅</div>
              <p className="text-xl font-black text-primary">PIX enviado!</p>
              <p className="text-white/60 text-sm">
                R$ {parseFloat(sendAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} enviado com sucesso.
              </p>
              <Button onClick={resetSend} className="rounded-xl bg-primary text-black font-bold px-8">Fechar</Button>
            </div>
          )}

          {sendStep === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="text-5xl">❌</div>
              <p className="text-base text-red-400">{sendError}</p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={resetSend} className="rounded-xl">Fechar</Button>
                <Button onClick={() => setSendStep('form')} className="rounded-xl bg-primary text-black font-bold">Tentar novamente</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Transferência interna ── */}
      <Dialog open={modal === 'transfer'} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic">Nova Transferência</DialogTitle>
            <DialogDescription className="text-white/40">Envie saldo para outro usuário da plataforma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/40">ID ou E-mail do Destinatário</Label>
              <Input
                placeholder="Ex: user@exemplo.com"
                value={transferData.receiver_id}
                onChange={(e) => setTransferData({ ...transferData, receiver_id: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-11"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Valor (R$)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeModal} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={handleTransfer}
              disabled={isTransferring}
              className="bg-primary text-black font-bold rounded-xl px-6"
            >
              {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Chaves PIX ── */}
      <Dialog open={modal === 'keys'} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Minhas Chaves PIX
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Gerencie as chaves para receber transferências PIX.
            </DialogDescription>
          </DialogHeader>
          <PixKeyManager />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

/** Helper: linha de info no modal de confirmação */
function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-white/40 uppercase tracking-wider shrink-0">{label}</span>
      <span className={cn('text-sm font-bold text-right break-all', highlight ? 'text-primary text-base' : 'text-white')}>
        {value}
      </span>
    </div>
  );
}

export default WalletPage;
