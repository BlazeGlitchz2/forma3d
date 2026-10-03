# Checkout and studio interface verification

Verified locally on 3 October 2026.

## Delivered behavior

- Support has chat, tickets, meeting arrangements, and bilingual FAQs; tickets reach the staff support inbox.
- Account includes sign-in, registration, password visibility, inline errors, personal order history, and private guest tracking.
- Cart, checkout, receipt, and tracking share interactive 3D previews and responsive English/Arabic layouts.
- Checkout has three stages: details, local meeting area, and review. Delivery is rejected by both the quote and order APIs.
- Reservations start unpaid. Staff records an exact full amount and receipt reference before any queued, printing, finishing, ready, or completed stage. Paid quotes are locked.
- Local meetings at Alhussan International School or Al Huwaylat must be agreed with staff before visiting. No school affiliation or staffed collection desk is claimed.

## Validation

- TypeScript, ESLint, and the production Worker build pass.
- All 29 unit checks pass, including geometry, pricing, stock, private account behavior, and payment rules.
- Real API integration passes against development and the built Worker: private uploads and tracking, authoritative quotes, retries, concurrent reservation creation, registration/login/logout, customer versus staff permissions, support tickets, and full payment enforcement.
- Browser checks at 1440 × 900 and 375 × 812 cover cart quantity changes, all checkout steps, a saved reservation, a prefilled payment support ticket, registration, inline login errors, password visibility, staff payment verification, staff support inbox, and customer payment updates.
- Arabic RTL, keyboard Escape, reduced motion, horizontal overflow, modal scrolling, and persistent close controls were reviewed.
- Local test payments are simulated QA records, with explicit QA receipt references; no physical orders or payments were made.

## Deployment

Apply numbered D1 SQL migrations once, in order, before deploying the new source. Migration `0003_upfront_payment.sql` adds payment accounting and returns existing active orders to payment verification; historical completed orders remain intact. Only provision staff accounts through the trusted administration process described in README.
