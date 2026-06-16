import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function sanitize(message: string): string {
  if (message === 'Unauthorized') return message
  return 'Não foi possível listar os saques.'
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
      logServerError('list-withdrawals', errorId, new Error('Missing/invalid Authorization header'))
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

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)

    let withdrawalQuery = supabaseClient
      .from('financial_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'withdraw')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      withdrawalQuery = withdrawalQuery.eq('status', status)
    }

    const { data: withdrawals, error: withdrawalError } = await withdrawalQuery
    if (withdrawalError) {
      logServerError('list-withdrawals', errorId, withdrawalError, { stage: 'withdrawals_query', user_id: user.id })
      throw new Error('list_failed')
    }

    const { data: auditLogs, error: auditError } = await supabaseClient
      .from('transfer_audit_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'withdraw')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (auditError) {
      logServerError('list-withdrawals', errorId, auditError, { stage: 'audit_query', user_id: user.id })
      throw new Error('list_failed')
    }

    return new Response(
      JSON.stringify({ withdrawals, audit_logs: auditLogs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    logServerError('list-withdrawals', errorId, error)
    const status = (error as Error).message === 'Unauthorized' ? 401 : 400
    return new Response(
      JSON.stringify({ error: sanitize((error as Error).message), error_id: errorId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    )
  }
})
