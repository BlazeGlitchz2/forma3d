# Forma3D: Object Cinema

## 1. Current design autopsy
The reviewed desktop screenshot (../output/playwright/forma-redesign-final-desktop.png) puts a sky photograph behind a vase, six rounded option panels and two floating notes. Clouds have no connection to printed plastic. A centered conventional navigation, enclosing page frame, identical product thumbnails and pale blue surfaces flatten the hierarchy. The vase is a preview within a configuration form; its silhouette competes with UI. The mobile treatment inherits this hierarchy and stacks the controls. Functional features are valuable; this composition is replaced.

## 2. Creative thesis
Object Cinema: the print is a protagonist. Give a physical silhouette room to dominate, use type as set design, and bring controls into the scene only when the customer asks to make it theirs. Arrive, discover, manipulate, order.

## 3. Reference principles
Studied the primary project descriptions at [Lusion Gemini](https://v2.lusion.co/work/gemini/), [Lusion Spatial Fusion](https://lusion.co/projects/spatial_fusion/) and [Active Theory XR Experiments](https://xr.activetheory.net/). Their stated approaches combine art direction with interactive spatial experiences. Our design inference: frame a product deliberately, preserve spatial continuity, choose one strong focal point, and let physical response explain interaction. No layouts, assets, branding or effects are copied.

## 4. Visual language
Paper #efeee8; ink #24251f; cobalt #2548e8; vermilion #df4c32; stone #aaa99e; white #faf9f4. Paper and ink carry functional UI. Cobalt is a complete color scene and deliberate action accent. Vermilion belongs to the printed object, not random UI decoration.

Primary Latin: legally usable Google Fonts variable **Archivo**, using its width axis at 62.5–75% for display and 100% for functional text. Arabic companion: **IBM Plex Sans Arabic**. Display 100–190 px desktop, 64–98 px mobile; functional text 14–16 px; technical annotations 12 px. Compact, strong display forms contrast with quiet labels.

Full-width scenes, no enclosing website card. An irregular twelve-column gallery gives the vase seven columns and a smaller catchall five; the lamp takes a tall position. Product metadata rests directly on the page. Default controls use lines and selected underlines, not white cards. Corners: zero for scene geometry, 3 px for input comfort, circles only for filament swatches and object controls. Custom line-arrow gestures and dimensional brackets use a consistent 1.5 px stroke. Surface layer texture belongs on the plastic; no unrelated noise or blobs.

## 5. Motion language
Micro: 150 ms. Interface: 240 ms. Object: 550 ms. Scene continuity: 700 ms. Ease cubic-bezier(.22,.68,0,1). UI changes quickly; objects settle with weight. No scroll hijacking, animated cursors, audio, fade-up section stack or postprocessing. Reduced motion removes arrival, pointer shifts and continuity animation. Rendering is on demand, with responsive resolution tiers and visibility-aware scene creation.

## 6. Cinematography
Hero: vermilion Ripple Vase at a slight three-quarter tilt, very large, crossing the last line of headline. Warm key, soft fill, cool rim, restrained contact shadow. Gallery: alternate frontal vase, shallow catchall and tall lamp, varying scale. Product: close sculptural stage with product name in the upper edge and mode rail below, price at the opposite edge. Upload: empty dark scene becomes wireframe, sliced surface and selected material as actual parsing resolves; no fabricated progress or delay.

## 7. Desktop compositions
Arrival: left display / right large silhouette, with overlapping final word; two small actionable links under display. Bottom edge contains product title, local provenance and scroll cue.

    PRINT YOUR       / giant vase /
    NEXT             /           /
    THING.       / silhouette overlaps /
    shop / upload                   drag

Gallery: large vase left / small catchall right; next row stand left / tall lamp right. File scene: giant FILE → THING statement alongside wireframe turning into plastic. Color: one large object on cobalt, filament row directly below.

Product and upload: name in upper corner, stage takes 65–75% attention, horizontal mode rail below with a single active setting, price and action at bottom edge. Checkout switches to clear grouped forms and an object preview.

## 8. Mobile compositions
Quiet two-row compact navigation. Headline appears above and partly behind the boldly cropped hero vase. Gallery becomes asymmetrical single-column with paired small objects where space permits. Product stage 55–65 vh, a thumb-friendly setting rail, and visible price/action beneath. Upload screen itself accepts a drop; a visible choose-file action remains for touch and keyboard. RTL changes text and rail direction, never mirrors the actual object.

## 9. Exactly three signature moments
1. **Object/type arrival**: the oversized vase settles across the final word; pointer shifts stay within a few degrees and are disabled for reduced motion.
2. **File materialization**: real upload status precedes the model; the actual geometry appears wireframe then surface. Model and configuration remain interactive even if animation is disabled.
3. **Gallery-to-stage match cut**: product silhouette and its chosen filament persist across the gallery and deep-linked product scene using progressive View Transitions where supported. Normal links remain valid fallback.

## 10. Genericness test
No repeated storefront cards, generic feature row, SaaS pill header, clouds or frosted panels. With the object hidden, the compressed oversized typography, spatial overlap, paper/cobalt/dark scene rhythm and irregular gallery still establish hierarchy. Grayscale must retain headline/object contrast. Blur must preserve a dominant silhouette and secondary text block. Controls are quiet at arrival and become explicit when configuring. No invented credibility or unavailable material claims.

## Preservation contract
Keep API routes, authoritative quote requests, geometry parsing/validation, printer fit logic, storage, private uploaded assets, order submission, admin status/price revision, localization and session cart. Existing available material catalog stays authoritative. No deployment is implied by this rebuild. Verify TypeScript, lint, core tests, Worker production build, integration suite and screenshots of customer flows at desktop, laptop, tablet, large and small phone sizes. Emulate reduced motion, touch, no WebGL and slower network; emulation does not claim physical device testing.
