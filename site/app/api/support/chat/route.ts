import {z} from 'zod';
import {rateLimit,responseError,ApiError} from '@/lib/server';
import {generateSupportChatReply,type ChatMessage} from '@/lib/ai-support';

const schema = z.object({
  message: z.string().trim().min(1, 'Please enter a message.').max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(12)
    .optional(),
  language: z.enum(['en', 'ar']).optional(),
});

export async function POST(request: Request) {
  try {
    await rateLimit('support_chat', 25, 60);

    const body = await request.json();
    const data = schema.parse(body);

    const reply = await generateSupportChatReply(
      data.message,
      (data.history as ChatMessage[]) ?? [],
      data.language
    );

    return Response.json(reply);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return responseError(new ApiError(e.issues[0]?.message ?? 'Invalid chat request.'));
    }
    return responseError(e);
  }
}
