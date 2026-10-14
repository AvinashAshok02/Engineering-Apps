/* Chapter: Structure. X-ray wireframe of a single-aisle airframe. */
(() => {
"use strict";
const { clamp, lerp, deg: D, r3: R3 } = App;

const ALL = ["frames", "stringers", "windows", "doors", "floor", "bulkhead", "spars", "ribs", "skin", "outline", "centrebox", "keel", "tail", "gear", "pylon", "nacelle"];
const STEPS = [
  { overview: true, kicker: "Chapter 4", title: "Structure", hl: ALL, cam: [-2.3, .42, 78],
    tagline: "A thin aluminium or carbon tube, stiffened from the inside, carrying loads its own weight many times over.",
    body: "<p>An airliner's structure weighs only about 30% of its maximum take-off weight, yet it has to survive gusts, hard landings, twenty years of daily pressurisation and loads half as large again as the worst it should ever meet in service.</p><p>The trick is the semi-monocoque: a thin skin that carries load, kept from buckling by a skeleton of frames, stringers, spars and ribs. Drag the drawing to look around.</p>",
    facts: [["Empty weight", "About 42 t for a 78 t take-off weight jet"], ["Skin thickness", "About 1.6–2 mm on the fuselage"], ["Design life", "About 48,000 flights or 60,000 hours"]],
    ro: [["Structure share", "~30<small>% of MTOW</small>"], ["Fuselage frames", "~70<small>at 53 cm pitch</small>"], ["Wing ribs", "~25<small>per wing</small>"]] },
  { title: "Skin, frames and stringers", tag: "Semi-monocoque", hl: ["frames", "stringers"], cam: [-2.0, .3, 62],
    body: "<p>The fuselage skin is the main structure, not a cover. Hoop-shaped frames every half metre or so keep it round; long stringers running nose to tail stop it buckling when the body bends. Together they turn sheets a couple of millimetres thick into a tube stiff enough to carry the tail, the passengers and the cargo.</p><p>Early aircraft used a frame of tubes with fabric stretched over it. Putting the skin to work saved enormous weight.</p>",
    ro: [["Frame pitch", "~53<small>cm</small>"], ["Stringer pitch", "~20<small>cm</small>"], ["Skin", "1.6–2<small>mm</small>"]] },
  { title: "Pressurisation", tag: "A balloon that flies", hl: ["frames", "windows", "doors"], breathe: true, cam: [-1.9, .2, 58],
    body: "<p>At 35,000 ft the outside air pressure is a quarter of sea level. The cabin is pumped up to the equivalent of 6,000–8,000 ft, so the fuselage holds a pressure difference of about 0.6 bar. Every square metre of cabin skin is pushed outward with a force of about 6 tonnes.</p><p>The tube swells slightly on every flight and relaxes on landing: one fatigue cycle per flight. Windows and doors are cut-outs in a stressed skin, so they are rounded and heavily reinforced. Square-cornered openings concentrate stress, a lesson learned from the de Havilland Comet accidents of 1954.</p>",
    hint: "The swelling in the drawing is exaggerated about 50 times.",
    ro: [["Cabin altitude", "8,000<small>ft max</small>"], ["Pressure difference", "0.59<small>bar</small>"], ["Load on skin", "~6<small>t per m²</small>"]] },
  { title: "Bulkheads and floor", tag: "Closing the tube", hl: ["bulkhead", "floor"], cam: [-2.6, .55, 54],
    body: "<p>The pressurised tube is sealed by a flat bulkhead behind the radar in the nose and a domed bulkhead in front of the tail. A dome carries pressure as tension in its skin, just like a balloon, so it can be far lighter than a flat wall.</p><p>Floor beams span the fuselage at every frame, carrying seats on rails and splitting the cabin from the cargo hold below. They also brace the frames against the pull of pressurisation.</p>",
    ro: [["Aft bulkhead", "dome<small>membrane</small>"], ["Floor beams", "1<small>per frame</small>"], ["Seat rails", "4<small>tracks</small>"]] },
  { title: "Wing box", tag: "Spars and ribs", hl: ["spars", "ribs", "skin"], bend: [0, 1.4], cam: [-2.75, .55, 52],
    body: "<p>The wing's backbone is a box: a front spar and a rear spar, joined by thick top and bottom skins stiffened with stringers. Ribs every half metre or so keep the airfoil shape and stop the skins buckling. The leading edge and trailing-edge surfaces bolt onto the front and back of the box.</p><p>The box is sealed and holds the fuel. Wings flex upward in flight, more on long composite wings; under test, a 787 wing bent up about 7.6 m before reaching its required load.</p>",
    hint: "Lift bends the wing up; the fuel inside it pushes back down, which relieves the bending at the root.",
    ro: [["Spars", "2<small>front + rear</small>"], ["Tip deflection", "1–3<small>m in flight</small>"], ["Fuel in wings", "~13<small>t</small>"]] },
  { title: "Centre wing box and keel", tag: "Through the fuselage", hl: ["centrebox", "keel"], cam: [-2.2, -.35, 46],
    body: "<p>The two wings don't bolt to the sides of the fuselage. Their boxes continue straight through it as the centre wing box, so each wing's huge bending load is balanced by the other inside the aircraft. The fuselage just sits on top.</p><p>Behind it, the landing gear bay leaves a large hole in the belly. A keel beam bridges the gap and carries fuselage bending loads past it.</p>",
    ro: [["Root bending", "~2<small>MN·m per wing at 1 g</small>"], ["Centre tank", "~6.5<small>t fuel</small>"], ["Keel beam", "under gear bay"]] },
  { title: "Tail", tag: "Empennage", hl: ["tail"], cam: [-2.6, .4, 48], target: [-12, 0, 2],
    body: "<p>The horizontal stabiliser and the fin are small wings with the same spar-and-rib build. The horizontal tail pivots at its rear spar for trim, driven by a jackscrew at its front spar.</p><p>On modern airliners the tail is usually carbon fibre composite; it was one of the first major structures to switch from aluminium.</p>",
    ro: [["Fin height", "~6<small>m</small>"], ["Tail span", "12.5<small>m</small>"], ["Material", "CFRP<small>usually</small>"]] },
  { title: "Landing gear", tag: "Hard landings", hl: ["gear"], cam: [-2.4, -.15, 50],
    body: "<p>The landing gear must absorb a touchdown at up to 3 m/s (10 ft/s) vertical speed at maximum landing weight. Oleo-pneumatic shock struts do it: oil forced through small holes soaks up energy, and compressed nitrogen acts as the spring.</p><p>The main legs attach to the rear spar of the wing and a gear beam; the nose leg sits in its own bay under the cockpit. Gear legs are made from ultra-high-strength steel, the heaviest material on the aircraft.</p>",
    ro: [["Design sink rate", "3.05<small>m/s</small>"], ["Main wheels", "4<small>tyres</small>"], ["Tyre pressure", "~14<small>bar</small>"]] },
  { title: "Engine pylons", tag: "Hanging the engines", hl: ["pylon", "nacelle"], cam: [-2.0, .1, 40], target: [2, -5, -1],
    body: "<p>Each engine hangs from a pylon, a box structure that carries several tonnes of engine plus all its thrust into the wing. Engines under the wing also help: their weight bends the wing down, countering lift, and they keep the engines easy to reach for maintenance.</p><p>The pylon attaches with fuse pins designed to break in a specific way in a severe impact, so the engine separates cleanly rather than tearing open the fuel tank.</p>",
    ro: [["Engine mass", "~3<small>t each</small>"], ["Thrust carried", "120<small>kN each</small>"], ["Fuse pins", "designed to fail safely"]] },
  { title: "Loads and safety factors", tag: "Certification", hl: ALL, bend: [2.4, 3.6], cam: [-2.9, .2, 70],
    body: "<p>Transport aircraft are designed to a limit load of +2.5 g (and −1 g): the most they should ever see in service, with no permanent deformation. They must then survive 1.5 times that, the ultimate load of 3.75 g, for at least three seconds without breaking. Manufacturers prove it by bending a real airframe until it gets there.</p><p>Fatigue matters as much as strength. Structures are designed to be damage tolerant: a crack must grow slowly and be found at an inspection long before it becomes dangerous.</p>",
    ro: [["Limit load", "+2.5<small>g</small>"], ["Ultimate load", "+3.75<small>g</small>"], ["Safety factor", "1.5"]] }
];

const S = { step: 0, t: 0, cam: { az: -2.3, el: .42, dist: 78, target: [0, 0, 0] }, goal: null, lines: null, bend: 0, breathe: 0 };
let ui, stage, cv, W = 0, H = 0;

function onStep(i, st) {
  S.step = i;
  S.goal = { az: st.cam[0], el: st.cam[1], dist: st.cam[2], target: st.target || [0, 0, 0] };
  S.cam.user = false;
  stage.setReadouts(st.ro);
  stage.cond.textContent = st.overview ? "Drag to rotate" : st.title;
}

App.register({
  id: "structure", nav: "Structure",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Airframe X-ray", aspect: "16 / 10" });
    cv = stage.cv;
    App.orbit(cv.el, S.cam);
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    ui.extras.innerHTML = `<span class="label">Reference</span><h2>What the structure must survive</h2>
      <p class="lede">Certification requirements for large transport aircraft (EASA CS-25 and FAA Part 25), with the figures for a typical single-aisle jet.</p>
      <div class="scroll-x"><table><thead><tr><th>Load case</th><th class="num">Requirement</th><th>Why</th></tr></thead><tbody>
      <tr><td>Manoeuvre</td><td class="num">+2.5 g / −1 g</td><td>Pull-ups and pushovers, with flaps up. With flaps out the limit is +2 g.</td></tr>
      <tr><td>Ultimate</td><td class="num">× 1.5</td><td>Limit loads multiplied by 1.5, held for 3 seconds without failure.</td></tr>
      <tr><td>Gusts</td><td class="num">17 m/s</td><td>Reference vertical gust near sea level (56 ft/s), reducing with altitude.</td></tr>
      <tr><td>Pressurisation</td><td class="num">× 1.33 or more</td><td>Fuselage tested above the maximum pressure difference, with extra factors for doors and windows.</td></tr>
      <tr><td>Landing</td><td class="num">3.05 m/s</td><td>Sink rate at maximum landing weight, 1.8 m/s at take-off weight.</td></tr>
      <tr><td>Bird strike</td><td class="num">1.8 kg at cruise speed</td><td>Windshield and structure must allow continued safe flight.</td></tr>
      <tr><td>Fatigue</td><td class="num">2–3 × design life</td><td>Full-scale fatigue test airframe cycled through multiple lifetimes of flights.</td></tr>
      </tbody></table></div>`;
  },
  activate() { this.resize(); },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame(dt) {
    if (!W) return;
    S.t += dt;
    const st = STEPS[S.step], T = App.tokens;
    // camera: ease toward the step's view, then drift slowly unless the reader has grabbed it
    if (S.goal && !S.cam.user) {
      const k = Math.min(1, dt * 2.2);
      S.cam.az = lerp(S.cam.az, S.goal.az + .25 * Math.sin(S.t * .15), k);
      S.cam.el = lerp(S.cam.el, S.goal.el, k); S.cam.dist = lerp(S.cam.dist, S.goal.dist, k);
      S.cam.target = S.cam.target.map((v, i) => lerp(v, S.goal.target[i], k));
    }
    const bendGoal = st.bend ? lerp(st.bend[0], st.bend[1], .5 + .5 * Math.sin(S.t * 1.1)) : 0;
    S.bend = lerp(S.bend, bendGoal, Math.min(1, dt * 3));
    const brGoal = st.breathe ? .03 * (.5 + .5 * Math.sin(S.t * 1.6)) : 0;
    S.breathe = lerp(S.breathe, brGoal, Math.min(1, dt * 4));
    const lines = App.geo.structure({ bend: S.bend, breathe: S.breathe });
    const ctx = cv.begin();
    ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
    const cam = R3.cam({ ...S.cam, zoom: .95 }, W, H);
    const hl = new Set(st.hl), over = st.overview || st.hl === ALL;
    const dim = "rgba(127,147,158,0.16)", hiCol = T["hi"];
    const groupCol = { frames: T["airframe"], stringers: T["airframe"], windows: "#82b1ff", doors: "#82b1ff", floor: T["lp"], bulkhead: "#ff8a65", spars: T["hp"], ribs: T["hp"], skin: T["hp"], outline: T["metal-hi"], centrebox: "#ff8a65", keel: "#ff8a65", tail: T["lp"], gear: "#c792ea", pylon: "#c792ea", nacelle: T["metal-hi"] };
    const big = W > 520 ? 1.6 : 1.2;
    R3.lines(ctx, cam, lines, l => {
      if (over) return [groupCol[l.part] || T["airframe"], l.part === "stringers" || l.part === "frames" ? .7 : 1];
      if (hl.has(l.part)) return [l.part === "stringers" ? T["lp"] : hiCol, big];
      return [dim, .6];
    });
    if (st.bend) App.label(ctx, `wing tip deflection ${S.bend.toFixed(1)} m`, 12, H - 12, T["stage-muted"], "left", 11);
    if (st.breathe) App.label(ctx, `cabin pressurised · swelling ×50`, 12, H - 12, T["stage-muted"], "left", 11);
  }
});
})();
