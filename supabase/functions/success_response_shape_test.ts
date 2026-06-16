import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Optional test credentials. If not provided, success-path tests are skipped.
const TEST_EMAIL = Deno.env.get("TEST_USER_EMAIL");
const TEST_PASSWORD = Deno.env.get("TEST_USER_PASSWORD");
const TEST_RECEIVER_ID = Deno.env.get("TEST_RECEIVER_ID");

// Fields that are safe to expose on a successful response.
const ALLOWED_FIELDS = new Set([
  "status",
  "transaction_id",
  "type",
  "amount",
  "currency",
  "timestamp",
  // list-withdrawals shape
  "withdrawals",
  "audit_logs",
]);

// Substrings that, if found anywhere in the JSON payload, indicate a leak.
const FORBIDDEN_SUBSTRINGS = [
  "account_id",
  "ledger_account",
  "sender_account",
  "receiver_account",
  "system_account",
  "liquidity",
  "sqlstate",
  "pg_",
  "postgres",
  "hint",
  "severity",
  "search_path",
  "stack",
  "supabase_admin",
  "service_role",
  "balance",
  "p_user_id",
  "p_amount",
  "core_transactions",
  "transaction_entries",
  "ledger_accounts",
];

async function signIn(): Promise<string | null> {
  if (!TEST_EMAIL || !TEST_PASSWORD) return null;
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    },
  );
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.warn("Sign-in failed; skipping success-path tests:", data);
    return null;
  }
  return data.access_token as string;
}

function assertNoLeaks(endpoint: string, payload: unknown) {
  const flat = JSON.stringify(payload).toLowerCase();
  for (const needle of FORBIDDEN_SUBSTRINGS) {
    if (flat.includes(needle.toLowerCase())) {
      throw new Error(
        `[${endpoint}] response leaked forbidden field/keyword "${needle}": ${flat.slice(0, 400)}`,
      );
    }
  }
}

function assertOnlyAllowedTopLevel(endpoint: string, payload: Record<string, unknown>) {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new Error(
        `[${endpoint}] response contains unexpected top-level field "${key}"`,
      );
    }
  }
}

async function callJson(
  endpoint: string,
  token: string,
  body: Record<string, unknown>,
  method: "POST" | "GET" = "POST",
) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

Deno.test("Success responses do not leak internal IDs, SQL details, or ledger metadata", async (t) => {
  const token = await signIn();
  if (!token) {
    console.warn(
      "TEST_USER_EMAIL / TEST_USER_PASSWORD not set — skipping success-path leak tests.",
    );
    return;
  }

  await t.step("deposit success response shape", async () => {
    const { status, data } = await callJson("deposit", token, {
      amount: 1,
      currency: "BRL",
      description: "integration-test-deposit",
      idempotency_key: `it-dep-${crypto.randomUUID()}`,
    });
    assertEquals(status, 200, `deposit failed: ${JSON.stringify(data)}`);
    assertEquals((data as any).status, "success");
    assertNoLeaks("deposit", data);
    assertOnlyAllowedTopLevel("deposit", data as Record<string, unknown>);
  });

  await t.step("withdraw success response shape", async () => {
    const { status, data } = await callJson("withdraw", token, {
      amount: 1,
      currency: "BRL",
      description: "integration-test-withdraw",
      idempotency_key: `it-wd-${crypto.randomUUID()}`,
    });
    if (status !== 200) {
      console.warn("withdraw not eligible (likely KYC/balance) — skipping shape check:", data);
    } else {
      assertEquals((data as any).status, "success");
      assertNoLeaks("withdraw", data);
      assertOnlyAllowedTopLevel("withdraw", data as Record<string, unknown>);
    }
  });

  await t.step("transfer success response shape", async () => {
    if (!TEST_RECEIVER_ID) {
      console.warn("TEST_RECEIVER_ID not set — skipping transfer success test.");
      return;
    }
    const { status, data } = await callJson("transfer", token, {
      receiver_id: TEST_RECEIVER_ID,
      amount: 0.5,
      currency: "BRL",
      description: "integration-test-transfer",
      idempotency_key: `it-tr-${crypto.randomUUID()}`,
    });
    if (status !== 200) {
      console.warn("transfer not eligible — skipping shape check:", data);
    } else {
      assertEquals((data as any).status, "success");
      assertNoLeaks("transfer", data);
      assertOnlyAllowedTopLevel("transfer", data as Record<string, unknown>);
    }
  });

  await t.step("list-withdrawals success response shape", async () => {
    const { status, data } = await callJson(
      "list-withdrawals?limit=5",
      token,
      {},
      "GET",
    );
    assertEquals(status, 200, `list-withdrawals failed: ${JSON.stringify(data)}`);
    assertOnlyAllowedTopLevel("list-withdrawals", data as Record<string, unknown>);
    // Per-row check — withdrawals/audit logs may contain user_id/amount but must not leak ledger_accounts/account_id, etc.
    const rowsFlat = JSON.stringify(data).toLowerCase();
    const RESERVED = ["ledger_account", "account_id", "sqlstate", "pg_", "postgres", "search_path"];
    for (const needle of RESERVED) {
      if (rowsFlat.includes(needle)) {
        throw new Error(`list-withdrawals leaked "${needle}"`);
      }
    }
  });
});
