# Forma3D printer and pricing research

Retrieved 2026-10-02; incorporated into the website revision. The owner confirmed PLA in this revision. Forma3D's supplier invoices, incoming-delivery costs, electricity bill, failure rate, labour cost and target margin were not supplied. The user's own five stocked colours (red, blue, grey, black, white) take precedence over suppliers' availability.

## Official Ender-3 V3 SE specifications

Creality official user manual V1.1 equipment table: FDM; modeling dimensions 220 × 220 × 250 mm (X × Y × Z); one nozzle; standard 0.4 mm nozzle; layer height 0.1–0.35 mm; typical printing speed 180 mm/s; maximum 250 mm/s; acceleration 2,500 mm/s²; nozzle ≤260°C; bed ≤100°C; PLA / TPU 95A / PETG; rated electrical power 350W. Rated power is not measured average consumption.

Primary source (web search returned the full official equipment table; opening PDF returned internal error):
https://wiki.creality.com/products/diy/ender%E7%B3%BB%E5%88%97/ender-3v3se/%E5%A4%9A%E8%AF%AD%E7%A7%8D%E8%AF%B4%E6%98%8E%E4%B9%A6/ender-3_v3_se-sm-002_user_manual%EF%BC%88en%EF%BC%89.pdf

Corroborating official comparison specifies 1.75 mm filament, 220 × 220 × 250 mm build volume, standard 0.4 mm nozzle, 180 typical / 250 maximum speed, supported PLA/PETG/TPU 95A, 350W rated power:
https://store.creality.com/blogs/all/ender-3-v3-vs-v3-se-vs-v3-ke

Official support page directly readable today confirms 0.4 mm nozzle, PLA/TPU95A/PETG, 260°C nozzle, 100°C bed, 250 mm/s maximum, 0.1–0.35 mm layers:
https://www.creality.com/support/creality-ender-3-v3-se

Use build volume as printer capacity, not a blanket guarantee that a 220 × 220 footprint is feasible: orientation, brim and support footprint need to fit. Any operational clearance (e.g. reserving 5 mm each side) is a business policy, not the stated hardware limit. This is a single-nozzle/extruder machine; five stocked colours are five single-colour order choices, not proof of automatic multi-colour printing.

PLA is a sensible *provisional* default for ordinary models, decor and prototypes, because Creality describes it as easy to print with low printing temperatures and low tendency to warp. The owner has now confirmed PLA; the guide supports its use for this assortment:
https://www.creality.com/blog/the-buying-guide-for-creality-3d-printing-materials

Don't infer job time from 180 or 250 mm/s: the applicable filament profile, layer height, acceleration, geometry and supports determine slicer estimates. ARK's CR-PLA product page itself recommends 40–120 mm/s; Tab3's Sting3D PLA Pro lists 80–150 mm/s. Hardware ceiling and practical profile speeds differ.

## Saudi retail PLA observations

ARK3D is a direct Saudi seller with a Jeddah address. These five product pages are net 1 kg, 1.75 mm filament. Prices explicitly include VAT; incoming shipping is not included or verified. Retrieved 2026-10-02.

| Colour | Product | Displayed SAR/kg | Raw SAR/g | Displayed supplier availability | Direct primary URL |
|---|---|---:|---:|---|---|
| Blue | Creality CR-PLA | 87.00 | 0.0870 | In stock | https://arkaki.com/shop/product/creality-3d-printing-pla-filament-cr-1-75mm-1kg-blue/ |
| Grey | Creality CR-PLA | 87.00 | 0.0870 | In stock | https://arkaki.com/shop/product/creality-3d-printing-pla-filament-cr-1-75mm-1kg-gray/ |
| Black | Creality CR-PLA | 87.00 | 0.0870 | In stock; only 5 left | https://arkaki.com/shop/product/creality-3d-printing-pla-filament-cr-1-75mm-1kg-black/ |
| White | Creality CR-PLA | 87.00 | 0.0870 | In stock | https://arkaki.com/shop/product/cr-pla-white/ |
| Red | Creality CR-PLA | 80.50 | 0.0805 | Out of stock | https://arkaki.com/shop/product/creality-3d-printing-pla-filament-cr-1-75mm-1kg-red/ |

Available alternate red observation: Tab3, Riyadh, Sting3D PLA Pro red, 1.75 mm, 1 kg, SAR 89 (=0.089/g), Add To Cart displayed. The retrieved page does not explicitly state whether that price includes VAT; do not assume a tax treatment from its tax registration alone.
https://www.tab3.store/en/products/details/81/2

