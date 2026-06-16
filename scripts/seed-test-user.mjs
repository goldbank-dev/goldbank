/**
 * Seed de usuário de teste — GoldBank Web
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=<sua_chave> node scripts/seed-test-user.mjs
 *
 * O que cria:
 *   - Usuário de teste no Supabase Auth
 *   - Perfil completo (nome, CPF, telefone, endereço)
 *   - Saldo inicial BRL e GDK
 *   - Chave PIX de teste (LOCAL_ONLY)
 *   - Cobrança PIX demo (QR falso para testar UI)
 *   - Transação de histórico
 *
 * Para limpar: SEED_CLEANUP=true node scripts/seed-test-user.mjs
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL            = process.env.VITE_SUPABASE_URL
                              ?? 'https://ezhivjjscdlbuexttlrj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const TEST_USER = {
  email:    'teste@goldbank.dev',
  password: 'GoldBank@2026!',
  profile: {
    display_name:    'João Teste Silva',
    document_number: '123.456.789-09',
    document_type:   'CPF',
    phone:           '+55 11 99999-0001',
    street:          'Rua das Acácias',
    number:          '123',
    neighborhood:    'Jardim Paulista',
    city:            'São Paulo',
    state:           'SP',
    zip_code:        '01310-100',
    // colunas adicionadas pela migration Asaas:
    cpf_cnpj:        '12345678909',
    kyc_status:      'approved',
  },
  balance: {
    currency_balance: 2500.00,  // R$ 2.500,00 em BRL
    gold_balance:     1.5,      // 1,5 GDK
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const cyan  = (s) => `\x1b[36m${s}\x1b[0m`;
const bold  = (s) => `\x1b[1m${s}\x1b[0m`;

function die(msg) { console.error(red(`\n✗ ${msg}`)); process.exit(1); }

// ─── Validação inicial ────────────────────────────────────────────────────────

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(red('\nERRO: SUPABASE_SERVICE_ROLE_KEY não definida.\n'));
  console.error('  Obtenha em: https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj/settings/api');
  console.error('  Depois execute:\n');
  console.error(cyan('  SUPABASE_SERVICE_ROLE_KEY=<chave> node scripts/seed-test-user.mjs\n'));
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Cleanup mode ─────────────────────────────────────────────────────────────

if (process.env.SEED_CLEANUP === 'true') {
  console.log(cyan('\n🧹 Limpando usuário de teste...\n'));

  const { data: users } = await admin.auth.admin.listUsers();
  const testUser = users?.users?.find(u => u.email === TEST_USER.email);

  if (!testUser) {
    console.log('  Usuário não encontrado — nada a limpar.');
    process.exit(0);
  }

  const uid = testUser.id;

  await admin.from('pix_charges').delete().eq('user_id', uid);
  await admin.from('pix_keys').delete().eq('user_id', uid);
  await admin.from('core_transactions').delete().eq('user_id', uid);
  await admin.from('ledger_accounts').delete().eq('user_id', uid);

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) die(`Erro ao deletar usuário: ${delErr.message}`);

  console.log(green('✓ Usuário de teste removido com sucesso.\n'));
  process.exit(0);
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

console.log(bold(cyan('\n🌱 GoldBank — Seed de Usuário de Teste\n')));

// 1. Criar usuário no Auth
console.log('  1. Criando usuário no Auth...');

let userId;

// Verifica se já existe
const { data: existing } = await admin.auth.admin.listUsers();
const alreadyExists = existing?.users?.find(u => u.email === TEST_USER.email);

if (alreadyExists) {
  userId = alreadyExists.id;
  console.log(`     ${cyan('↩')} Usuário já existe (${userId}) — reutilizando.`);
} else {
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email:            TEST_USER.email,
    password:         TEST_USER.password,
    email_confirm:    true,
    user_metadata: { display_name: TEST_USER.profile.display_name },
  });
  if (authErr) die(`Auth: ${authErr.message}`);
  userId = created.user.id;
  console.log(`     ${green('✓')} Criado: ${userId}`);
}

// 2. Atualizar perfil
console.log('  2. Configurando perfil...');

const { error: profileErr } = await admin
  .from('profiles')
  .upsert({
    user_id: userId,
    ...TEST_USER.profile,
    ...TEST_USER.balance,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

if (profileErr) {
  // Tenta update caso upsert falhe por políticas
  const { error: updErr } = await admin
    .from('profiles')
    .update({ ...TEST_USER.profile, ...TEST_USER.balance, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (updErr) console.warn(`     ${red('⚠')} Profile: ${updErr.message} (pode ignorar se o saldo for do ledger)`);
  else console.log(`     ${green('✓')} Perfil atualizado`);
} else {
  console.log(`     ${green('✓')} Perfil configurado`);
}

// 3. Garantir ledger accounts (BRL + GDK)
console.log('  3. Configurando contas de ledger...');

const currencies = [
  { currency: 'BRL',   balance: TEST_USER.balance.currency_balance, type: 'USER' },
  { currency: 'TOKEN', balance: TEST_USER.balance.gold_balance,     type: 'USER' },
];

for (const acc of currencies) {
  const { data: existingAcc } = await admin
    .from('ledger_accounts')
    .select('id, balance')
    .eq('user_id', userId)
    .eq('currency', acc.currency)
    .maybeSingle();

  if (existingAcc) {
    await admin
      .from('ledger_accounts')
      .update({ balance: acc.balance, updated_at: new Date().toISOString() })
      .eq('id', existingAcc.id);
    console.log(`     ${cyan('↩')} ${acc.currency}: ${acc.balance} (atualizado)`);
  } else {
    const { error: ledErr } = await admin.from('ledger_accounts').insert({
      user_id:    userId,
      currency:   acc.currency,
      balance:    acc.balance,
      type:       acc.type,
    });
    if (ledErr) console.warn(`     ${red('⚠')} Ledger ${acc.currency}: ${ledErr.message}`);
    else console.log(`     ${green('✓')} ${acc.currency}: R$ ${acc.balance}`);
  }
}

// 4. Chave PIX de teste
console.log('  4. Criando chave PIX de teste...');

const { error: pixKeyErr } = await admin.from('pix_keys').upsert({
  user_id:     userId,
  key:         TEST_USER.profile.cpf_cnpj,
  key_type:    'CPF',
  dict_status: 'LOCAL_ONLY',
}, { onConflict: 'user_id,key' });

if (pixKeyErr) console.warn(`     ${red('⚠')} PIX key: ${pixKeyErr.message}`);
else           console.log(`     ${green('✓')} CPF ${TEST_USER.profile.cpf_cnpj} (LOCAL_ONLY)`);

// 5. Cobrança PIX demo
console.log('  5. Criando cobrança PIX demo...');

const demoPayload = `00020101021226840014br.gov.bcb.pix0136goldbank-seed-demo-user-${userId.slice(0,8)}5204000053039865406100.005802BR5925GOLD BANK CARTOES SA6008SAOPAULO62070503***6304CAFE`;

const { error: chargeErr } = await admin.from('pix_charges').insert({
  user_id:         userId,
  asaas_charge_id: `demo_seed_${Date.now()}`,
  qr_code_payload: demoPayload,
  qr_code_base64:  '',
  amount:          100.00,
  description:     'Depósito de teste (seed)',
  status:          'PENDING',
  is_mock:         true,
  expires_at:      new Date(Date.now() + 86400000 * 7).toISOString(),
});

if (chargeErr) console.warn(`     ${red('⚠')} PIX charge: ${chargeErr.message}`);
else           console.log(`     ${green('✓')} QR demo de R$ 100,00 criado`);

// 6. Transações de histórico
console.log('  6. Populando histórico de transações...');

const transactions = [
  { type: 'DEPOSIT',   currency: 'BRL',   amount: 2500.00, description: 'Depósito inicial via PIX',  status: 'COMPLETED', reference: 'seed_deposit_001' },
  { type: 'TOKEN_BUY', currency: 'BRL',   amount:   50.00, description: 'Compra de Gold Token',      status: 'COMPLETED', reference: 'seed_buy_001'     },
  { type: 'TOKEN_BUY', currency: 'TOKEN', amount:    1.50, description: 'Aquisição de Gold Token',   status: 'COMPLETED', reference: 'seed_gdk_001'     },
  { type: 'FEE',       currency: 'BRL',   amount:   25.00, description: 'Taxa de custódia (mensal)', status: 'COMPLETED', reference: 'seed_fee_001'     },
];

for (const tx of transactions) {
  const { error: txErr } = await admin.from('core_transactions').insert({
    user_id:     userId,
    ...tx,
    created_at:  new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    updated_at:  new Date().toISOString(),
  });
  if (txErr) console.warn(`     ${red('⚠')} Transação "${tx.description}": ${txErr.message}`);
  else       console.log(`     ${green('✓')} ${tx.type === 'credit' ? '+' : '-'} ${tx.currency} ${tx.amount} — ${tx.description}`);
}

// ─── Resultado final ──────────────────────────────────────────────────────────

console.log(bold(green('\n✅ Seed concluído!\n')));
console.log('  ' + bold('Credenciais do usuário de teste:'));
console.log(`  Email:    ${cyan(TEST_USER.email)}`);
console.log(`  Senha:    ${cyan(TEST_USER.password)}`);
console.log(`  User ID:  ${cyan(userId)}`);
console.log(`  Saldo:    ${cyan(`R$ ${TEST_USER.balance.currency_balance.toFixed(2)} BRL + ${TEST_USER.balance.gold_balance} GDK`)}`);
console.log(`  KYC:      ${cyan(TEST_USER.profile.kyc_status)}`);
console.log(`  PIX key:  ${cyan(`CPF ${TEST_USER.profile.cpf_cnpj} (LOCAL_ONLY)`)}`);
console.log(`\n  ${bold('App local:')}  http://localhost:5173`);
console.log(`  ${bold('Supabase:')}   https://supabase.com/dashboard/project/ezhivjjscdlbuexttlrj\n`);
console.log(`  Para limpar: ${cyan('SEED_CLEANUP=true node scripts/seed-test-user.mjs')}\n`);
