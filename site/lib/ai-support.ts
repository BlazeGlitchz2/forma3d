import {getFallbackSupportReply} from './support-fallback.ts';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  provider: string;
  model: string;
  suggestions?: string[];
  fallbackUsed: boolean;
}

const SYSTEM_PROMPT = `You are the AI Customer Support Specialist and 3D Printing Assistant for Forma3D (فورما), an artisanal 3D printing studio located in Al Jubail, Eastern Province, Saudi Arabia (الجبيل، المملكة العربية السعودية).

STUDIO DETAILS & CAPABILITIES:
- Machine & Hardware: Creality Ender-3 V3 SE, precisely calibrated for tight tolerances and clean layer lines.
- Maximum Build Volume: 220 × 220 × 250 mm (Width × Depth × Height). Models exceeding this can be scaled down or segmented into interlocking components.
- Supported File Formats: STL and single-part 3MF up to 50 MB. Customers can upload directly to the Lab page (/lab) for instant geometry verification and live quoting.
- Filament Material: Premium PLA (Polylactic Acid) - rigid, dimensionally accurate, eco-friendly, and odorless.
 - Available PLA Colors (8 choices):
  1. Cloud White (الأبيض السحابي)
  2. Charcoal Black (الأسود الفحمي)
  3. Sage Grey (الرمادي)
  4. Sea Blue (الأزرق البحري)
  5. Coral Red (الأحمر المرجاني)
  6. Clear Transparent (الشفاف)
  7. Sunshine Yellow (الأصفر)
  8. Leaf Green (الأخضر)
- Print Profiles:
  1. Draft (0.28 mm layer height) - Rapid prototyping
  2. Standard (0.20 mm layer height) - Balanced everyday strength & finish (recommended default)
  3. Smooth (0.16 mm layer height) - Sleek surface finish
  4. Detail (0.12 mm layer height) - Ultra fine resolution for miniatures & collectibles
  - Optional finishing: Hand-sanded (+SAR 20).
- Pricing Calculation:
  - Material weight (grams of PLA) at SAR 0.35/gram + machine time at SAR 3.50/hour, with profile and strength multipliers.
  - Minimum print fee: SAR 39 per configured line.
  - Volume savings applied automatically: 2+ prints 5% off, 5+ prints 10% off, 10+ prints 15% off.
  - Transparent instant quotes are computed live on the Lab page (/lab) and Shop page (/objects).
- Payment and pickup:
  - Pickup only; no delivery service, delivery fee, pay-on-collection or online wallet checkout.
  - Customers reserve an order, then arrange an in-person payment meeting at Alhussan International School or Al Huwaylat with studio staff.
  - Staff confirms the exact meeting point, time and final quote before the customer visits or pays. Do not invent an address, desk, schedule, telephone or school affiliation.
  - Full payment must be received and verified by staff before production can start. A reservation or customer claim is not payment confirmation.
  - Ask for a receipt and use the order reference when contacting support. Staff confirms the order as paid; the customer can see payment status on tracking.
  - Collection of the finished object is free and arranged locally with staff.
- Order Tracking:
  - Order numbers format: JBL-XXXXX (e.g., JBL-9B4F1A2C).
  - Customers can track live at /track with their order code and Saudi mobile number (05XXXXXXXX).
  - Stages: Awaiting payment -> Reviewed -> Queued -> Printing -> Finishing -> Ready for pickup -> Completed.
- Escalation & Human Staff:
  - For custom CAD modeling, batch production discounts, or issues with an order, advise the customer to submit a Support Ticket.

GUIDELINES:
- Reply in the language the customer speaks (Arabic or English). For Arabic, use warm, polite Saudi Arabic phrasing.
- Be concise, clear, and accurate. Use markdown formatting (bullet points, bold text).
- Always represent Forma3D in Jubail proudly.`;

function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    const g = globalThis as Record<string, unknown>;
    if (g && typeof g[key] === 'string') return g[key] as string;
  } catch {}
  return undefined;
}

interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  extraHeaders?: Record<string, string>;
}

