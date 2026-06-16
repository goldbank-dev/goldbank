/**
 * POST /functions/v1/pix-webhook
 * Recebe eventos do Asaas (PAYMENT_RECEIVED / PAYMENT_CONFIRMED).
 * Confirma cobrança PIX e credita saldo na conta do usuário.
 *
 * Registrar URL no Asaas:
 *   PUT https://api.asaas.com/v3/webhook com:
 *     { url: "https://<project>.supabase.co/functions/v1/pix-webhook",
 *       email: "...", apiVersion: 3, enabled: true,
 *       interrupted: false, authToken: "<ASAAS_WEBHOOK_TOKEN>",
 *       events: ["PAYMENT_RECEIVED","PAYMENT_CONFIRMED"] }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonRes, supabaseAdmin } from '../_shared/asaas.ts';

const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Valida token do Asaas
  if (WEBHOOK_TOKEN) {
    const token = req.headers.get('asaas-access-token') ?? '';
    if (token !== WEBHOOK_TOKEN) {
      console.warn('[PIX-WEBHOOK] Token inválido:', token.slice(0, 8));
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const event   = body?.event;
    const payment = body?.payment;

    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event) || !payment) {
      return jsonRes({ ignored: true, event });
    }

    const chargeId = payment.id;
    const amount   = parseFloat(payment.value ?? 0);
    if (!chargeId || amount <= 0) return jsonRes({ ignored: true, reason: 'invalid payload' });

    const admin = supabaseAdmin();

    // Busca cobrança no nosso banco
    const { data: charge } = await admin
      .from('pix_charges')
      .select('*')
      .eq('asaas_charge_id', chargeId)
      .maybeSingle();

    if (!charge) {
      console.warn('[PIX-WEBHOOK] Cobrança não encontrada:', chargeId);
      return jsonRes({ ignored: true, reason: 'charge not found' });
    }

    if (charge.status === 'CONFIRMED') {
      return jsonRes({ ignored: true, reason: 'already confirmed' });
    }

    // Confirma cobrança
    await admin
      .from('pix_charges')
      .update({ status: 'CONFIRMED', confirmed_at: new Date().toISOString() })
      .eq('id', charge.id);

    // Credita saldo no perfil
    await admin.rpc('create_ledger_deposit' as any, {
      p_user_id:         charge.user_id,
      p_amount:          amount,
      p_currency:        'BRL',
      p_description:     `Depósito PIX confirmado (${chargeId})`,
      p_idempotency_key: `pix_${chargeId}`,
    }).catch((e: Error) => console.error('[PIX-WEBHOOK] Ledger error:', e.message));

    console.log(`[PIX-WEBHOOK] Confirmado: ${chargeId} R$${amount} → user ${charge.user_id}`);
    return jsonRes({ success: true, chargeId, amount });
  } catch (err) {
    console.error('[PIX-WEBHOOK ERROR]', err);
    return new Response('Internal error', { status: 500 });
  }
});
