import {orderPayment,type PaymentRecord} from '@/lib/payment';
import {requireUser} from '@/lib/auth';
import {db,responseError} from '@/lib/server';

export async function GET() {
  try {
    const user = await requireUser();

    const result = await db()
      .prepare(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created DESC LIMIT 50'
      )
      .bind(user.id)
      .all<Record<string, unknown>>();

    const orders = result.results.map((row) => ({
      id: row.id,
      customer: row.customer,
      phone: row.phone,
      fulfillment: row.fulfillment,
      area: row.area,
      notes: row.notes,
      total: row.total,
      payment: orderPayment(row as unknown as PaymentRecord),
      status: row.status,
      created: row.created,
      updated: row.updated,
      version: row.version,
      items: JSON.parse(String(row.items)),
      quote: JSON.parse(String(row.quote)),
    }));

    return Response.json(
      { orders },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (e) {
    return responseError(e);
  }
}
