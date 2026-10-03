# Forma / Material World

## Thesis

**Geometry gains weight.** Enter a material world where a printed form interrupts enormous typography, then manipulate the same physical object and order it from Jubail. The system's existing private uploads, authoritative pricing and order workflows remain real.

## Art direction

- **Cobalt `#163cde`:** opening environment and object archive. A saturated stage, not an accent distributed across cards.
- **Ink `#080a0f`:** custom lab, production and confirmation; controlled light and large negative space.
- **Paper `#efeee5`:** macro material moment, local pause and checkout.
- **Heat `#e34c2c`:** a secondary filament form and selected archive shots.
- **Mist `#a9b7c9`:** technical lines and secondary text in dark scenes.
- **Type:** locally hosted Archivo, heavy and tightly spaced for display; neutral regular Archivo for utilities. IBM Plex Sans Arabic replaces Latin display lettering in RTL; it is recomposed, not reflected.

The generic grid/card design-system recommendations were reviewed and rejected against the reference-locked brief. Accessibility, touch targets and GPU cleanup guidance remain applicable.

## World and camera

One persistent, lazy-loaded Three.js renderer under a precise HTML HUD. Display type sits behind the alpha canvas; foreground geometry physically occludes letters. The world includes a lit build surface, a tactile print, soft contact shadow and occasional secondary filament sculpture. No default orbiting turntable.

The opening object is huge, offset to the right, with a close three-quarter view. Native scroll moves to an extreme material macro and then a quiet local view. Archive objects receive distinct scale, elevation and angles. Product and custom stages keep a large, useful silhouette; size mode adds fine measurement marks in 3D. Rotation, zoom, reset and standard views have explicit accessible controls. Pointer drift is small and inertial; touch drag preserves vertical page movement.

## Physical surfaces

Matte PLA uses diffuse response with controlled rim/key light. Silk, PETG and TPU shader responses are supported when the corresponding material is actually available in the catalog. Current inventory only offers PLA: no invented saleable materials. Finish and quality change visible relief/roughness. World-space derivative-filtered layer relief works on uploaded models without UVs. Large soft key, cool rim, controlled fill, room reflection and contact shadow establish physical scale.

Curated procedural geometry is exported to indexed, binary GLB previews separate from production files; arbitrary admin models still use their real private source. Device tiers cap DPR, render only during interaction or scene transitions, pause when hidden, and dispose obsolete geometry, materials, textures and contexts.

## Three signature moments

1. **Opening:** enormous printed form crosses `IDEAS / HAVE / WEIGHT.`; edge metadata, one direct Lab action and an archive link.
2. **Materialization:** full-viewport Lab reacts to file drag; a valid uploaded STL/3MF resolves from points to wireframe to surface, with a slicing plane and first shadow. Real parsing/upload status is separate from the short visual reveal; no artificial processing wait or invented progress.
3. **Object selection:** scrolling archive changes the physical subject; opening an object retains its form and color in a full-screen configuration stage with its name behind it.

## Screens

- **Home:** cobalt opening → paper macro/layer material moment → ink file invitation → paper `MADE / IN / JUBAIL.` visual pause. No grids or feature cards.
- **Objects `/shop` and `/objects`:** sequential spatial shots, each with individual camera composition. Optional **Index** reveals search, category and price sorting in compact rows.
- **Product `/make?product=…`:** full viewport object; huge name behind it; corner metadata and price. Bottom configuration modes: size, material, color, quality, more. Quantity belongs to the mode system, not a permanent sidebar.
- **Lab `/make` and `/lab`:** full viewport drop target, explicit file picker for keyboard/touch. File, measurement, material, quality and quote controls appear around the object after a real upload.
- **Checkout:** quiet paper, labelled name/phone/area/fulfillment/notes fields, cash order, model preview; existing backend validation and idempotency preserved.
- **Confirmation:** ink room with the configured object, order code and restrained production sequence.
- **Tracking:** production timeline and actual status drive wireframe/sliced/solid presentation; polling pauses when the document is hidden.
- **Admin:** retain efficient table/editor behavior and existing authorization, stock logic and review/revise/decline operations.

## HUD and motion

Small text/navigation, fine lines used only for measurements and states, square text actions with generous target areas. No glass panels, floating navbar capsule or shopping-bag identity. Current order is a numeric edge indicator. Short HUD transitions (120–200 ms), heavier camera movements (650–950 ms). Reduced motion immediately uses final states. Color changes are material changes, not simulated browser filters.

## Mobile

Recompose the opening into two large display lines with the form occupying the central shot and actions clear at the bottom. Archive cameras move closer and retain varied angles. Configuration HUD places price beside the compact mode dock; active controls stay reachable without a sidebar. Camera uses mobile-specific framing; lower DPR and shadows adapt automatically. Arabic controls use logical positioning, meaningful translations, and physical geometry retains its orientation.

## Acceptance loop

For home, archive, Lab, product, confirmation and tracking: capture desktop at **1440 × 900** and mobile at **390 × 844**, inspect the actual screenshots, and compare hierarchy, crop and density with the four supplied images. Check reference gap, commerce grammar, obvious containers, 3D dominance and blurred composition. Exercise real uploads and ordering rather than relying on render-only evidence.
