/**
 * GET /functions/v1/pix-lookup?key=...
 * Consulta chave PIX no DICT via Asaas.
 * Retorna dados do dono (nome, banco) com CPF mascarado.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { asaas, corsHeaders, errRes, jsonRes, getAuthUser, detectPixKeyType } from '../_shared/asaas.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await getAuthUser(req);
  if (!auth) return errRes('Unauthorized', 401);

  const url   = new URL(req.url);
  const key   = url.searchParams.get('key')?.trim();
  if (!key) return errRes('Chave PIX não informada.');

  const keyType = detectPixKeyType(key);
  const labels: Record<string, string> = {
    EMAIL: 'E-mail', CPF: 'CPF', CNPJ: 'CNPJ', PHONE: 'Telefone', EVP: 'Chave aleatória',
  };

  try {
    const encoded = encodeURIComponent(key);
    const { data, status } = await asaas('GET', `/pix/addressKeys/${encoded}`);

    if (status === 404 || status === 400) {
      return jsonRes({ key, keyType, keyTypeLabel: labels[keyType], valid: false, found: false,
        _error: 'Chave PIX não encontrada no DICT.' });
    }

    if (status >= 400) {
      return jsonRes({ key, keyType, keyTypeLabel: labels[keyType], valid: true, found: null,
        _error: 'Não foi possível validar agora.' });
    }

    const d = data as any;
    const ownerTaxId  = (d.owner?.taxId || d.holderTaxId || '').replace(/\D/g, '');
    // CPF: XXX.***.XXX-XX → mostra 3 primeiros e 2 últimos
    // CNPJ: XX.***.XXX/XXXX-XX → mostra 2 primeiros e 2 últimos
    const maskedTaxId = ownerTaxId.length === 11
      ? ownerTaxId.replace(/^(\d{3})\d{5}(\d{3})/, '$1.***.***')
      : ownerTaxId.replace(/^(\d{2})\d{8}(\d{2})/, '$1.***.***/****-$2');

    return jsonRes({
      key,
      keyType,
      keyTypeLabel: labels[keyType] ?? keyType,
      valid:        true,
      found:        true,
      ownerName:    d.owner?.name || d.holderName || '',
      ownerTaxId:   maskedTaxId,
      bankName:     d.bank?.name || d.ispbName || '',
      ispb:         d.bank?.ispb || d.ispb || '',
      accountType:  d.accountType || '',
    });
  } catch (err) {
    console.error('[PIX-LOOKUP ERROR]', err);
    return jsonRes({ key, keyType, keyTypeLabel: labels[keyType], valid: true, found: null,
      _error: 'Erro ao consultar DICT.' });
  }
});
