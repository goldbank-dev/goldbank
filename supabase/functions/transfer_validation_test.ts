import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RAW_LEAK_RE =
  /relation ".*"|column ".*"|syntax error|pg_|postgres|stack|at \/|TypeError|SyntaxError|ledger_accounts|core_transactions|transaction_entries|balance|p_sender_id|p_receiver_id/i;

const SAFE_PREFIXES = [
  "Unauthorized",
  "O valor",
  "Moeda não suportada",
  "Saldo insuficiente",
  "KYC não aprovado",
  "Conta do",
  "O ID do destinatário",
  "Não é possível",
];

function assertSanitized(scenario: string, status: number, error: string) {
  if (status < 400 || status >= 500) {
    throw new Error(`[transfer/${scenario}] unexpected status ${status} (msg: ${error})`);
  }
  assertEquals(
    RAW_LEAK_RE.test(error),
    false,
    `[transfer/${scenario}] leaked raw info: ${error}`,
  );
  const isSafe =
    SAFE_PREFIXES.some((p) => error.startsWith(p)) ||
    error === "Operação não pôde ser concluída.";
  assertEquals(
    isSafe,
    true,
    `[transfer/${scenario}] unwhitelisted error message: "${error}"`,
  );
}

async function callTransfer(body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  // Upstream WAF (Cloudflare) may block obviously-malicious payloads with an HTML page
  // before they reach the function. That is acceptable defense-in-depth: we treat it
  // as a sanitized rejection.
  if (text.trimStart().toLowerCase().startsWith("<!doctype") || text.trimStart().startsWith("<html")) {
    return { status: res.status, error: "Operação não pôde ser concluída.", wafBlocked: true };
  }
  let parsed: { error?: string } = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`non-JSON response: ${text.slice(0, 200)}`);
  }
  return { status: res.status, error: parsed.error ?? "", wafBlocked: false };
}

Deno.test("transfer: invalid currency returns sanitized error", async (t) => {
  const cases: Array<[string, unknown]> = [
    ["unsupported-string", "EUR"],
    ["lowercase", "brl"],
    ["empty-string", ""],
    ["numeric", 123],
    ["object", { code: "BRL" }],
    ["sql-injection-attempt", "BRL'; DROP TABLE--"],
  ];

  for (const [label, currency] of cases) {
    await t.step(`currency=${label}`, async () => {
      const { status, error } = await callTransfer({
        receiver_id: "00000000-0000-0000-0000-000000000000",
        amount: 1,
        currency,
      });
      assertSanitized(`currency-${label}`, status, error);
    });
  }
});

Deno.test("transfer: missing/invalid receiver_id returns sanitized error", async (t) => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["missing", { amount: 1, currency: "BRL" }],
    ["null", { receiver_id: null, amount: 1, currency: "BRL" }],
    ["empty-string", { receiver_id: "", amount: 1, currency: "BRL" }],
    ["whitespace", { receiver_id: "   ", amount: 1, currency: "BRL" }],
    ["numeric", { receiver_id: 12345, amount: 1, currency: "BRL" }],
    ["object", { receiver_id: { id: "x" }, amount: 1, currency: "BRL" }],
    ["array", { receiver_id: ["a"], amount: 1, currency: "BRL" }],
    ["non-uuid-string", { receiver_id: "not-a-uuid", amount: 1, currency: "BRL" }],
  ];

  for (const [label, body] of cases) {
    await t.step(`receiver_id=${label}`, async () => {
      const { status, error } = await callTransfer(body);
      assertSanitized(`receiver-${label}`, status, error);
    });
  }
});
