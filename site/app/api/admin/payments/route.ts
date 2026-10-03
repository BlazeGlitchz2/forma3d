import { db, requireAdmin, responseError, sameOrigin, ApiError } from '@/lib/server';
import { assertPaymentConfirmation, type PaymentRecord } from '@/lib/payment';
import { getCurrentUser } from '@/lib/auth';
import { headers } from 'next/headers';
import { z } from 'zod';

const schema = z.object({ id: z.string(), version: z.number().int().positive(), amount: z.number().positive().max(100000), reference: z.string().trim().min(3).max(100), verified: z.literal(true) });
export async function POST(request: Request) {
  try {
    await sameOrigin(request); await requireAdmin();
    const data = schema.parse(await request.json());
    const row = await db().prepare('SELECT * FROM orders WHERE id=?').bind(data.id).first<PaymentRecord & { version: number }>();
    if (!row) throw new ApiError('Order not found.', 404);
    if (row.version !== data.version) throw new ApiError('This order changed. Refresh before confirming payment.', 409);
    assertPaymentConfirmation(row, data.amount);
    const user = await getCurrentUser(); const staff = user?.role === 'admin' ? user.email : (await headers()).get('oai-authenticated-user-email');
    if (!staff) throw new ApiError('Sign in to confirm payment.', 403);
    const now = Date.now(); const nextStatus = row.status === 'awaiting_payment' || row.status === 'pending' ? 'reviewed' : String(row.status);
    const result = await db().batch([
      db().prepare("INSERT INTO history (order_id,status,message,created) SELECT id,?,?,? FROM orders WHERE id=? AND version=? AND payment_status='unpaid'").bind(nextStatus, 'Staff verified full payment: SAR ' + row.total + '. Receipt: ' + data.reference + '. Production is unlocked.', now, data.id, data.version),
      db().prepare("UPDATE orders SET payment_status='paid',paid_amount=total,payment_reference=?,paid_at=?,paid_by=?,status=?,updated=?,version=version+1 WHERE id=? AND version=? AND payment_status='unpaid'").bind(data.reference, now, staff, nextStatus, now, data.id, data.version),
    ]);
    if (!result[1].meta.changes) throw new ApiError('Payment or order details changed. Refresh before trying again.', 409);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return responseError(new ApiError(error.issues[0]?.message ?? 'Check the payment details.'));
    return responseError(error);
  }
}
