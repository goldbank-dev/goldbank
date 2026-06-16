/**
 * RLS & function-authorization tests.
 *
 * Verifies:
 *  1. is_kyc_approved RPC cannot be used to enumerate other users' KYC status.
 *     - Calling with auth.uid() works (returns boolean).
 *     - Calling with a different uuid returns false (function filters server-side).
 *  2. financial_requests INSERT policy rejects:
 *     - status != 'pending'
 *     - amount <= 0
 *     - type not in ('deposit','withdraw')
 *     - user_id != auth.uid()
 *     ...and accepts a valid pending row.
 *  3. kyc_documents SELECT is restricted to the owner (no rows returned for other users).
 *
 * Skips gracefully when TEST_USER credentials are not configured (local runs).
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TEST_USER_EMAIL = Deno.env.get("TEST_USER_EMAIL");
const TEST_USER_PASSWORD = Deno.env.get("TEST_USER_PASSWORD");

const hasCreds = !!(SUPABASE_URL && SUPABASE_ANON_KEY && TEST_USER_EMAIL && TEST_USER_PASSWORD);

async function signIn(): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Sign-in failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { token: data.access_token, userId: data.user.id };
}

function authHeaders(token: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function rpc(token: string, fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

async function insertFinancialRequest(token: string, payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/financial_requests`, {
    method: "POST",
    headers: { ...authHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

const RANDOM_UUID = "00000000-0000-0000-0000-000000000001";

// ──────────────────────────────────────────────────────────────────────────────
// is_kyc_approved
// ──────────────────────────────────────────────────────────────────────────────

Deno.test({
  name: "is_kyc_approved: caller can check own KYC status",
  ignore: !hasCreds,
  fn: async () => {
    const { token, userId } = await signIn();
    const { status, body } = await rpc(token, "is_kyc_approved", { _user_id: userId });
    assertEquals(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assertEquals(typeof body, "boolean", `expected boolean, got ${JSON.stringify(body)}`);
  },
});

Deno.test({
  name: "is_kyc_approved: cannot enumerate another user's KYC status",
  ignore: !hasCreds,
  fn: async () => {
    const { token } = await signIn();
    const { status, body } = await rpc(token, "is_kyc_approved", { _user_id: RANDOM_UUID });
    // Function must NOT leak true for someone else; either returns false
    // (filtered server-side) or raises an authorization error.
    if (status === 200) {
      assertEquals(body, false, `must return false for foreign uid, got ${JSON.stringify(body)}`);
    } else {
      assert(status >= 400, `unexpected status ${status}`);
    }
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// financial_requests INSERT policy
// ──────────────────────────────────────────────────────────────────────────────

Deno.test({
  name: "financial_requests: rejects status != pending",
  ignore: !hasCreds,
  fn: async () => {
    const { token, userId } = await signIn();
    const { status } = await insertFinancialRequest(token, {
      user_id: userId, type: "deposit", amount: 10, currency: "BRL", status: "approved",
    });
    assert(status >= 400, `expected RLS rejection, got ${status}`);
  },
});

Deno.test({
  name: "financial_requests: rejects non-positive amount",
  ignore: !hasCreds,
  fn: async () => {
    const { token, userId } = await signIn();
    const { status } = await insertFinancialRequest(token, {
      user_id: userId, type: "deposit", amount: -10, currency: "BRL", status: "pending",
    });
    assert(status >= 400, `expected rejection on negative amount, got ${status}`);
  },
});

Deno.test({
  name: "financial_requests: rejects invalid type",
  ignore: !hasCreds,
  fn: async () => {
    const { token, userId } = await signIn();
    const { status } = await insertFinancialRequest(token, {
      user_id: userId, type: "transfer", amount: 10, currency: "BRL", status: "pending",
    });
    assert(status >= 400, `expected rejection on invalid type, got ${status}`);
  },
});

Deno.test({
  name: "financial_requests: rejects user_id != auth.uid()",
  ignore: !hasCreds,
  fn: async () => {
    const { token } = await signIn();
    const { status } = await insertFinancialRequest(token, {
      user_id: RANDOM_UUID, type: "deposit", amount: 10, currency: "BRL", status: "pending",
    });
    assert(status >= 400, `expected RLS rejection, got ${status}`);
  },
});

Deno.test({
  name: "financial_requests: accepts a valid pending row",
  ignore: !hasCreds,
  fn: async () => {
    const { token, userId } = await signIn();
    const { status, body } = await insertFinancialRequest(token, {
      user_id: userId, type: "deposit", amount: 1, currency: "BRL", status: "pending",
    });
    assertEquals(status, 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// kyc_documents SELECT policy
// ──────────────────────────────────────────────────────────────────────────────

Deno.test({
  name: "kyc_documents: cannot read other users' rows",
  ignore: !hasCreds,
  fn: async () => {
    const { token } = await signIn();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/kyc_documents?user_id=eq.${RANDOM_UUID}&select=id`,
      { headers: authHeaders(token) },
    );
    const body = await res.json();
    assertEquals(res.status, 200, `unexpected status ${res.status}`);
    assert(Array.isArray(body), `expected array, got ${JSON.stringify(body)}`);
    assertEquals(body.length, 0, `RLS leak: returned ${body.length} foreign KYC rows`);
  },
});

Deno.test({
  name: "smoke: TEST_USER credentials configured",
  fn: () => {
    if (!hasCreds) {
      console.warn(
        "Skipping RLS authorization tests: set TEST_USER_EMAIL/TEST_USER_PASSWORD secrets to enable.",
      );
    }
  },
});
