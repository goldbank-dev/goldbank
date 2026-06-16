import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SAFE_ERRORS = new Set<string>([
  'O ID do destinatário é obrigatório',
  'Não é possível transferir para si mesmo',
  'O valor da transferência deve ser positivo',
  'Moeda não suportada',
  'Saldo insuficiente',
  'KYC não aprovado. Complete a verificação de identidade para transferir.',
  'Conta do remetente não encontrada',
  'Conta do destinatário não encontrada',
  'Unauthorized',
])

function sanitize(message: string): string {
  if (SAFE_ERRORS.has(message)) return message
  return 'Operação não pôde ser concluída.'
}

function logServerError(fn: string, errorId: string, err: unknown, ctx: Record<string, unknown> = {}) {
  const e = err as { message?: string; stack?: string; code?: string; details?: string; hint?: string }
  console.error(JSON.stringify({
    level: 'error',
    fn,
    error_id: errorId,
    raw_message: e?.message ?? String(err),
    stack: e?.stack,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
    ...ctx,
  }))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const errorId = crypto.randomUUID()

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logServerError('transfer', errorId, new Error('Missing/invalid Authorization header'))
      return new Response(
        JSON.stringify({ error: 'Unauthorized', error_id: errorId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !authUser) throw new Error('Unauthorized')
    const user = authUser

    const body = await req.json().catch(() => ({}));
    const { receiver_id, amount, currency = 'BRL', description, idempotency_key } = body;

    const allowedCurrencies = ['BRL', 'GDK', 'USD'];
    if (!allowedCurrencies.includes(currency)) {
      throw new Error('Moeda não suportada');
    }

    if (!receiver_id) {
      await logAudit(supabaseClient, user.id, 'transfer', amount || 0, currency, receiver_id, 'failed', 'O ID do destinatário é obrigatório', idempotency_key);
      throw new Error('O ID do destinatário é obrigatório')
    }
    if (receiver_id === user.id) {
      await logAudit(supabaseClient, user.id, 'transfer', amount || 0, currency, receiver_id, 'failed', 'Não é possível transferir para si mesmo', idempotency_key);
      throw new Error('Não é possível transferir para si mesmo')
    }
    if (!amount || amount <= 0) {
      await logAudit(supabaseClient, user.id, 'transfer', amount || 0, currency, receiver_id, 'failed', 'O valor da transferência deve ser positivo', idempotency_key);
      throw new Error('O valor da transferência deve ser positivo')
    }

    const { data, error } = await supabaseClient.rpc('perform_ledger_transfer', {
      p_sender_id: user.id,
      p_receiver_id: receiver_id,
      p_amount: amount,
      p_currency: currency,
      p_tx_type: 'transfer',
      p_description: description || 'Transferência entre usuários',
      p_idempotency_key: idempotency_key
    })

    if (error) {
      logServerError('transfer', errorId, error, { stage: 'rpc', user_id: user.id })
      await logAudit(supabaseClient, user.id, 'transfer', amount, currency, receiver_id, 'failed', error.message, idempotency_key);
      throw new Error(sanitize(error.message))
    }

    await logAudit(supabaseClient, user.id, 'transfer', amount, currency, receiver_id, 'success', null, idempotency_key);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    logServerError('transfer', errorId, error)
    const status = (error as Error).message === 'Unauthorized' ? 401 : 400
    return new Response(
      JSON.stringify({ error: sanitize((error as Error).message), error_id: errorId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    )
  }
})

async function logAudit(supabase: any, userId: string, type: string, amount: number, currency: string, receiverId: string, status: string, errorMsg: string | null, idempotencyKey: string | null) {
  try {
    await supabase.from('transfer_audit_events').insert({
      user_id: userId,
      type,
      amount,
      currency,
      receiver_id: receiverId,
      status,
      error_message: errorMsg,
      idempotency_key: idempotencyKey
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
