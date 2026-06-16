/**
 * POST /functions/v1/pix-send
 * Envia PIX para uma chave via Asaas.
 *
 * Body: { pixKey: string, amount: number, description?: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { asaas, asaasWithKey, corsHeaders, errRes, jsonRes, getAuthUser, detectPixKeyType, supabaseAdmin } from '../_shared/asaas.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await getAuthUser(req);
  if (!auth) return errRes('Unauthorized', 401);
  const { user, client } = auth;

  try {
    const { pixKey, amount, description } = await req.json();
    if (!pixKey?.trim()) return errRes('Chave PIX inválida.');
    if (!amount || amount < 0.01) return errRes('Valor mínimo R$ 0,01.');

    // Busca perfil com subconta e saldo
    const { data: profile } = await client
      .from('profiles')
      .select('currency_balance, asaas_subconta_key, asaas_subconta_id')
      .eq('user_id', user.id)
      .single();

    const balance = parseFloat(profile?.currency_balance ?? 0);
    if (balance < amount) {
      return errRes(`Saldo insuficiente. Disponível: R$ ${balance.toFixed(2)}.`, 400);
    }

    const keyType   = detectPixKeyType(pixKey.trim());
    const userApiKey = (profile as any)?.asaas_subconta_key ?? '';
    const callAsaas  = userApiKey
      ? (m: string, p: string, b?: unknown) => asaasWithKey(m, p, userApiKey, b)
      : asaas;

    const { data: transfer, status } = await callAsaas('POST', '/transfers', {
      value: amount,
      pixAddressKey: pixKey.trim(),
      pixAddressKeyType: keyType,
      description: description || 'Envio via GoldBank',
    });

    if (status >= 400) {
      const msg = (transfer as any)?.errors?.[0]?.description || 'Erro ao enviar PIX.';
      return errRes(msg, 400);
    }

    // Debita saldo (cria transação de saída)
    await client.rpc('create_ledger_deposit' as any, {
      p_user_id:        user.id,
      p_amount:         -amount,
      p_currency:       'BRL',
      p_description:    `PIX enviado → ${pixKey}`,
      p_idempotency_key: crypto.randomUUID(),
    }).catch(() => {});

    return jsonRes({
      transferId: (transfer as any).id,
      status:     (transfer as any).status,
      value:      (transfer as any).value,
      pixKey,
      keyType,
    });
  } catch (err) {
    console.error('[PIX-SEND ERROR]', err);
    return errRes('Erro ao enviar PIX. Tente novamente.');
  }
});
