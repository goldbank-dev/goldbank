/**
 * Componente: exibe QR Code PIX + payload copia-e-cola + botão copiar.
 * Gera a imagem via qrserver.com se base64 não vier do Asaas.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PixQRCodeProps {
  qrCodeBase64: string;
  qrCodePayload: string;
  amount: number;
  expiresAt: string;
  isMock?: boolean;
  description?: string;
}

export function PixQRCode({ qrCodeBase64, qrCodePayload, amount, expiresAt, isMock, description }: PixQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const qrSrc = qrCodeBase64
    ? `data:image/png;base64,${qrCodeBase64}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodePayload)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(qrCodePayload);
      setCopied(true);
      toast({ title: '✅ Código copiado!', description: 'Cole no seu app bancário para pagar.' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: 'Erro ao copiar', description: 'Selecione o texto manualmente.', variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {isMock && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>QR demonstrativo — conta PIX aguardando aprovação bancária.</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-lg shadow-primary/10">
        <img
          src={qrSrc}
          alt="QR Code PIX"
          width={220}
          height={220}
          className="rounded-lg"
          onError={(e) => {
            // Fallback se a imagem falhar
            (e.target as HTMLImageElement).src =
              `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodePayload)}`;
          }}
        />
      </div>

      <div className="w-full text-center space-y-1">
        <p className="text-2xl font-black text-primary">
          R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <p className="text-xs text-muted-foreground">
          Expira em {new Date(expiresAt).toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            PIX Copia e Cola
          </span>
          <Badge variant="outline" className="text-primary border-primary/30 text-xs">
            EMV
          </Badge>
        </div>
        <p className="text-xs font-mono text-white/60 break-all leading-5 select-all">
          {qrCodePayload}
        </p>
        <Button
          onClick={handleCopy}
          className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold transition-all"
          variant="ghost"
        >
          {copied
            ? <><Check className="w-4 h-4 mr-2" /> Copiado!</>
            : <><Copy className="w-4 h-4 mr-2" /> Copiar código PIX</>}
        </Button>
      </div>
    </div>
  );
}
