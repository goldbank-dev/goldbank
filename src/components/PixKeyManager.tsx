/**
 * Componente: gerencia chaves PIX do usuário (listar, adicionar, remover).
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Key, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePixKeys, useAddPixKey, useDeletePixKey } from '@/hooks/use-pix';
import type { PixKey } from '@/lib/asaasApi';

const KEY_TYPE_COLORS: Record<string, string> = {
  CPF:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CNPJ:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  EMAIL: 'bg-green-500/20 text-green-400 border-green-500/30',
  PHONE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  EVP:   'bg-primary/20 text-primary border-primary/30',
};

const DICT_STATUS_ICON = {
  ACTIVE:           <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  PENDING_APPROVAL: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  LOCAL_ONLY:       <AlertCircle className="w-3.5 h-3.5 text-white/30" />,
};

const DICT_STATUS_LABEL: Record<string, string> = {
  ACTIVE:           'Ativa no DICT',
  PENDING_APPROVAL: 'Pendente',
  LOCAL_ONLY:       'Local',
};

export function PixKeyManager() {
  const [newKey, setNewKey]       = useState('');
  const [error, setError]         = useState('');
  const { toast }                 = useToast();
  const { data: pixKeys = [], isLoading } = usePixKeys();
  const addMutation    = useAddPixKey();
  const deleteMutation = useDeletePixKey();

  async function handleAdd() {
    if (!newKey.trim()) { setError('Informe uma chave PIX.'); return; }
    setError('');
    try {
      await addMutation.mutateAsync(newKey.trim());
      setNewKey('');
      toast({ title: '✅ Chave adicionada!', description: 'Registro no DICT em andamento.' });
    } catch (e: any) {
      setError(e?.error || e?.message || 'Erro ao cadastrar chave.');
    }
  }

  async function handleDelete(key: PixKey) {
    try {
      await deleteMutation.mutateAsync(key.key);
      toast({ title: 'Chave removida.', description: key.key });
    } catch {
      toast({ title: 'Erro ao remover chave.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      {/* Lista de chaves */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : pixKeys.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Key className="w-8 h-8 text-white/20 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhuma chave cadastrada.</p>
          <p className="text-xs text-white/30">Adicione uma chave para receber PIX.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pixKeys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${KEY_TYPE_COLORS[k.key_type] ?? ''}`}
                >
                  {k.key_type}
                </Badge>
                <span className="text-sm text-white/80 truncate font-mono">{k.key}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="flex items-center gap-1"
                  title={DICT_STATUS_LABEL[k.dict_status] ?? k.dict_status}
                >
                  {DICT_STATUS_ICON[k.dict_status as keyof typeof DICT_STATUS_ICON]
                    ?? DICT_STATUS_ICON.LOCAL_ONLY}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(k)}
                  disabled={deleteMutation.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0 rounded-lg"
                >
                  {deleteMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Limite */}
      {pixKeys.length >= 5 && (
        <p className="text-xs text-center text-muted-foreground">Limite de 5 chaves atingido.</p>
      )}

      {/* Adicionar nova chave */}
      {pixKeys.length < 5 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30">Nova chave</p>
          <div className="flex gap-2">
            <Input
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              value={newKey}
              onChange={(e) => { setNewKey(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="bg-white/5 border-white/10 rounded-xl h-10 text-sm"
            />
            <Button
              onClick={handleAdd}
              disabled={addMutation.isPending || !newKey.trim()}
              className="bg-primary text-black font-bold rounded-xl h-10 px-4 shrink-0"
            >
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
