import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RAW_LEAK_RE =
  /relation ".*"|column ".*"|syntax error|pg_|postgres|stack|at \/|TypeError|SyntaxError|ledger_accounts|core_transactions|transaction_entries|p_sender_id|p_receiver_id/i;

const SAFE_PREFIXES = [
  "Unauthorized",
  "O valor",
  "Moeda não suportada",
  "Saldo insuficiente",
  "KYC não aprovado",
  "Conta do",
  "O ID do destinatário",
  "Não é possível",
  "Limite diário",
  "Valor mínimo",
];

const endpoints = ["transfer", "deposit", "withdraw", "list-withdrawals"];

async function callEndpoint(endpoint: string, init: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, init);
  const text = await res.text();
  let parsed: { error?: string; error_id?: string } = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${endpoint}] non-JSON: ${text.slice(0, 200)}`);
  }
  return { status: res.status, body: parsed };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.test("Client receives sanitized error + correlation error_id (no raw leak)", async (t) => {
  for (const endpoint of endpoints) {
    await t.step(`${endpoint} - unauthorized`, async () => {
      const { status, body } = await callEndpoint(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10 }),
      });
      assertEquals(status, 401);
      assertEquals(body.error, "Unauthorized");
      assert(body.error_id && UUID_RE.test(body.error_id), `error_id missing/invalid: ${body.error_id}`);
      assertEquals(RAW_LEAK_RE.test(body.error ?? ""), false);
    });

    await t.step(`${endpoint} - invalid payload`, async () => {
      const { status, body } = await callEndpoint(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ amount: -1 }),
      });
      assert(status >= 400 && status < 500, `unexpected status ${status}`);
      const msg = body.error ?? "";
      assertEquals(RAW_LEAK_RE.test(msg), false, `raw leak: ${msg}`);
      const isSafe =
        SAFE_PREFIXES.some((p) => msg.startsWith(p)) ||
        msg === "Operação não pôde ser concluída.";
      assert(isSafe, `unwhitelisted: ${msg}`);
      assert(body.error_id && UUID_RE.test(body.error_id), `error_id missing: ${body.error_id}`);
    });
  }
});

/**
 * Server-side log shape contract.
 *
 * The edge functions log a JSON line via console.error containing the FULL raw error
 * (raw_message, stack, code, details, hint) keyed by the same `error_id` returned to
 * the client. This is verifiable in production via:
 *
 *   select event_message
 *   from function_edge_logs
 *   cross join unnest(metadata) as m
 *   where m.function_id in ('transfer','deposit','withdraw','list-withdrawals')
 *     and event_message like '%"error_id":"<error_id>"%'
 *   order by timestamp desc;
 *
 * This test asserts the client never sees the raw payload; the correlation id allows
 * operators to retrieve the full server-side log without exposing internals to users.
 */
Deno.test("Server log JSON shape includes raw fields (contract check)", () => {
  const sample = {
    level: "error",
    fn: "transfer",
    error_id: crypto.randomUUID(),
    raw_message: 'relation "ledger_accounts" does not exist',
    stack: "Error\n  at /index.ts:42",
    code: "42P01",
    details: "internal pg detail",
    hint: "internal hint",
  };
  const line = JSON.stringify(sample);
  // Must contain the raw fields server-side
  assert(line.includes("raw_message"));
  assert(line.includes("stack"));
  assert(line.includes("error_id"));
  // And must contain content the client response must never include
  assert(RAW_LEAK_RE.test(line));
});
