import {z} from 'zod';
import {db,sameOrigin,rateLimit,responseError,ApiError} from '@/lib/server';
import {verifyPassword,createSession} from '@/lib/auth';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(request: Request) {
  try {
    await sameOrigin(request);
    await rateLimit('auth_login', 15, 60);

    const body = await request.json();
    const data = schema.parse(body);
    const emailLower = data.email.toLowerCase();

    const row = await db()
      .prepare('SELECT id, email, password_hash, name, phone, area, role, created FROM users WHERE lower(email) = ?')
      .bind(emailLower)
      .first<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        phone: string;
        area: string;
        role: string;
        created: number;
      }>();

    if (!row || !verifyPassword(data.password, row.password_hash)) {
      throw new ApiError('Invalid email or password.', 401);
    }

    const role: 'customer' | 'admin' = row.role === 'admin' ? 'admin' : 'customer';

    await createSession(row.id);

    return Response.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone ?? '',
        area: row.area ?? '',
        role,
        created: row.created,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return responseError(new ApiError(e.issues[0]?.message ?? 'Invalid credentials.'));
    }
    return responseError(e);
  }
}
