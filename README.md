# Engineering Apps

Small, self-contained engineering explainers. No build step: open the HTML file in a browser.

## Anatomy of Flight

**Live page:** https://raw.githack.com/AvinashAshok02/Engineering-Apps/claude/animated-jet-engine-tool-4qeto0/aircraft-explorer/index.html

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
