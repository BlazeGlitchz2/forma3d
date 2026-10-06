# Forma3D — AI Customer Support & Authentication Architecture

## 1. 100% Free AI Model Options (Zero Payment Required)

Forma3D supports multiple free, high-performance LLMs out of the box with dynamic provider fallback. If no API key is provided, the system automatically uses the **Forma3D Built-in Knowledge Base Engine**, providing local answers when the external provider is unavailable.

### Option A: Groq Free Tier (Recommended for Blazing Fast Speed)
- **Models**: `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`
- **Inference Speed**: ~300+ tokens/second.
- **Cost**: 100% Free forever (Generous free rate limits).
- **How to get your free API key in 60 seconds**:
  1. Visit [console.groq.com](https://console.groq.com/).
  2. Sign in with Google or GitHub (no credit card or billing details required).
  3. Navigate to **API Keys** → click **Create API Key**.
  4. Copy your key and add it to `.env` or `.dev.vars`:
     ```bash
     GROQ_API_KEY="gsk_..."
     ```

### Option B: OpenRouter Free Models (DeepSeek Free Tier)
- **Models**: `deepseek/deepseek-chat:free` (DeepSeek V3), `deepseek/deepseek-r1:free` (DeepSeek R1 Reasoning)
- **Cost**: $0.00 / free endpoints.
- **How to get your free API key in 60 seconds**:
  1. Visit [openrouter.ai](https://openrouter.ai/).
  2. Sign in with Google or GitHub.
  3. Go to **Keys** ([openrouter.ai/keys](https://openrouter.ai/keys)) → click **Create Key**.
  4. Set credit limit to 0 or leave default (no payment method required).
  5. Copy your key and add to `.env`:
     ```bash
     OPENROUTER_API_KEY="sk-or-v1-..."
     ```

### Option C: Google Gemini Free Tier (Google AI Studio)
- **Models**: `gemini-2.0-flash`, `gemini-1.5-flash`
- **Rate Limit**: 15 Requests per Minute, 1,500 Requests per Day completely free.
- **How to get your free API key in 60 seconds**:
  1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
  2. Sign in with your standard Google Account.
  3. Click **Create API Key in new project** (Zero billing required).
  4. Copy your key and add to `.env`:
     ```bash
     GEMINI_API_KEY="AIzaSy..."
     ```

---

## 2. AI Customer Support System Design

### A. Route: `/api/support/chat`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "message": "كم سعر طباعة مجسم؟",
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ],
    "language": "ar"
  }
  ```
- **Response**:
  ```json
  {
    "message": "نقدم تسعيرًا فوريًا وشفافًا لطباعة القطع...",
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "suggestions": ["رفع ملف وحساب السعر", "ألوان خامة PLA المتوفرة"],
    "fallbackUsed": false
  }
  ```

### B. Rich Forma3D Studio Knowledge Context
The system prompt equips the model with complete local studio knowledge:
- **Location**: Al Jubail, Eastern Province, Saudi Arabia (الجبيل، المملكة العربية السعودية).
- **Hardware**: Creality Ender-3 V3 SE with **220 × 220 × 250 mm** build envelope and 0.4mm nozzle.
- **Materials**: Premium PLA in 5 colors:
  - Cloud White (السحابي)
  - Charcoal Black (الفحمي)
  - Sage Grey (الرمادي)
  - Sea Blue (البحري)
  - Coral Red (المرجاني)
- **Print Profiles**:
  - Draft (0.28 mm) — Rapid prototyping
  - Standard (0.20 mm) — Everyday balanced quality
  - Smooth (0.16 mm) — Clean aesthetic finish
  - Detail (0.12 mm) — Fine miniatures & display
- **Pricing**: Minimum print fee SAR 39, based on exact PLA weight (grams at SAR 0.35/g), print duration (SAR 3.50/hour), and quality multiplier, with automatic volume savings of 5% (2+), 10% (5+) and 15% (10+).
- **Fulfillment**:
  - Studio Pickup in Jubail: **100% Free (SAR 0)**.
  - Pickup only: arrange a meeting at Alhussan International School or Al Huwaylat directly with studio staff.
  - Payment: full in-person payment received and verified by staff before production. No gateway or wallet checkout.
- **Tracking**: Order IDs `JBL-XXXXX` trackable at `/track` with phone number.
- **File Uploads**: STL and 3MF up to 15 MB supported with geometry validation on `/lab`.

### C. Robust Knowledge-Base Fallback (`lib/support-fallback.ts`)
When no API key is provided, or in case of provider network timeouts:
- Fallback engine automatically resolves queries in English and Arabic.
- Covers pricing, specs, build volume, materials, local payment and pickup, order tracking with JBL codes, file uploads, and ticket submissions.

### D. Support Ticket Route: `/api/support/tickets`
- **POST**: Submit a ticket (fields: `name`, `email`, `phone`, `orderId`, `subject`, `message`).
  - Automatically associates `user_id` if user is signed in.
  - Generates ID `TCK-XXXXXXXX`.
- **GET**: Customers view their own tickets; Studio admins view all tickets with status filters.
- **PATCH**: Studio admins update ticket status (`open`, `in_progress`, `resolved`, `closed`) and add response notes.

---

## 3. Authentication & Account System

### A. Database Schema (`db/schema.ts` & Drizzle Migration `0002_support_and_auth.sql`)
1. **`users` Table**:
   - `id`: Unique user ID (`usr_...`)
   - `email`: Normalized unique lowercase email (indexed)
   - `password_hash`: Salted PBKDF2 SHA-256 hash
   - `name`: Full customer name
   - `phone`: Mobile phone (used for tracking and checkout)
   - `area`: Neighborhood / address
   - `role`: `'customer'` | `'admin'`
   - `created`, `updated`
2. **`sessions` Table**:
   - `id`: Session ID (`ses_...`)
   - `user_id`: Foreign key to `users.id`
   - `token`: 64-hex cryptographically secure random token (cookie value)
   - `expires`: Expiration timestamp (30 days)
   - `created`: Creation timestamp
3. **`tickets` Table**:
   - `id`: Ticket ID (`TCK-XXXXXXXX`)
   - `user_id`: Foreign key to `users.id` (nullable for guests)
   - `order_id`: Foreign key to `orders.id` (nullable)
   - `name`, `email`, `phone`, `subject`, `message`
   - `status`: `'open'` | `'in_progress'` | `'resolved'` | `'closed'`
   - `response`: Studio reply note
   - `created`, `updated`
4. **`orders` Table**:
   - Added column `user_id` linking registered users to their orders.

### B. Auth API Endpoints
- `POST /api/auth/register`:
  - Registers customers only. Staff roles must be provisioned explicitly.
  - Automatically sets HTTP-only secure cookie `forma_auth_token`.
- `POST /api/auth/login`:
  - Verifies credentials using PBKDF2 with timing-safe comparison.
  - Sets HTTP-only secure cookie.
- `POST /api/auth/logout`:
  - Revokes session in DB and clears cookie.
- `GET /api/auth/me`:
  - Returns current user profile and `isAdmin` flag.
- `GET /api/auth/orders`:
  - Returns authenticated user's order history.

### C. Studio Admin Access
- Only explicitly provisioned `role: 'admin'` accounts and trusted Sites owner identities receive staff privileges. Public email input never provisions or promotes staff.
- Legacy `oai-authenticated-user-email` header fallback is preserved for existing test suites.

### D. Checkout & Account Drawer Integration
- Checkout (`CheckoutFlow`): Automatically fetches `/api/auth/me` on mount and pre-fills `customer` and `phone`; customers select their local meeting preference.
- Account Drawer (`AccountModal`):
  - Displays user profile and role badge.
  - Displays live order history with order IDs, totals, items, and direct tracking links.
  - Provides quick link to Studio Admin Console for admin accounts.
