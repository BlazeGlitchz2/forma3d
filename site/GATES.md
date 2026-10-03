# Gates: Forma3D reference redesign

Scope: Rebuild the storefront around an immersive 3D product studio; configure Ender-3 V3 SE limits, five stock colours, researched Saudi PLA costs and coherent quotes; publish the revised existing Site.

- [x] G1: TypeScript accepts the revised application.
  CHECK: node scripts/verify-types.mjs
  EXPECT: FORMA_TYPES_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=3403506fc6c9e476d857a29e63b8d486f4cc732d5bb54ddb4df633067472b98e; exit=0; EXPECT=matched; output-sha256=1fbde055fa36cee559204c75d2b36460269a8a707215937cc01c02e91ebc61ae; output-bytes=19; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=5e82d9a7202b/24 entries

- [x] G2: Application lint is clean.
  CHECK: node scripts/verify-lint.mjs
  EXPECT: FORMA_LINT_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=9bde01c8be7cfd04668bcdc0e7ec6be94b8b5d5d9105ca5c14e38464922df1bf; exit=0; EXPECT=matched; output-sha256=1b5c8d7226b11b486fda0cc5ba808be2b9292275a057fa469a1571e587922970; output-bytes=18; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=5e82d9a7202b/24 entries

- [x] G3: Pricing rejects Ender build-volume overflow and validates stock colours and researched cost arithmetic.
  CHECK: node --experimental-strip-types --test tests/core.test.ts
  EXPECT: fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=bc8ea48cadd6c66d6aeb9435ea7eabb24f7207363e0d5073efcc49ebb684e4c4; exit=0; EXPECT=matched; output-sha256=ef1244cf2f15f39ac7b212bf2772b681d8da1bb4a7ece8a5ed8394370ef324fc; output-bytes=1850; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=5e82d9a7202b/24 entries

- [x] G4: Private upload, authoritative quotes, checkout, tracking and owner administration still work end to end.
  CHECK: node tests/integration.mjs
  EXPECT: FORMA_INTEGRATION_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=1a55db0983a202edfc7ae8a793e4775bc1ef20e29e72f3a2bdb7bd7e37b320a5; exit=0; EXPECT=matched; output-sha256=6af08b56a6f4a6c1f9f33b9b7cf44316a2fef35b86960d6b969ac20661b937a6; output-bytes=25; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=5e82d9a7202b/24 entries

- [x] G5: Reference composition and 3D materials are visually reviewed at desktop, mobile and Arabic; rotate, colour, scale, model switching and reduced motion work.
  EVIDENCE: Production artifact reviewed at 1440 × 1080 and 390 × 844; full rim/base visible; camera and upload controls clear; five colours, rotate/zoom/wireframe, geometry switching, size pricing, upload 44% auto-fit, cash receipt and tracking verified. Arabic RTL has no overflow. Final touch build: horizontal rotation changed pixels, vertical scroll reached 210px, reduced-motion animation is none. Screenshots: parent output/playwright/forma-redesign-final-desktop.png, forma-redesign-mobile.png, forma-redesign-arabic-mobile.png.

- [x] G6: Printer specifications and dated Saudi colour price observations are traceable to primary sources; assumptions and native slicing limits are explicit.
  EVIDENCE: Owner confirmed PLA. Official Creality Ender-3 V3 SE specifications and dated Saudi direct-supplier observations are linked in docs/printer-pricing-research.md. Raw material baseline, provisional selling tariff, support/time assumptions, inherited inventory quantity and unconfigured calibrated slicing are explicitly separated.

- [x] G7: Production Worker build retains private storage bindings and migrations.
  CHECK: node scripts/verify-build.mjs
  EXPECT: FORMA_BUILD_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=fa8287365ff5436cb3e10050f278ac5cc07dff5867ad4f783acd4aaffbfcf970; exit=0; EXPECT=matched; output-sha256=59a5c9f2ec42e3c108566a716df88a202fa456dd4c95183b123eb982ae45a797; output-bytes=2239; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=5e82d9a7202b/24 entries

- [x] G8: Revised source is pushed and the existing Site publishes successfully with its audience preserved.
  EVIDENCE: Native publication succeeded on 2 October 2026; pushed commit e03a665139fb64b5addafe75fbe21e3297cfa65a; deployment appgdep_6abee4aba10c8191ada4a840a6d9cf91; existing owner-private audience preserved; https://forma3d-jubail.rasheelkhan545.chatgpt.site.
