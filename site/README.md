# Forma3D

Forma / Material World is a bilingual digital material lab for 3D printing in Jubail. A shared Three.js world, monumental typography and a precise HTML HUD contain the working upload, configuration, reservation, verified upfront payment and production system. React, TypeScript and Vinext run against Cloudflare D1 and private R2 storage. The four supplied references are analyzed in `docs/reference-deconstruction.md`; the implemented visual system is defined in `docs/forma-world.md`.

## Run locally

Use Node 22.13 or later. Run `npm ci`, `npm run build`, and apply each SQL file in `drizzle/` once, in numbered order, to local D1:

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_magical_vulcan.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_lowly_elektra.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_support_and_auth.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_upfront_payment.sql
npm run dev -- --port 3000
```

Set `STUDIO_ADMIN_EMAIL` in ignored `.dev.vars` for development. The portable Sites preview signs in as `seedy@sites.test` via `/signin-with-chatgpt?return_to=/admin`. For a built preview use `SITES_RUNTIME_ROOT=/tmp/forma-worker-preview npm start -- --port 3001 --var STUDIO_ADMIN_EMAIL:seedy@sites.test`; its authentication headers are only simulated by integration tests. Use a separate runtime directory when running built and development previews together. Production headers are injected by Sites. Never use a client-controlled header as authentication outside this dispatch environment.

## Customer and studio journeys

- `/`: cobalt opening, layer macro, file invitation and local production scenes; one renderer persists through native scrolling.
- `/objects` (also `/shop`): spatial object archive with distinct compositions; optional Index exposes search, category and sorting in compact rows.
- `/make?product=…`: full viewport product stage with size, material, color, quality, quantity and finishing modes.
- `/lab` (also `/make`): full viewport private STL/single-part 3MF drop target, real materialization, rotation/zoom, wireframe, measurements and authoritative quotes.
- `/checkout`: three-step guest reservation with Saudi phone, staff-arranged payment and free pickup at Alhussan International School or Al Huwaylat, and server-authoritative totals. Full payment is required before printing. A temporary cart draft is tab-scoped; durable orders and uploaded files are stored server-side.
- `/track`: lookup with order number plus phone, or the private receipt token. Status history updates every 20 seconds while the tab is visible.
- `/admin`: provisioned staff accounts or the trusted Sites owner identity. Review every order model, download private files, confirm/change unpaid quotes, record full payment with a receipt reference, update status and customer message, and manage products, photos, models, materials, stock, swatches, profiles and categories through forms.

Uploaded model access requires the originating HTTP-only guest cookie, owner access, or an order-specific receipt token/matching phone for a model actually included in that order. An admin can deliberately attach a model to an available catalog product, making that catalog asset viewable to shoppers. Hiding the product removes this catalog access. Models remain private otherwise. Quotes are recalculated on order submission; order creation is idempotent per guest/request ID and admin updates use optimistic version guards and atomic history writes.

The initial six catalog objects are generated, closed meshes rather than image placeholders. Replace the initial collection, prices, stock with the studio's real assortment before opening public sales. Catalog dimensions use the displayed X/Y/Z model axes; the product viewer uses Y-up. The Ender-3 V3 SE envelope is 220 × 220 × 250 mm in native X/Y/Z coordinates (Z is print height). Uploaded models rotate into Y-up for viewing, while quotes keep native axes. PLA is confirmed by the owner; red, blue, grey, black, white, transparent, yellow and green are the available defaults. Quantity stock is inherited setup data and should be set from actual spool inventory.

## Honest quote stages and native slicing

The instant quote uses validated geometry, PLA density, configurable quality multipliers, selected strength, a provisional support allowance and machine time. The print-only selling policy is SAR 0.50/g + SAR 3/hour, minimum SAR 25 per configured order line (quantity is summed before applying the minimum); these are business assumptions informed by a public Saudi print-service listing. Actual sliced total grams include supports, so that path adds no separate support allowance. Local pickup is free; optional sanding adds SAR 15. Delivery is unavailable. Raw supplier examples are SAR 87–89/kg (0.087–0.089 SAR/g), before inbound shipping; these are not the selling rate or actual owner invoices. See docs/printer-pricing-research.md for dated sources and caveats. It is visibly provisional. Catalog objects use the studio's base prices and estimated time. Admin review confirms every order before production.

Actual slicing is connected only when production runtime variables `SLICER_URL` and secret `SLICER_TOKEN` are configured. The website sends one private model and validated configuration as multipart form data. The authenticated service returns per-unit `{ "grams": 18.3, "minutes": 94 }` from actual slicing. Measurements are validated and cached for 24 hours against source, configuration and current pricing/profiles. Quantity is multiplied by the website. Set `SLICER_PROFILE_REVISION` to the Orca version plus a profile revision, and change it whenever native profiles or Orca change, to invalidate cached measurements. Failed or slow analysis returns an explicit error and keeps the provisional quote available.

`services/slicer-worker/server.mjs` supplies a native OrcaSlicer adapter. It needs an installed Orca CLI binary and standalone exported **machine, process and filament profiles for the actual printer**, including resolved inherited settings. Use the Ender-3 V3 SE 0.4 mm machine profile and calibrated 1.75 mm PLA profiles; the supplied path map names those exact targets and is not a substituted generic machine profile. Website quality layers are 0.28/0.20/0.16/0.12 mm, with owner edits bounded to 0.10–0.32 mm for the 0.4 mm nozzle. Copy `profiles.example.json` and point its allowlisted paths at those profiles. Set `ORCA_BIN`, `ORCA_PROFILE_MAP`, and secret `SLICER_TOKEN`; install the worker's package and run it. It listens on loopback port 8788. Expose its `/slice` through a protected HTTPS reverse proxy or approved private connection, then set the Site URL/token. Use a container/process resource limit around the native service. It permits one active slice, caps input, runs without a shell, times out after 20 seconds and cleans temporary files. Larger jobs require a future asynchronous queue rather than raising the current synchronous limit blindly.

The worker reads `Metadata/slice_info.config` plate `weight` (grams) and `prediction` (print seconds) from Orca's output 3MF. `result.json`'s `sliced_time` is processing time and must not be used as print time. Native execution has **not** been verified against a physical printer profile because none was supplied. Until connected and calibrated, studio review remains required. The supported upload subset is a closed STL or a single-part 3MF model archive under 15 MB, with an 8 MB uncompressed model limit and bounded assemblies; unsupported multi-file 3MF assemblies should be exported as STL.

Official references: [Orca CLI](https://github.com/OrcaSlicer/OrcaSlicer/wiki/cli_mode), [layer height](https://github.com/OrcaSlicer/OrcaSlicer/wiki/quality_settings_layer_height), [infill](https://github.com/OrcaSlicer/OrcaSlicer/wiki/strength_settings_infill), [walls](https://github.com/OrcaSlicer/OrcaSlicer/wiki/strength_settings_walls), [supports](https://github.com/OrcaSlicer/OrcaSlicer/wiki/support_settings_support).

## Verification and publication

Run `node scripts/verify-types.mjs`, `node scripts/verify-lint.mjs`, `node --test tests/core.test.ts tests/payment.test.ts tests/support-auth.test.ts tests/world-framing.test.ts`, and `node scripts/verify-material-world-build.mjs`. Portable model fixtures are included in `tests/fixtures/`. Run `FORMA_TEST_URL=http://127.0.0.1:5173 node tests/integration.mjs` against the running local preview. These checks create clearly labelled local test records. The integration suite includes a valid STL above the framework's default body limit, real 3MF, authoritative prices, private tracking models, inventory, price revision, status changes, decline and idempotency.

