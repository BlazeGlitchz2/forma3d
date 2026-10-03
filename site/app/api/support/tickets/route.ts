import {z} from 'zod';
import {db,sameOrigin,rateLimit,responseError,requireAdmin,isAdmin,ApiError} from '@/lib/server';
import {getCurrentUser,generateId} from '@/lib/auth';

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().email('Valid email is required.').max(100),
  phone: z.string().trim().max(30).optional().default(''),
  orderId: z.string().trim().max(40).optional().default(''),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters.').max(150),
  message: z.string().trim().min(5, 'Message must be at least 5 characters.').max(2000),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  response: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    await sameOrigin(request);
    await rateLimit('support_ticket', 10, 60);

    const body = await request.json();
    const data = createSchema.parse(body);
    const currentUser = await getCurrentUser().catch(() => null);

    const id = `TCK-${generateId('tck').slice(-8).toUpperCase()}`;
    const now = Date.now();
    const cleanOrderId = data.orderId ? data.orderId.trim().toUpperCase() : null;

    await db()
      .prepare(
        'INSERT INTO tickets (id, user_id, name, email, phone, order_id, subject, message, status, response, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        id,
        currentUser?.id ?? null,
        data.name,
        data.email.toLowerCase(),
        data.phone,
        cleanOrderId,
        data.subject,
        data.message,
        'open',
        null,
        now,
        now
      )
      .run();

    return Response.json(
      {
        id,
        status: 'open',
        message: 'Your support ticket has been received. Our team in Jubail will get back to you shortly.',
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return responseError(new ApiError(e.issues[0]?.message ?? 'Invalid ticket details.'));
    }
    return responseError(e);
  }
}

export async function GET(request: Request) {
  try {
    const admin = await isAdmin();
    const user = await getCurrentUser().catch(() => null);

    if (admin) {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const query = 'SELECT * FROM tickets ORDER BY created DESC LIMIT 100';
      let rows;
      if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        rows = await db()
          .prepare('SELECT * FROM tickets WHERE status = ? ORDER BY created DESC LIMIT 100')
          .bind(status)
          .all();
      } else {
        rows = await db().prepare(query).all();
      }
      return Response.json({ tickets: rows.results }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (user) {
      const rows = await db()
        .prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY created DESC LIMIT 50')
        .bind(user.id)
        .all();
      return Response.json({ tickets: rows.results }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    throw new ApiError('Please log in to view your tickets.', 401);
  } catch (e) {
    return responseError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await sameOrigin(request);
    await requireAdmin();

    const body = await request.json();
    const data = patchSchema.parse(body);
    const now = Date.now();

    const result = await db()
      .prepare('UPDATE tickets SET status = ?, response = coalesce(?, response), updated = ? WHERE id = ?')
      .bind(data.status, data.response ?? null, now, data.id)
      .run();

    if (!result.meta.changes) {
      throw new ApiError('Ticket not found.', 404);
    }

    return Response.json({ ok: true, id: data.id, status: data.status });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return responseError(new ApiError(e.issues[0]?.message ?? 'Invalid update data.'));
    }
    return responseError(e);
  }
}
