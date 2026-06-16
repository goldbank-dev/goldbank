/**
 * POST /functions/v1/kyc-webhook
 * Recebe eventos de KYC da Asaas:
 *   CUSTOMER_DOCUMENT_STATUS_CHANGED → atualiza kyc_status no perfil
 *
 * Configurado via register-user (webhooks array na criação da subconta).
 * Validado pelo header asaas-access-token.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonRes, errRes, supabaseAdmin } from '../_shared/asaas.ts';

const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Valida token do webhook
  const token = req.headers.get('asaas-access-token') ?? '';
  if (WEBHOOK_TOKEN && token !== WEBHOOK_TOKEN) {
    return errRes('Unauthorized', 401);
  }

  try {
    const body = await req.json();
    const event   = body?.event as string;
    const doc     = body?.document ?? body?.customerDocument;
    const payment = body?.payment;

    console.log('[KYC-WEBHOOK] event:', event);

    // ── Evento de documento KYC ──────────────────────────────────────────────
    if (event === 'CUSTOMER_DOCUMENT_STATUS_CHANGED' && doc) {
      const asaasCustomerId = doc.customer;
      const docStatus       = doc.status as string;  // APPROVED | REJECTED | AWAITING_ANALYSIS

      const statusMap: Record<string, string> = {
        APPROVED:          'approved',
        REJECTED:          'rejected',
        AWAITING_ANALYSIS: 'under_review',
        PENDING:           'under_review',
      };
      const newStatus = statusMap[docStatus] ?? 'under_review';

      if (!asaasCustomerId) return jsonRes({ received: true });

      const admin = supabaseAdmin();

      // Busca usuário pelo asaas_customer_id ou asaas_subconta_id
      const { data: profile } = await admin
        .from('profiles')
        .select('user_id')
        .or(`asaas_customer_id.eq.${asaasCustomerId},asaas_subconta_id.eq.${asaasCustomerId}`)
        .maybeSingle();

      if (!profile) {
        console.warn('[KYC-WEBHOOK] Usuário não encontrado para customer:', asaasCustomerId);
        return jsonRes({ received: true });
      }

      // Atualiza status no perfil
      await admin.from('profiles')
        .update({ kyc_status: newStatus.toUpperCase() })
        .eq('user_id', profile.user_id);

      // Atualiza registro de documento
      await admin.from('kyc_documents')
        .update({
          status:       newStatus,
          review_notes: doc.observations ?? doc.rejectedReason ?? null,
          updated_at:   new Date().toISOString(),
        })
        .eq('user_id', profile.user_id);

      // Notificação no banco para o usuário
      const msgs: Record<string, string> = {
        approved:     'Sua identidade foi verificada com sucesso! Conta com acesso completo.',
        rejected:     `KYC rejeitado. Motivo: ${doc.observations ?? doc.rejectedReason ?? 'Documentação inválida'}.`,
        under_review: 'Seus documentos estão em análise.',
      };
      if (msgs[newStatus]) {
        await admin.from('notifications').insert({
          user_id: profile.user_id,
          title:   newStatus === 'approved' ? '✅ Identidade verificada!' : '⚠️ KYC atualizado',
          message: msgs[newStatus],
          type:    newStatus === 'approved' ? 'success' : newStatus === 'rejected' ? 'error' : 'info',
          is_read: false,
        }).catch(() => {});
      }

      console.log(`[KYC-WEBHOOK] user ${profile.user_id} → ${newStatus}`);
    }

    return jsonRes({ received: true });
  } catch (err) {
    console.error('[KYC-WEBHOOK ERROR]', err);
    return jsonRes({ received: true }); // sempre 200 para Asaas não retentar
  }
});
