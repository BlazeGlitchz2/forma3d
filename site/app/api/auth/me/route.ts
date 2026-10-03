import {getCurrentUser} from '@/lib/auth';
import {isAdmin,responseError} from '@/lib/server';

export async function GET() {
  try {
    const [user, admin] = await Promise.all([
      getCurrentUser(),
      isAdmin(),
    ]);

    return Response.json(
      {
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              area: user.area,
              role: user.role,
              created: user.created,
            }
          : null,
        isAdmin: admin,
      },
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
