# Material World — verification

Reviewed on 2–3 October 2026 against all four supplied screenshots. The pre-code analysis is in [reference-deconstruction.md](reference-deconstruction.md); the scene direction is in [forma-world.md](forma-world.md). The running local preview is **http://127.0.0.1:5174**.

## Visual review

Customer discovery, product configuration and custom uploads now use a shared full-screen Three.js world with large type and small perimeter controls. Native scrolling changes camera shots. The archive opens as successive individual objects; search and sorting live in its optional Index. Checkout uses calm forms, and administration remains a table and review tool.

Screens were captured and inspected at **1440 × 900** and **390 × 844**. Originals and iteration captures are in the workspace's `output/playwright` directory, outside the `site` checkout.

| Screen | Desktop | Mobile |
| --- | --- | --- |
| Opening | [PNG](../../output/playwright/world-home-desktop-final.png) | [PNG](../../output/playwright/world-home-mobile-final.png) |
| Material macro | [PNG](../../output/playwright/world-macro-desktop-final.png) | [PNG](../../output/playwright/world-macro-mobile-final.png) |
| File invitation | [PNG](../../output/playwright/world-invitation-desktop-final.png) | [PNG](../../output/playwright/world-invitation-mobile-final.png) |
| Jubail pause | [PNG](../../output/playwright/world-local-desktop-final.png) | [PNG](../../output/playwright/world-local-mobile-final.png) |
| Object archive | [PNG](../../output/playwright/world-archive-desktop-final.png) | [PNG](../../output/playwright/world-archive-mobile-final.png) |
| Utility index | [PNG](../../output/playwright/world-index-desktop-final.png) | [PNG](../../output/playwright/world-index-mobile-final.png) |
| Product stage | [PNG](../../output/playwright/world-product-desktop-final.png) | [PNG](../../output/playwright/world-product-mobile-final.png) |
| Empty Lab | [PNG](../../output/playwright/world-lab-desktop-final.png) | [PNG](../../output/playwright/world-lab-mobile-final.png) |
| Uploaded STL | [PNG](../../output/playwright/world-stl-desktop-final.png) | [PNG](../../output/playwright/world-stl-mobile-final.png) |
| Uploaded 3MF | [PNG](../../output/playwright/world-3mf-desktop-final.png) | [PNG](../../output/playwright/world-3mf-mobile-final.png) |
| Cash checkout | [PNG](../../output/playwright/world-checkout-desktop-final.png) | [PNG](../../output/playwright/world-checkout-mobile-final.png) |
| Confirmation | [PNG](../../output/playwright/world-confirmation-desktop-final.png) | [PNG](../../output/playwright/world-confirmation-mobile-final.png) |
| Ready tracking | [PNG](../../output/playwright/world-tracking-ready-desktop.png) | [PNG](../../output/playwright/world-tracking-ready-mobile.png) |

The [reference comparison](../../output/playwright/reference-gap-review.jpg) and [heavy blur review](../../output/playwright/world-blur-review.jpg) were inspected. The opening retains a strong asymmetric subject/type hierarchy under blur. Customer world screens have no product cards, viewer boxes, settings sidebar or floating navbar capsule. The material macro uses actual geometry and layer relief. Objects occlude display type while controls remain in the HTML foreground.

Review iterations corrected small mobile subjects, clipped perspective corners on uploads, unreadable wireframes, a hard floor horizon, decimal price overflow, and confirmation text colliding with the model. Mobile shots were recomposed independently. Dense pending models use their genuine hard edges; production scanning illuminates the model's surface instead of laying a rectangle across the HUD. Admin previews stay inside their allotted space.

## Functional browser evidence

- A **3,888,084-byte STL** was selected through the native file picker, parsed, uploaded to private storage and rendered. Its native dimensions were approximately 174 × 174 × 240 mm. The framework's former 1 MB multipart limit was corrected; the application still enforces its 15 MB file limit.
- A valid **40 × 40 × 40 mm 3MF** was dropped onto the fixed header. The full-window drop listener loaded it without navigating away. Solid and structure views, rotation, zoom, keyboard commands and camera presets remain available.
- The upload reveal uses the parsed vertices, construction bounds, wireframe and printed surface. Earlier [vertices](../../output/playwright/world-materialize-vertices.png), [wireframe](../../output/playwright/world-materialize-wireframe.png) and [layer](../../output/playwright/world-materialize-layers.png) captures record the transition; final screenshots above show the revised framing. The sequence contains no fabricated upload percentage.
- Size, real available material, filament color, quality, quantity, supports, strength and finishing were exercised. At 70%, red PLA, Smooth and two copies, the STL quote was **SAR 88.52**. Delivery added SAR 15 once, producing **SAR 103.52**. The order was submitted through the cash checkout form.
- Admin received the actual file and configuration, revised the quote to SAR 110 and saved reviewed, printing, ready and declined states. Tracking reflected those states and retained production notes. Browser QA orders were explicitly closed as test records.
- Index search, category filtering, ascending price sorting and returning to World passed. A corrupt replacement STL showed a useful error and retained the valid model.
- Arabic home, macro, product, Lab and tracking were inspected. The HUD uses RTL placement, mirrored camera composition and locally hosted Arabic typography. There was no horizontal document overflow in the captured flows.

## Rendering and accessibility

[Recorded browser measurements](../../output/playwright/browser-world-results.json) show one canvas retained across repeated homepage shot cycles, **17 active geometry buffers before and after**, and **zero draw calls during the idle sample**. Desktop selected HIGH quality. HIGH / MEDIUM / LOW policies bound DPR and shadow quality; slow renders can lower the tier.

Reduced motion produced zero idle draw calls and immediate settling. The visibility-change handler stopped rendering and resumed correctly in an event simulation (0 hidden draw calls, 40 after resuming). This automation environment kept both real tabs marked visible, so the visibility result is explicitly an event simulation. These checks use Chromium viewport sizes, rather than a physical phone benchmark.

Keyboard rotation/zoom/reset, visible focus, accessible configuration labels and mobile viewer/swatch hit areas were checked. In a separate context with WebGL disabled, the failure message appeared and changing color still returned a quote with **Make this enabled**: [desktop](../../output/playwright/world-webgl-fallback-desktop.png), [mobile](../../output/playwright/world-webgl-fallback-mobile.png). Normal browser flows recorded no runtime or GPU errors.

A touch-enabled mobile browser was driven with native touch input. Horizontal dragging visibly rotated the object ([before](../../output/playwright/world-touch-before.png), [after](../../output/playwright/world-touch-after.png)); a vertical gesture scrolled the homepage normally. Stage touch rules permit vertical scrolling and browser pinch zoom while retaining horizontal model manipulation.

The shared renderer persists through scrolling and configuration within a customer document. Route links retain full document navigation for reliable cart and upload ownership. Compact checkout and admin previews use their existing renderer. Cleanup disposes replaced geometry/materials/textures, cancels scheduled frames and removes input listeners.

## Automated checks and remaining runtime configuration

The final command results and acceptance evidence are recorded in [material-world-gates.md](material-world-gates.md): application types, lint, **21 unit/regression tests**, local upload/order/admin/privacy/inventory integration checks, and a production build with decoded Meshopt asset validation and D1/private R2 bindings.

The native Orca adapter remains intact. **Actual slicing needs the existing service URL/token and exported, calibrated printer/process/filament profiles.** Those were not supplied in this environment. Unconnected analysis returns an explicit unavailable response; customer estimates remain labeled as estimates and require studio review. No physical printer execution or public deployment was performed.