function resolveProvider(): ProviderConfig | null {
  const customProvider = getEnvVar('AI_PROVIDER')?.toLowerCase();
  const customModel = getEnvVar('AI_MODEL');
  const customKey = getEnvVar('AI_API_KEY');
  const customBaseUrl = getEnvVar('AI_BASE_URL');

  // Explicit or Auto-detected Groq
  const groqKey = getEnvVar('GROQ_API_KEY');
  if (customProvider === 'groq' || (!customProvider && groqKey)) {
    const key = customKey || groqKey;
    if (key) {
      return {
        name: 'groq',
        apiKey: key,
        baseUrl: customBaseUrl || 'https://api.groq.com/openai/v1/chat/completions',
        model: customModel || 'qwen/qwen3.8-27b',
      };
    }
  }

  // Explicit or Auto-detected OpenRouter
  const openRouterKey = getEnvVar('OPENROUTER_API_KEY');
  if (customProvider === 'openrouter' || (!customProvider && openRouterKey)) {
    const key = customKey || openRouterKey;
    if (key) {
      return {
        name: 'openrouter',
        apiKey: key,
        baseUrl: customBaseUrl || 'https://openrouter.ai/api/v1/chat/completions',
        model: customModel || 'deepseek/deepseek-chat:free',
        extraHeaders: {
          'HTTP-Referer': 'https://forma3d.studio',
          'X-Title': 'Forma3D Studio Jubail',
        },
      };
    }
  }

  // Explicit or Auto-detected Gemini (OpenAI-compatible endpoint)
  const geminiKey = getEnvVar('GEMINI_API_KEY') || getEnvVar('GOOGLE_API_KEY');
  if (customProvider === 'gemini' || (!customProvider && geminiKey)) {
    const key = customKey || geminiKey;
    if (key) {
      return {
        name: 'gemini',
        apiKey: key,
        baseUrl:
          customBaseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        model: customModel || 'gemini-2.0-flash',
      };
    }
  }

  // Explicit or Auto-detected DeepSeek
  const deepseekKey = getEnvVar('DEEPSEEK_API_KEY');
  if (customProvider === 'deepseek' || (!customProvider && deepseekKey)) {
    const key = customKey || deepseekKey;
    if (key) {
      return {
        name: 'deepseek',
        apiKey: key,
        baseUrl: customBaseUrl || 'https://api.deepseek.com/v1/chat/completions',
        model: customModel || 'deepseek-chat',
      };
    }
  }

  // Custom generic OpenAI-compatible provider
  if (customKey && customBaseUrl) {
    return {
      name: customProvider || 'custom',
      apiKey: customKey,
      baseUrl: customBaseUrl,
      model: customModel || 'gpt-4o-mini',
    };
  }

  return null;
}

export async function generateSupportChatReply(
  userMessage: string,
  history: ChatMessage[] = [],
  language?: 'en' | 'ar'
): Promise<ChatResponse> {
  const provider = resolveProvider();

  // If no API key configured, use built-in fallback knowledge base immediately!
  if (!provider) {
    const fallback = getFallbackSupportReply(userMessage, language);
    return {
      message: fallback.text,
      provider: 'knowledge-base',
      model: 'forma-jubail-v1',
      suggestions: fallback.suggestions,
      fallbackUsed: true,
    };
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-6).map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
      ...provider.extraHeaders,
    };

    const res = await fetch(provider.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.6,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`AI Provider ${provider.name} returned ${res.status}: ${errText}`);
      throw new Error(`AI Provider HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from AI provider.');
    }

    // Determine quick follow-up suggestions
    const isAr = language === 'ar' || /[\u0600-\u06FF]/.test(userMessage);
    const suggestions = isAr
      ? ['كم سعر الطباعة؟', 'أبعاد طابعة Creality', 'الدفع والاستلام المحلي', 'تتبع طلب']
      : ['Calculate price in Lab', 'Printer build volume', 'Local payment & pickup', 'Track an order'];

    return {
      message: content,
      provider: provider.name,
      model: provider.model,
      suggestions,
      fallbackUsed: false,
    };
  } catch (err) {
    console.warn('AI call failed, falling back to built-in knowledge base:', (err as Error).message);
    const fallback = getFallbackSupportReply(userMessage, language);
    return {
      message: fallback.text,
      provider: 'knowledge-base-fallback',
      model: 'forma-jubail-v1',
      suggestions: fallback.suggestions,
      fallbackUsed: true,
    };
  }
}