The six presentation assets use Meshopt-compressed GLB, separate from source/production geometry. Regenerate with `node --experimental-strip-types scripts/generate-world-models.mjs`. Indexed accessors are verified for solid and wireframe rendering. Customer rendering uses on-demand frames, adaptive DPR, lazy loading, reduced motion and explicit resource disposal. Browser evidence at 1440 × 900 and 390 × 844, plus Arabic and interaction verification, is recorded in `docs/material-world-verification.md` and `docs/material-world-gates.md`.

`.openai/hosting.json` declares D1/R2 and the existing Site ID. Production publication uses Sites' credential-backed source workflow, exact source commit and packaged Worker; migrations are included for deployment. Runtime credentials and local data are excluded from source. The initial Site is owner-private for review. Opening public sales is a separate access-control decision.

The site feature-detects WebMCP to expose read-catalog and start-configurator actions. It does not automatically order or upload through those tools. Native WebMCP validation was unavailable in the current browser; unsupported browsers continue normally.

## Upfront payment policy

Reservations start as `awaiting_payment` / `unpaid`. The customer chooses a preferred meeting area; staff agrees the exact place, time, and final quote through support before a visit. The named school is a meeting preference, not a claim of affiliation or a staffed collection desk. There is no delivery or online gateway checkout.

Staff saves the final quote, receives the full amount in person, checks the receipt, and uses **Confirm received payment** in the order review. `/api/admin/payments` requires staff authorization, the current order version, an exact total, a receipt reference, and explicit verification. Payment is audited with the staff identity and timestamp. `/api/admin` blocks every production stage (`queued`, `printing`, `finishing`, `ready`, `completed`) until full payment is recorded, and paid totals are locked. Customers cannot mark their own reservations paid.

Public registration always creates customer accounts; entering an owner-like email does not grant staff privileges. Provision a staff role explicitly in D1 for an existing, verified studio account (e.g. `UPDATE users SET role='admin' WHERE id='<verified-user-id>';`). Customer account history uses `user_id`, never an unverified phone match. Existing active production orders are held for staff payment verification by migration `0003`; historical completed records are retained. Apply the included migrations once, in numbered order, when releasing the new source to the live Worker.