Lower-cost comparison: Tajseem ordinary PLA net 1 kg, 1.75 mm, displayed SAR 55 (=0.055/g), black selected; options black, grey, white, red and sky blue (not ordinary blue). Shipping calculated at checkout; page says tax included. Selected black shows 8 remaining; contradictory generic sold-out text is also present, so avoid asserting every colour is available.
https://tajseem.sa/products/%D9%81%D9%84%D9%85%D9%86%D8%AA-pla

Recommended provisional internal material baseline: 0.09 SAR/g, rounded from 87–89 SAR/kg observations. Label it "estimated material cost"; it is neither the owner's historical cost nor verified landed cost. Example optional 10% material-loss allowance gives 0.099 SAR/g; this 10% is an explicit business assumption, not a measurement. Add allocated inbound delivery to cost when invoices are known; avoid counting the same tax twice. All five customer colours can use the same retail rate unless actual invoices justify a difference.

## Customer-price recommendation

A public Jeddah print-service provider on Haraj directly advertises PLA SAR 0.50/g, printing SAR 3/hour and a SAR 25 minimum, shipping paid by purchaser. Retrieved 2026-10-02; this is a single public provider quote, not a market-wide average and not a quote to Forma3D. Full rates were exposed by web search; direct open returned no text.
https://haraj.com.sa/11182770121/%D8%B7%D8%A8%D8%A7%D8%B9%D8%A9_%D8%AB%D9%84%D8%A7%D8%AB%D9%8A%D8%A9_%D8%A7%D9%84%D8%A3%D8%A8%D8%B9%D8%A7%D8%AF_3D_Printing_%D8%AC%D8%AF%D8%A9/

Defensible, simple provisional print-only estimator:

`priceSAR = max(25, totalSlicedFilamentGrams * 0.50 + estimatedPrintHours * 3.00)`

Round the final estimate to a SAR 1 increment if desired. The SAR 0.50/g is a customer selling rate covering material, ordinary handling, overhead and margin; do not label it "filament cost". SAR 3/hour is a machine-service rate, not measured electricity cost. These remain Forma3D business assumptions until owner approval/data confirms viability. Complex model repair, design, finishing and delivery require separate pricing. Do not silently add a second material-waste multiplier to this retail formula.

Examples: 20 g and 1 hour → SAR 25 minimum; 50 g and 2 hours → SAR 31; 100 g and 4 hours → SAR 62. At 0.09 SAR/g baseline raw filament for the 100 g job is SAR 9, or SAR 9.90 if explicitly provisioning 10% waste. The rest of the selling price pays for machine time, hands-on work, packaging, failed prints, overhead and profit.

For real quotes use actual slicer grams including supports, brim and purge plus sliced time under the actual Ender-3 V3 SE profile. A browser geometry estimate can be presented as approximate, but cannot credibly be called an exact print quote. STL bounding-box volume is not material usage. If a slicer is not available, request review after file upload rather than fabricating exact time/weight.

For an owner cost audit later:
`materialCost = (spoolInvoice + allocatedInboundDelivery) / netSpoolGrams * totalSlicedGrams`
`machineCost = printHours * (measuredAverageKW * actualTariffPerKWh + printerCost / assumedUsefulPrintHours + maintenanceAllowancePerHour)`
`jobCost = expectedPrintCostWithFailureReserve + handsOnHours * labourRate + packaging`
`sellPrice = max(minimumOrder, jobCost / (1 - targetGrossMargin))`

Printer lifetime, labour rate, power usage, failure reserve and target margin need actual business data or visibly marked assumptions. Manufacturer 350W rated power must not be substituted for measured average usage without explicitly using it as an upper-bound estimate.

## Implemented revision

The configurator uses the physical 220/220/250 XYZ limits, auto-fit computes the limiting axis, and server quotes independently reject overflow. Model-native Z-up uploads rotate to Y-up only for rendering. One order item selects one PLA colour. Red/blue/grey/black/white are the initial palette; supplier stock does not override user stock.

The minimum applies after multiplying quantity on each configured order line. The initial catalog prices are editable base prices recomputed from mesh-volume-based mass estimates and the provisional selling policy, rounded up to whole SAR. Catalog prices scale with size cubed and quality/strength multipliers. Hollow radial-shell mass estimates account for their modelled cavity; solid phone-stand mass is adjusted for 20% infill using a conservative shell allowance. All masses/times remain provisional, not actual slicer measurements. The browser estimate and server use the same calculateQuote implementation. Custom unsupported geometry cannot be priced accurately from bounds alone; the website labels it provisional and confirms the quote before production.

Custom geometry fallback adds a visible 10% support-material allowance when automatic supports are selected; it is a provisional assumption, not a measured slicer result. The site uses a conservative 0.1–0.32 mm quality range for the standard 0.4 mm nozzle. Order submission checks combined material demand across every line. Configured stock quantities remain setup data until the owner enters a physical inventory count.
