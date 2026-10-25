# Engineering Apps

Small, self-contained engineering explainers. No build step: open the HTML file in a browser.

**Live page:** https://avinashashok02.github.io/Engineering-Apps/ (links to both apps)

## Anatomy of Flight

**Live page:** https://avinashashok02.github.io/Engineering-Apps/aircraft-explorer/

Source: `aircraft-explorer/index.html`

A scroll-driven, animated guide to how an airliner works, in seven chapters. Each chapter pairs short explanations with a live panel that changes as you scroll.

| Chapter | What the panel shows |
| --- | --- |
| How planes fly | The four forces; a wind tunnel with an exact potential-flow (Joukowski) airfoil you can tilt, with pressure field, stall, lift-coefficient curve and timeline markers; drag curve; wingtip vortices; swept wings |
| Controls | A 3-D airliner you can fly with a stick pad, rudder, flaps and speedbrake; axes, turns, trim and stability |
| Engines | Animated cutaways of turbojet, turbofan, turboprop, turboshaft, ramjet and scramjet, station by station |
| Structure | X-ray wireframe of frames, stringers, bulkheads, wing box, centre box, gear and pylons, with wing bending and pressurisation |
| Materials | The airframe coloured by material, plus material-share and specific-strength charts |
| Systems | Primary flight display, fly-by-wire, envelope protection, hydraulics, electrics, fuel, air conditioning, ILS |
| A flight | Take-off to touchdown profile with live altitude, speed and vertical speed |

Deep links use the chapter or engine id, e.g. `index.html#controls` or `index.html#scramjet`.

Code layout: `js/core.js` holds the shared pieces (chapter router, scroll steps, stage panel, a small 3-D renderer and a parametric airliner model); each `js/ch-*.js` file is one chapter.

Figures are representative of each class of aircraft or engine, not of one specific model.

## Anatomy of an EV

**Live page:** https://avinashashok02.github.io/Engineering-Apps/battery-explorer/

Source: `battery-explorer/index.html`, model: `battery-model/`

The same scroll-driven format for batteries and electric drive units, in seven chapters. Chapters 3 and 4 run on real data: a gradient-boosted model forecasts NASA test cells' capacity 5–100 cycles ahead with calibrated uncertainty bands. It is tested leave-one-cell-out, and it cuts the error of a straight-line extrapolation by more than half.

| Chapter | What the panel shows |
| --- | --- |
| Cell | Animated cross-section: lithium ions shuttling between graphite and cathode, electrons round the circuit, open-circuit voltage curves for NMC, LFP and NCA |
| Ageing | Illustrative ageing simulator (temperature, charge level, daily distance, charge rate) with loss split into calendar, cycling, plating and knee |
| Data | Every NASA cell's measured capacity, grouped by test condition, with the cleaning rules |
| Forecaster | Pick a cell, slide "now", and compare the model's forecast fan with what happened and with two baselines; model card with errors, coverage and feature importance |
| Pack & BMS | Series/parallel arithmetic, 400 V vs 800 V, cell-group voltages and balancing, SOC estimation, thermal spread |
| Drive unit | PMSM, induction and wound-rotor motors with a rotating field, PWM, Si vs SiC, torque–speed envelope and efficiency map |
| To the wheels | Where the pack's power goes at steady speed, consumption against speed, winter heating and heat pumps, regen, fast charging |

Deep links use the chapter id, e.g. `battery-explorer/#model`. Retrain the model with `python -m bde.train` in `battery-model/` (see its README); that rewrites `battery-explorer/data/model.js`.

Illustrative models (ageing simulator, efficiency map, range) use textbook equations with typical coefficients and are labelled as such on the page.
