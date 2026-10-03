# Gates: Forma3D

Scope: Deliver the requested interactive 3D storefront and durable private order workflow, with a reviewed reference-inspired design and explicit external slicing handoff when no slicer endpoint exists.

- [x] G1: TypeScript accepts the complete application.
  CHECK: node scripts/verify-types.mjs
  EXPECT: FORMA_TYPES_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=3403506fc6c9e476d857a29e63b8d486f4cc732d5bb54ddb4df633067472b98e; exit=0; EXPECT=matched; output-sha256=1fbde055fa36cee559204c75d2b36460269a8a707215937cc01c02e91ebc61ae; output-bytes=19; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=9ef7321fede9/24 entries

- [x] G2: Application lint has no actionable errors.
  CHECK: node scripts/verify-lint.mjs
  EXPECT: FORMA_LINT_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=9bde01c8be7cfd04668bcdc0e7ec6be94b8b5d5d9105ca5c14e38464922df1bf; exit=0; EXPECT=matched; output-sha256=1b5c8d7226b11b486fda0cc5ba808be2b9292275a057fa469a1571e587922970; output-bytes=18; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=9ef7321fede9/24 entries

- [x] G3: Pricing and model-validation tests reject invalid input and produce server quotes.
  CHECK: node --experimental-strip-types --test tests/core.test.ts
  EXPECT: fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=bc8ea48cadd6c66d6aeb9435ea7eabb24f7207363e0d5073efcc49ebb684e4c4; exit=0; EXPECT=matched; output-sha256=ca6af3071edfc4937a9e0ace9c5c69b001ca5b80bb02744d348666bff9ce34ac; output-bytes=824; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=9ef7321fede9/24 entries

- [x] G4: Uploaded private geometry, guest orders, owner admin changes and tracking pass an end-to-end integration test.
  CHECK: node tests/integration.mjs
  EXPECT: FORMA_INTEGRATION_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=1a55db0983a202edfc7ae8a793e4775bc1ef20e29e72f3a2bdb7bd7e37b320a5; exit=0; EXPECT=matched; output-sha256=6af08b56a6f4a6c1f9f33b9b7cf44316a2fef35b86960d6b969ac20661b937a6; output-bytes=25; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=9ef7321fede9/24 entries

- [x] G5: Desktop, touch-size mobile, RTL, corrupt uploads, large geometry and reduced motion have been reviewed in a browser.
  EVIDENCE: Built Worker browser review at desktop 1440 px and mobile 390 × 844 px; checkout/tracking, corrupt and 16 MB uploads, 500 mm auto-fit, actual mesh drag/zoom, Arabic document and portaled menus, reduced motion, zero console errors. Details in docs/verification.md.

- [x] G6: Production Worker build succeeds and includes storage migrations.
  CHECK: node scripts/verify-build.mjs
  EXPECT: FORMA_BUILD_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=fa8287365ff5436cb3e10050f278ac5cc07dff5867ad4f783acd4aaffbfcf970; exit=0; EXPECT=matched; output-sha256=f030b2df510aa1c41fbfd240707a022715808d93165a7ca7154af717d09103b0; output-bytes=2225; shell=/bin/sh; cwd=/Users/hamzaahmad/Documents/ChatGPT/Forma3D website/site; path=9ef7321fede9/24 entries

- [x] G7: Private Site publication returns a succeeded status and usable URL.
  EVIDENCE: Native private deployment appgdep_6abe9a1176b481919a94104077430bb8 succeeded at 2026-10-01T17:37:26Z with environment revision 1 and URL https://forma3d-jubail.rasheelkhan545.chatgpt.site; pushed source 11bd2e1f7c5328f1167da6fc12db8dfa42eef662.

- [x] G8: An actual server slicer is used for stage-two quotes when an endpoint is configured; without one, estimates remain explicitly provisional and admin-reviewed.
  EVIDENCE: No SLICER_URL or physical printer profiles were supplied. Integration verifies explicit 503 fallback; UI labels estimates provisional and admin confirms quotes/status. Actual native adapter is included and syntax-checked; physical slicing remains an explicit setup/calibration handoff in README.md.
