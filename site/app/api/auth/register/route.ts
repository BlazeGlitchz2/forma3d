import {z} from 'zod';
import {db,sameOrigin,rateLimit,responseError,ApiError} from '@/lib/server';
import {hashPassword,createSession,generateId} from '@/lib/auth';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(100),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  phone: z.string().trim().max(30).default(''),
  area: z.string().trim().max(150).default(''),
});

export async function POST(request: Request) {
  try {
    await sameOrigin(request);
    await rateLimit('auth_reg', 10, 60);

    const body = await request.json();
    const data = schema.parse(body);
    const emailLower = data.email.toLowerCase();

    const existing = await db()
      .prepare('SELECT id FROM users WHERE lower(email) = ?')
      .bind(emailLower)
      .first<{ id: string }>();

    if (existing) {
      throw new ApiError('An account with this email already exists.', 409);
    }

    // Public signup never provisions staff access. Studio owners assign roles explicitly.
    const role = 'customer';
    const id = generateId('usr');
    const passwordHash = hashPassword(data.password);
    const now = Date.now();

    await db()
      .prepare(
        'INSERT INTO users (id, email, password_hash, name, phone, area, role, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, emailLower, passwordHash, data.name, data.phone, data.area, role, now, now)
      .run();

    await createSession(id);

    return Response.json(
      {
        user: {
          id,
          email: emailLower,
          name: data.name,
          phone: data.phone,
          area: data.area,
          role,
          created: now,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return responseError(new ApiError(e.issues[0]?.message ?? 'Invalid registration details.'));
    }
    return responseError(e);
  }
}
