# Gates: Forma Material World rebuild

Scope: Rebuild the full customer experience as a spatial material world while preserving the existing bilingual upload, quote, cash ordering, tracking, inventory and administration system.

- [x] G1: Every supplied reference is deconstructed and the scene system is specified before customer code changes.
  EVIDENCE: All four attached screenshots were inspected. reference-deconstruction.md records the eleven requested observations for each. forma-world.md defines palette, type, lighting, physical materials, camera, motion, HUD, routes and mobile before customer implementation.

- [x] G2: Revised application types and interfaces are valid.
  CHECK: node scripts/verify-types.mjs
  EXPECT: FORMA_TYPES_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=3403506fc6c9e476d857a29e63b8d486f4cc732d5bb54ddb4df633067472b98e; exit=0; EXPECT=matched; output-sha256=1fbde055fa36cee559204c75d2b36460269a8a707215937cc01c02e91ebc61ae; output-bytes=19; shell=/bin/sh; cwd=/Users/hamzaahmad/Downloads/Forma3D website/site; path=a51e9c5634a8/24 entries

- [x] G3: Revised application has no lint errors.
  CHECK: node scripts/verify-lint.mjs
  EXPECT: FORMA_LINT_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=9bde01c8be7cfd04668bcdc0e7ec6be94b8b5d5d9105ca5c14e38464922df1bf; exit=0; EXPECT=matched; output-sha256=1b5c8d7226b11b486fda0cc5ba808be2b9292275a057fa469a1571e587922970; output-bytes=18; shell=/bin/sh; cwd=/Users/hamzaahmad/Downloads/Forma3D website/site; path=a51e9c5634a8/24 entries

- [x] G4: Geometry, printer limits, price arithmetic and model validation retain their tested behavior.
  CHECK: node --experimental-strip-types --test tests/core.test.ts tests/world-framing.test.ts
  EXPECT: fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=747e79e0a7eab779b983762cc8c18613b1abd5631aaf8cd8f0f18e051bb94211; exit=0; EXPECT=matched; output-sha256=f06c01387b18261aec246d3d0d5b4bf3e164837b77cb230bf1d1b211f3b121ca; output-bytes=1955; shell=/bin/sh; cwd=/Users/hamzaahmad/Downloads/Forma3D website/site; path=a51e9c5634a8/24 entries

- [x] G5: Real private STL/3MF uploads, quotes, order receipt, status updates, price revision, decline, tracking and inventory pass local integration checks.
  CHECK: node --experimental-strip-types scripts/create-world-fixtures.mjs && FORMA_TEST_URL=http://127.0.0.1:5174 node tests/integration.mjs
  EXPECT: FORMA_INTEGRATION_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=d388c4b9dce3b88a9b951029a3134f465ffa490502022cb045861cceae906c87; exit=0; EXPECT=matched; output-sha256=8b747913c8a2eaff8ae462a4485a524b008f76e139aef45c2f188c163725d350; output-bytes=52; shell=/bin/sh; cwd=/Users/hamzaahmad/Downloads/Forma3D website/site; path=a51e9c5634a8/24 entries

- [x] G6: Production build succeeds and includes the existing private storage bindings.
  CHECK: node scripts/verify-material-world-build.mjs
  EXPECT: FORMA_WORLD_BUILD_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=ecbdbb498a8899106a7b8c38f2d92fd3b9d4b04132894fc1dcb2d8c628fa5a36; exit=0; EXPECT=matched; output-sha256=5e0d2b30b4823dd38465bd3b83bff04c6993686bebc9b2272ae37cc82fe3e6d7; output-bytes=1886; shell=/bin/sh; cwd=/Users/hamzaahmad/Downloads/Forma3D website/site; path=a51e9c5634a8/24 entries

- [x] G7: Home, spatial archive, product stage and Lab dominate with actual rendered geometry and typography; desktop and mobile screenshots pass visual review against the four references.
  EVIDENCE: Native 1440×900 and 390×844 screenshots for every major customer screen were inspected. The four-image reference comparison and Gaussian-blurred composition review pass the object/type hierarchy and card tests. Iterations corrected macro crops, floor horizon, small mobile subjects, wireframe legibility and upload camera clipping. Paths and critique are recorded in material-world-verification.md and ../../output/playwright/.

- [x] G8: Browser interactions verify drag/file picker, STL and 3MF materialization, rotation, zoom, size measurements, color/material/quality/quantity, accurate quotes and cash order confirmation.
  EVIDENCE: Real 3,888,084-byte STL picker uploads and a valid 40 mm 3MF dropped over the header passed. Corrupt replacement retained the valid file. Rotation/zoom/structure, 70% measurements, PLA/colors/Smooth/quantity 2 and advanced controls were exercised. SAR 88.52 plus SAR 15 delivery became a real SAR 103.52 cash order. Confirmation retained the actual configured model. Native Orca remains dependent on the existing external service/profiles; unavailable analysis is verified and estimates are labeled.

- [x] G9: Tracking and confirmation reflect real production status; optional archive index search/category/sort and admin review remain usable.
  EVIDENCE: Browser admin review opened the actual private STL, revised the quote to SAR 110, and persisted reviewed/printing/ready/declined history. Tracking showed the matching object/status/price/notes. Search, Room filtering, ascending prices and returning from Index to World passed. Both browser QA orders were explicitly closed as test records. Desktop/mobile confirmation, production-state and admin captures are linked in the verification report.

- [x] G10: Arabic RTL, mobile controls, reduced motion, keyboard focus, WebGL fallback and render/disposal behavior are verified in the running site.
  EVIDENCE: Arabic home/macro/product/Lab/tracking were visually inspected; captures have no horizontal overflow. Keyboard input/focus and native horizontal/vertical mobile touch were verified. A WebGL-disabled browser retained working color/quote/order controls. One canvas and 17 buffers remained after repeated homepage scene cycles; idle and reduced-motion samples had zero draw calls. Visibility event simulation produced zero hidden draws and resumed rendering; automation tabs themselves remained visible. Measured results and physical-device testing limits are recorded in material-world-verification.md and ../../output/playwright/browser-world-results.json.
