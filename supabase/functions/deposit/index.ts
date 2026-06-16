import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SAFE_ERRORS = new Set<string>([
  'Unauthorized',
  'O valor do depósito deve ser positivo',
])

function sanitize(message: string): string {
  if (SAFE_ERRORS.has(message)) return message
  if (message?.startsWith('Valor mínimo de depósito')) return message
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
      logServerError('deposit', errorId, new Error('Missing/invalid Authorization header'))
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { amount, currency, description, idempotency_key } = await req.json()

    if (!amount || amount <= 0) {
      throw new Error('O valor do depósito deve ser positivo')
    }

    const { data, error } = await supabaseClient.rpc('create_ledger_deposit', {
      p_user_id: user.id,
      p_amount: amount,
      p_currency: currency || 'BRL',
      p_description: description || 'Depósito via API',
      p_idempotency_key: idempotency_key
    })

    if (error) {
      logServerError('deposit', errorId, error, { stage: 'rpc', user_id: user.id })
      throw new Error(sanitize(error.message))
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    logServerError('deposit', errorId, error)
    const status = (error as Error).message === 'Unauthorized' ? 401 : 400
    return new Response(
      JSON.stringify({ error: sanitize((error as Error).message), error_id: errorId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    )
  }
})
