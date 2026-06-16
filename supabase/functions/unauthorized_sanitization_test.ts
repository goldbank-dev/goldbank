import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Endpoint = { name: string; method: string; body?: string };

const endpoints: Endpoint[] = [
  { name: "transfer", method: "POST", body: JSON.stringify({ amount: 1, receiver_id: "x" }) },
  { name: "deposit", method: "POST", body: JSON.stringify({ amount: 1 }) },
  { name: "withdraw", method: "POST", body: JSON.stringify({ amount: 1 }) },
  { name: "list-withdrawals", method: "GET" },
];

const RAW_LEAK_RE =
  /relation ".*"|column ".*"|syntax error|pg_|postgres|stack trace|at \/|TypeError|SyntaxError|JWT|jwks|signature|ledger_accounts|core_transactions|transaction_entries|service_role|anon key|Bearer\s+[A-Za-z0-9._-]{20,}/i;

const SAFE_UNAUTH_MESSAGES = new Set<string>([
  "Unauthorized",
  "Operação não pôca ser concluída.",
  "Operação não pôde ser concluída.",
  "Não foi possível listar os saques.",
  "Missing authorization header",
  "Invalid JWT",
  "missing authorization header",
  "invalid jwt",
]);

async function callRaw(
  ep: Endpoint,
  headers: Record<string, string>,
): Promise<{ status: number; error: string; bodyKeys: string[] }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${ep.name}`, {
    method: ep.method,
    headers,
    body: ep.body,
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${ep.name}] non-JSON: ${text.slice(0, 200)}`);
  }
  const error =
    (parsed.error as string) ??
    (parsed.msg as string) ??
    (parsed.message as string) ??
    "";
  return { status: res.status, error, bodyKeys: Object.keys(parsed) };
}

function assertSanitizedUnauthorized(
  scenario: string,
  ep: string,
  status: number,
  error: string,
) {
  assert(
    status === 401 || status === 403,
    `[${ep}/${scenario}] expected 401/403, got ${status} (msg: ${error})`,
  );
  assertEquals(
    RAW_LEAK_RE.test(error),
    false,
    `[${ep}/${scenario}] leaked sensitive content: ${error}`,
  );
  assert(
    SAFE_UNAUTH_MESSAGES.has(error) || error === "",
    `[${ep}/${scenario}] unwhitelisted error: "${error}"`,
  );
}

Deno.test("No Authorization header → sanitized 401/403", async (t) => {
  for (const ep of endpoints) {
    await t.step(ep.name, async () => {
      const { status, error } = await callRaw(ep, {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      });
      assertSanitizedUnauthorized("no-auth", ep.name, status, error);
    });
  }
});

Deno.test("Empty Authorization header → sanitized 401/403", async (t) => {
  for (const ep of endpoints) {
    await t.step(ep.name, async () => {
      const { status, error } = await callRaw(ep, {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "",
      });
      assertSanitizedUnauthorized("empty-auth", ep.name, status, error);
    });
  }
});

Deno.test("Authorization without Bearer prefix → sanitized 401/403", async (t) => {
  for (const ep of endpoints) {
    await t.step(ep.name, async () => {
      const { status, error } = await callRaw(ep, {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "abc.def.ghi",
      });
      assertSanitizedUnauthorized("no-bearer", ep.name, status, error);
    });
  }
});

Deno.test("Bearer with malformed JWT → sanitized 401/403", async (t) => {
  for (const ep of endpoints) {
    await t.step(ep.name, async () => {
      const { status, error } = await callRaw(ep, {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer not-a-real-jwt",
      });
      assertSanitizedUnauthorized("malformed-jwt", ep.name, status, error);
    });
  }
});

Deno.test("No headers at all → sanitized rejection", async (t) => {
  for (const ep of endpoints) {
    await t.step(ep.name, async () => {
      const { status, error } = await callRaw(ep, {});
      // Without apikey the gateway may return 401; assert it's still safe.
      assertSanitizedUnauthorized("no-headers", ep.name, status, error);
    });
  }
});
