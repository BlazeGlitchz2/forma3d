import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';
import { assertOrderUpdate, assertPaymentConfirmation, orderPayment } from '../lib/payment.ts';

test('all production stages reject unpaid and insufficiently paid orders', () => {
  for (const status of ['queued', 'printing', 'finishing', 'ready', 'completed']) {
    assert.throws(() => assertOrderUpdate({ total: 100, payment_status: 'unpaid', paid_amount: 100 }, status, 100), /full payment/);
    assert.throws(() => assertOrderUpdate({ total: 100, payment_status: 'paid', paid_amount: 99.99 }, status, 100), /full payment/);
    assert.doesNotThrow(() => assertOrderUpdate({ total: 100, payment_status: 'paid', paid_amount: 100 }, status, 100));
  }
  assert.doesNotThrow(() => assertOrderUpdate({ total: 100 }, 'reviewed', 120));
  assert.doesNotThrow(() => assertOrderUpdate({ total: 100 }, 'declined', 100));
});
test('confirmation requires exact full payment and cannot be repeated or applied to declined orders', () => {
  const row = { total: 69.25, payment_status: 'unpaid', status: 'awaiting_payment' };
  for (const amount of [0, -1, NaN, Infinity, 69.24, 70]) assert.throws(() => assertPaymentConfirmation(row, amount), /exact confirmed/);
  assert.doesNotThrow(() => assertPaymentConfirmation(row, 69.25));
  assert.throws(() => assertPaymentConfirmation({ ...row, payment_status: 'paid' }, 69.25), /already confirmed/);
  assert.throws(() => assertPaymentConfirmation({ ...row, status: 'declined' }, 69.25), /declined/);
  assert.throws(() => assertOrderUpdate({ total: 69.25, payment_status: 'paid', paid_amount: 69.25 }, 'printing', 70), /quote is locked/);
});
test('legacy orders default to unpaid and payment data is normalized for customers', () => {
  assert.deepEqual(orderPayment({ total: 25 }), { status: 'unpaid', paidAmount: 0, paidAt: null, location: 'huwaylat' });
  assert.deepEqual(orderPayment({ total: 25, payment_status: 'paid', paid_amount: 25, paid_at: 10, payment_location: 'alhussan' }), { status: 'paid', paidAmount: 25, paidAt: 10, location: 'alhussan' });
});
test('the actual public registration route never provisions staff, even for admin-like email or injected role', async () => {
  const code = ts.transpileModule(readFileSync(new URL('../app/api/auth/register/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const inserts: unknown[][] = [];
  const server = { sameOrigin: async () => {}, rateLimit: async () => {}, responseError: (e: Error) => Response.json({ error: e.message }, { status: 400 }), ApiError: Error, db: () => ({ prepare(sql: string) { return { bind(...args: unknown[]) { if (sql.startsWith('INSERT')) inserts.push(args); return this; }, async first() { return null; }, async run() {} }; } }) };
  const auth = { hashPassword: () => 'salt:hash', createSession: async () => 'token', generateId: () => 'user-1' };
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  new Function('require', 'exports', code)((id: string) => id === 'zod' ? { z } : id === '@/lib/server' ? server : auth, exports);
  const response = await exports.POST!(new Request('https://forma.example/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Fake Admin', email: 'admin@forma3d.studio', password: 'password123', role: 'admin' }) }));
  assert.equal(response.status, 201);
  assert.equal((await response.json() as { user: { role: string } }).user.role, 'customer');
  assert.equal(inserts[0][6], 'customer');
});
