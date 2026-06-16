import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const writeEndpoints = ["transfer", "deposit", "withdraw"];
const allEndpoints = [...writeEndpoints, "list-withdrawals"];

const RAW_LEAK_RE =
  /relation ".*"|column ".*"|syntax error|violates foreign key|violates check|pg_|postgres|stack|at \/|undefined is not|TypeError|SyntaxError|JSON\.parse|ledger_accounts|core_transactions|transaction_entries|idempotency_keys/i;

const knownSafePrefixes = [
  "Unauthorized",
  "O valor",
  "Moeda não suportada",
  "Saldo insuficiente",
  "KYC não aprovado",
  "Conta do",
  "O ID do destinatário",
  "Não é possível",
  "Não foi possível",
  "Limite diário",
  "Valor mínimo",
];

function assertSanitized(endpoint: string, status: number, errorMsg: string, scenario: string) {
  if (status === 200) {
    throw new Error(`[${endpoint}/${scenario}] expected error status, got 200`);
  }
  if (status < 400 || status >= 500) {
    throw new Error(`[${endpoint}/${scenario}] unexpected status ${status} (msg: ${errorMsg})`);
  }
  assertEquals(
    RAW_LEAK_RE.test(errorMsg),
    false,
    `[${endpoint}/${scenario}] leaked raw error: ${errorMsg}`,
  );
  const isSafe =
    knownSafePrefixes.some((p) => errorMsg.startsWith(p)) ||
    errorMsg === "Operação não pôde ser concluída." ||
    errorMsg === "Não foi possível listar os saques.";
  assertEquals(
    isSafe,
    true,
    `[${endpoint}/${scenario}] unwhitelisted error message: ${errorMsg}`,
  );
}

async function callRaw(endpoint: string, init: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, init);
  const text = await res.text();
  let parsed: { error?: string } = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${endpoint}] non-JSON response body: ${text.slice(0, 200)}`);
  }
  return { status: res.status, error: parsed.error ?? "" };
}

Deno.test("Edge functions sanitize errors on negative amount", async (t) => {
  for (const endpoint of allEndpoints) {
    await t.step(endpoint, async () => {
      const { status, error } = await callRaw(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ amount: -100 }),
      });
      assertSanitized(endpoint, status, error, "negative-amount");
    });
  }
});

Deno.test("Edge functions sanitize errors on malformed JSON body", async (t) => {
  for (const endpoint of writeEndpoints) {
    await t.step(endpoint, async () => {
      const { status, error } = await callRaw(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: "{not valid json,,,",
      });
      assertSanitized(endpoint, status, error, "malformed-json");
    });
  }
});

Deno.test("Edge functions sanitize errors on missing amount", async (t) => {
  for (const endpoint of writeEndpoints) {
    await t.step(endpoint, async () => {
      const body = endpoint === "transfer"
        ? { receiver_id: "00000000-0000-0000-0000-000000000000" }
        : {};
      const { status, error } = await callRaw(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
      });
      assertSanitized(endpoint, status, error, "missing-amount");
    });
  }
});

Deno.test("Edge functions sanitize errors on wrong content-type", async (t) => {
  for (const endpoint of writeEndpoints) {
    await t.step(endpoint, async () => {
      const { status, error } = await callRaw(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: "amount=10&receiver_id=foo",
      });
      assertSanitized(endpoint, status, error, "wrong-content-type");
    });
  }
});

Deno.test("Edge functions sanitize errors on empty body", async (t) => {
  for (const endpoint of writeEndpoints) {
    await t.step(endpoint, async () => {
      const { status, error } = await callRaw(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: "",
      });
      assertSanitized(endpoint, status, error, "empty-body");
    });
  }
});

// ---------------------------------------------------------------------------
// list-withdrawals (GET) — same hostile inputs must also return sanitized errors
// even though the endpoint does not consume a JSON body.
// ---------------------------------------------------------------------------
Deno.test("list-withdrawals sanitizes errors on malformed JSON body (GET+POST)", async (t) => {
  for (const method of ["GET", "POST"] as const) {
    await t.step(method, async () => {
      const { status, error } = await callRaw("list-withdrawals", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: method === "GET" ? undefined : "{not valid json,,,",
      });
      assertSanitized("list-withdrawals", status, error, `malformed-json-${method}`);
    });
  }
});

Deno.test("list-withdrawals sanitizes errors on missing amount (no body)", async () => {
  const { status, error } = await callRaw("list-withdrawals", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  assertSanitized("list-withdrawals", status, error, "missing-amount");
});

Deno.test("list-withdrawals sanitizes errors on wrong content-type", async () => {
  const { status, error } = await callRaw("list-withdrawals", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: "status=approved&limit=abc",
  });
  assertSanitized("list-withdrawals", status, error, "wrong-content-type");
});

Deno.test("list-withdrawals sanitizes errors on empty body", async (t) => {
  for (const method of ["GET", "POST"] as const) {
    await t.step(method, async () => {
      const { status, error } = await callRaw("list-withdrawals", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: method === "GET" ? undefined : "",
      });
      assertSanitized("list-withdrawals", status, error, `empty-body-${method}`);
    });
  }
});

Deno.test("list-withdrawals sanitizes errors on hostile query params", async (t) => {
  const cases: Array<[string, string]> = [
    ["sql-injection-status", "?status=' OR 1=1--"],
    ["nan-limit", "?limit=NaN&offset=NaN"],
    ["negative-limit", "?limit=-1&offset=-999"],
    ["huge-limit", "?limit=999999999&offset=999999999"],
    ["unknown-param", "?foo[bar]=baz&__proto__=polluted"],
  ];
  for (const [scenario, qs] of cases) {
    await t.step(scenario, async () => {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/list-withdrawals${qs}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        },
      );
      const text = await res.text();
      let parsed: { error?: string } = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        // WAF/edge gateway blocks (e.g. Cloudflare on SQLi pattern) → accept as sanitized rejection
        if (res.status >= 400 && res.status < 500) return;
        throw new Error(`[list-withdrawals/${scenario}] non-JSON: ${text.slice(0, 200)}`);
      }
      assertSanitized("list-withdrawals", res.status, parsed.error ?? "", scenario);
    });
  }
});
