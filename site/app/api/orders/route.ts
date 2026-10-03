import { db, owner, secret, digest, responseError, sameOrigin, rateLimit, ApiError, getCatalog } from '@/lib/server';
import { quoteItem } from '@/lib/quote-server';
import { normalizePhone, validateOrderStock, type Item } from '@/lib/pricing';
import { orderPayment, type PaymentRecord } from '@/lib/payment';
import { z } from 'zod';

const schema = z.object({
  customer: z.string().trim().min(2).max(80), phone: z.string().max(30),
  fulfillment: z.literal('pickup').default('pickup'),
  paymentLocation: z.enum(['alhussan', 'huwaylat']), paymentAcknowledged: z.literal(true),
  notes: z.string().max(1000).default(''),
  items: z.array(z.object({ productId: z.string().optional(), uploadId: z.string().optional(), name: z.string().max(120), config: z.unknown() }).refine(v => !!v.productId !== !!v.uploadId, 'Each print needs one model source')).min(1).max(12),
  requestId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    await sameOrigin(request); await rateLimit('order', 12, 3600);
    const data = schema.parse(await request.json()); const who = await owner(); const phone = normalizePhone(data.phone);
    const id = 'JBL-' + digest(data.requestId + who).slice(0, 10).toUpperCase();
    const existing = await db().prepare('SELECT * FROM orders WHERE id=? AND owner=?').bind(id, who).first<PaymentRecord & { id: string; status: string }>();
    if (existing) return Response.json({ id: existing.id, total: existing.total, status: existing.status, payment: orderPayment(existing), repeated: true });
    const items = data.items as Item[]; const catalog = await getCatalog(); const quotes = [];
    for (const item of items) {
      const quote = await quoteItem(item, 'pickup', false); item.config = quote.config;
      if (item.productId) item.name = catalog.products.find(p => p.id === item.productId)!.name;
      else { const upload = await db().prepare('SELECT name FROM uploads WHERE id=? AND owner=?').bind(item.uploadId, who).first<{ name: string }>(); if (!upload) throw new ApiError('This model is unavailable.', 404); item.name = upload.name; }
      quotes.push(quote);
    }
    validateOrderStock(quotes, (await getCatalog()).materials);
    const total = Math.round(quotes.reduce((sum, quote) => sum + quote.total, 0) * 100) / 100;
    const token = secret(); const now = Date.now(); const user = await import('@/lib/auth').then(m => m.getCurrentUser()).catch(() => null);
    const meetingArea = data.paymentLocation === 'alhussan' ? 'Alhussan International School' : 'Al Huwaylat';
    try { await db().batch([
      db().prepare('INSERT INTO orders (id,owner,user_id,secret,customer,phone,fulfillment,area,notes,items,quote,total,status,created,updated,version,payment_status,payment_location,paid_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,0)').bind(id, who, user?.id ?? null, digest(token), data.customer, phone, 'pickup', meetingArea, data.notes, JSON.stringify(items), JSON.stringify({ items: quotes, delivery: 0 }), total, 'awaiting_payment', now, now, 'unpaid', data.paymentLocation),
      db().prepare('INSERT INTO history (order_id,status,message,created) VALUES (?,?,?,?)').bind(id, 'awaiting_payment', 'Reservation received. Arrange local payment with the studio. Printing starts only after staff confirm full payment.', now),
    ]); } catch (error) {
      // A simultaneous retry may have created the same reservation after our read.
      const retry = await db().prepare('SELECT * FROM orders WHERE id=? AND owner=?').bind(id, who).first<PaymentRecord & { id: string; status: string }>();
      if (retry) return Response.json({ id: retry.id, total: retry.total, status: retry.status, payment: orderPayment(retry), repeated: true });
      throw error;
    }
    return Response.json({ id, token, total, status: 'awaiting_payment', payment: { status: 'unpaid', location: data.paymentLocation, paidAmount: 0, paidAt: null } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return responseError(new ApiError(error.issues[0]?.message ?? 'Check your order details.'));
    return responseError(error);
  }
}
