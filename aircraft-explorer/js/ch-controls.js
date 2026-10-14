/* Chapter: Controls. A flyable 3-D airliner showing the axes, primary and
   secondary control surfaces, turning, trim and stability. */
(() => {
"use strict";
const { clamp, fmt, deg: D, r3: R3 } = App;

const CONF = [{ n: "0", flap: 0, slat: 0 }, { n: "1", flap: 0, slat: 18 }, { n: "2", flap: 15, slat: 22 }, { n: "3", flap: 20, slat: 22 }, { n: "Full", flap: 35, slat: 27 }];
const MAX = { ail: 20, elev: 25, rud: 25, spoil: 40 };

const STEPS = [
  { overview: true, kicker: "Chapter 2", title: "Controls", demo: "cruise", hl: [],
    tagline: "Three rotations, a handful of hinged panels, and a pilot (or computer) coordinating them.",
    body: "<p>An aircraft is steered by changing the airflow over small parts of its wings and tail. Tilt a panel down and that surface lifts more; tilt it up and it lifts less. Placed far from the centre of gravity, a small force makes a big turning moment.</p><p>The aircraft on the right responds to the controls under it. Each step demonstrates one surface; the last step hands you the controls.</p>",
    facts: [["Primary controls", "Ailerons, elevators, rudder"], ["Secondary", "Flaps, slats, spoilers, trim"], ["Typical throw", "Ailerons ±20°, elevator ±25°, rudder ±25°"]],
    hint: "Drag the stick pad at any time to take over. The demonstration stops while you fly." },
  { title: "Three axes", tag: "Roll · pitch · yaw", demo: "axes", hl: [], axes: true,
    body: "<p>Every rotation of an aircraft is a mix of three, all passing through the centre of gravity.</p><ul><li><b>Roll</b> about the nose-to-tail axis: one wing up, the other down.</li><li><b>Pitch</b> about the wingtip-to-wingtip axis: nose up or down.</li><li><b>Yaw</b> about the vertical axis: nose left or right.</li></ul>" },
  { title: "Ailerons", tag: "Roll", demo: "ail", hl: ["aileron", "spoiler"],
    body: "<p>The ailerons near each wingtip move in opposite directions. The one that goes down adds lift to its wing; the one that goes up removes it. The aircraft rolls toward the raised aileron.</p><p>Airliners also raise some spoilers on the down-going wing to help. Roll is a rate: hold the stick over and the aircraft keeps rolling until you centre it.</p>" },
  { title: "Elevators", tag: "Pitch", demo: "elev", hl: ["elevator"],
    body: "<p>The elevators on the back of the horizontal tail move together. Pull the stick back and they rise, pushing the tail down and the nose up. That raises the angle of attack, so the wing makes more lift and the aircraft climbs or turns tighter.</p><p>The tail is about 17 m behind the centre of gravity, so a modest force there pitches the whole aircraft.</p>" },
  { title: "Rudder", tag: "Yaw", demo: "rud", hl: ["rudder"],
    body: "<p>The rudder on the fin swings left or right to yaw the nose. Despite its name it is not the main way to turn; on an airliner it is mostly used to counter adverse yaw at low speed, to align with the runway in a crosswind, and above all to keep the aircraft straight if an engine fails on take-off.</p><p>Watch the aircraft roll slightly as it yaws: a swept wing that moves forward makes more lift than the one moving back.</p>" },
  { title: "How a turn works", tag: "Bank to turn", demo: "turn", hl: ["aileron"], turn: true,
    body: "<p>An aircraft turns by banking. Tilting the wing tilts its lift: part still holds the aircraft up, and the sideways part pulls it around the turn, exactly like a car on a banked track.</p><p>Because only part of the lift now opposes gravity, the wing must make more lift in total. In a 30° bank that is 1.15 times the weight (1.15 g); at 60° it is 2 g. The pilot adds back pressure on the stick to supply it.</p>",
    hint: "Airliners normally limit bank to 25–30° for passenger comfort." },
  { title: "Flaps and slats", tag: "High lift", demo: "flaps", hl: ["flap", "slat"],
    body: "<p>For take-off and landing the wing needs more lift at low speed. Slats slide forward and down from the leading edge; flaps run back and down from the trailing edge. Together they add camber and area, raising the maximum lift coefficient from about 1.5 to about 2.8.</p><p>That lets a 64-tonne jet approach at around 135 kt instead of more than 170 kt. The settings run from 1 to Full, chosen by the pilots for each phase.</p>" },
  { title: "Spoilers and speedbrakes", tag: "Dump lift", demo: "spoil", hl: ["spoiler"],
    body: "<p>Spoilers are panels on top of the wing that rise into the airflow. In flight they act as speedbrakes, adding drag to descend steeply without speeding up. Asymmetric deflection helps the ailerons roll the aircraft.</p><p>On touchdown all of them deploy at once as ground spoilers, killing lift so the weight goes onto the wheels and the brakes can work.</p>" },
  { title: "Trim", tag: "Hands off", demo: "trim", hl: ["hstab"],
    body: "<p>Holding the elevator against a constant force would be exhausting. Airliners instead tilt the entire horizontal stabiliser a few degrees with a screw jack until the aircraft flies level with the elevator centred. As fuel burns and the centre of gravity moves, the trim is adjusted again.</p><p>Small aircraft do the same job with trim tabs, little hinged strips on the elevator.</p>" },
  { title: "Stability", tag: "Self-correcting", demo: "stable", hl: ["hstab", "elevator", "fin"], side: true,
    body: "<p>A stable aircraft returns to its trimmed attitude by itself after a gust. The centre of gravity sits ahead of the point where the wing's lift acts, so the aircraft naturally wants to pitch nose-down; the tail pushes down slightly to balance it, like the feathers on an arrow.</p><p>If a gust pitches the nose up, the tail's angle of attack changes too and its force pushes the nose back. The fin does the same in yaw, and the wings' upward angle (dihedral) in roll.</p>",
    hint: "Loading the aircraft with the centre of gravity too far aft erodes this margin, which is why load sheets matter." },
  { title: "Fly it yourself", tag: "Your controls", demo: null, hl: ["aileron", "elevator", "rudder", "spoiler", "flap", "slat"], free: true,
    body: "<p>The demonstrations are off. Use the stick pad to roll and pitch (drag down to pull back), the rudder slider to yaw, and try the flap and speedbrake controls.</p><p>Roll into a bank and let go: the aircraft keeps turning, its heading winding round. Press Level off to let the autopilot recover.</p>" }
];

const S = { step: 0, in: { ail: 0, elev: 0, rud: 0 }, conf: 0, spoil: 0, stab: 0, flapNow: 0, slatNow: 0, spoilNow: 0, stabNow: 0,
  phi: 0, theta: .03, psi: 0, p: 0, q: 0, r: 0, t: 0, manual: false, level: false, axes: false, pos: [0, 0], cam: { az: Math.PI + .6, el: .3, dist: 82 } };
let ui, stage, cv, pad, padDot, W = 0, H = 0, faces = null;

function demoInputs(d, t) {
  const z = { ail: 0, elev: 0, rud: 0 };
  switch (d) {
    case "cruise": return { ail: .25 * Math.sin(t * .5), elev: .15 * Math.sin(t * .37), rud: 0 };
    case "axes": return { ail: .3 * Math.sin(t * .6), elev: .25 * Math.sin(t * .45 + 1), rud: .3 * Math.sin(t * .4 + 2) };
    case "ail": return { ...z, ail: Math.sin(t * .9) };
    case "elev": return { ...z, elev: .8 * Math.sin(t * .8) };
    case "rud": return { ...z, rud: Math.sin(t * .7) };
    case "turn": { const tgt = 30 * D; return { ail: clamp(2.5 * (tgt - S.phi) - 1.5 * S.p, -1, 1), elev: clamp(.35 + 2 * (.05 - S.theta), -1, 1), rud: 0 }; }
    case "stable": { const kick = (t % 7) < .6 ? 1 : 0; return { ...z, elev: kick }; }
    default: return { ail: clamp(-2 * S.phi - S.p, -1, 1), elev: clamp(-2 * (S.theta - .03) - S.q, -1, 1), rud: 0 };
  }
}
function demoConfig(d, t) {
  if (d === "flaps") { const k = Math.floor(t / 2.6) % 6; S.conf = [0, 1, 2, 3, 4, 4][k]; }
  else if (!S.manual) S.conf = 0;
  if (d === "spoil") S.spoil = (t % 6) < 3.5 ? 1 : 0; else if (!S.manual) S.spoil = 0;
  S.stab = d === "trim" ? 4 * Math.sin(t * .7) : 0;
}

function step(dt) {
  const st = STEPS[S.step];
  let inp = S.in;
  if (!S.manual && st.demo) { inp = demoInputs(st.demo, S.t); demoConfig(st.demo, S.t); }
  if (S.level) {
    inp = { ail: clamp(-2 * S.phi - 1.2 * S.p, -1, 1), elev: clamp(-2 * (S.theta - .03) - S.q, -1, 1), rud: 0 };
    if (Math.abs(S.phi) < .01 && Math.abs(S.theta - .03) < .01) S.level = false;
  }
  S.cur = inp;
  // simple damped rate model: surfaces command rotation rates; pitch is statically stable
  S.p += (.9 * inp.ail - 2.5 * S.p + .25 * S.r) * dt;
  S.q += (.5 * inp.elev - 2.5 * S.q - 1.2 * (S.theta - .03)) * dt;
  S.r += (.4 * inp.rud - 2 * S.r - .12 * inp.ail) * dt;
  S.phi = clamp(S.phi + S.p * dt, -60 * D, 60 * D);
  S.theta = clamp(S.theta + S.q * dt, -20 * D, 25 * D);
  S.psi += (S.r + .25 * Math.tan(S.phi)) * dt;
  // ground track for the grid
  const v = 30;
  S.pos[0] += Math.cos(S.psi) * v * dt; S.pos[1] += Math.sin(S.psi) * v * dt;
  const ease = (a, b, k) => a + (b - a) * Math.min(1, dt * k);
  S.flapNow = ease(S.flapNow, CONF[S.conf].flap, 1.5); S.slatNow = ease(S.slatNow, CONF[S.conf].slat, 1.8);
  S.spoilNow = ease(S.spoilNow, S.spoil * MAX.spoil, 4); S.stabNow = ease(S.stabNow, S.stab, 3);
}

function draw() {
  const ctx = cv.begin(), T = App.tokens, st = STEPS[S.step];
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const side = !!st.side;
  const camCfg = side ? { az: Math.PI / 2 + .12, el: .06, dist: 62, zoom: 1.05 } : { az: S.psi + S.cam.az, el: S.cam.el, dist: S.cam.dist, zoom: .95 };
  const cam = R3.cam(camCfg, W, H);
  // ground grid: gives a sense of heading and motion
  if (!side) {
    const g = [], z = -34, step = 24, n = 9, ox = S.pos[0] % step, oy = S.pos[1] % step;
    for (let i = -n; i <= n; i++) {
      g.push({ a: [i * step - ox, -n * step - oy, z], b: [i * step - ox, n * step - oy, z] });
      g.push({ a: [-n * step - ox, i * step - oy, z], b: [n * step - ox, i * step - oy, z] });
    }
    R3.lines(ctx, cam, g, () => [T["stage-rule"], 1]);
  } else {
    ctx.strokeStyle = T["stage-rule"]; ctx.setLineDash([6, 6]); ctx.beginPath(); const y = R3.proj(cam, [0, 0, 0])[1]; ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]);
  }
  const c = S.cur || S.in;
  faces = App.geo.build({ ail: c.ail * MAX.ail, elev: c.elev * MAX.elev, rud: c.rud * MAX.rud, flap: S.flapNow, slat: S.slatNow, spoil: S.spoilNow, stab: S.stabNow, winglet: true });
  const xf = R3.att({ phi: S.phi, theta: S.theta, psi: S.psi });
  const base = App.hex(T["airframe"]), hi = App.hex(T["hi"]), dim = App.hex(T["metal"]);
  const hl = new Set(st.hl);
  R3.faces(ctx, cam, faces, f => hl.size ? (hl.has(f.part) ? hi : f.part === "fan" ? [30, 36, 40] : base) : (f.part === "fan" ? [30, 36, 40] : base), xf);
  // overlays
  if (st.axes || S.axes) {
    const ax = [[[-24, 0, 0], [26, 0, 0], "#ff8a65", "ROLL"], [[0, -21, 0], [0, 21, 0], T["lp"], "PITCH"], [[0, 0, -10], [0, 0, 12], "#82b1ff", "YAW"]];
    for (const [a, b, col, lab] of ax) R3.arrow(ctx, cam, xf(a), xf(b), col, lab, 2);
  }
  if (st.turn) {
    const up = xf([0, 0, 1]), L = 12 / Math.cos(S.phi);
    const o = [0, 0, 3];
    const tip = [o[0] + up[0] * L, o[1] + up[1] * L, o[2] + up[2] * L];
    R3.arrow(ctx, cam, o, tip, T["hi"], `LIFT ${(1 / Math.cos(S.phi)).toFixed(2)} g`, 3);
    R3.arrow(ctx, cam, o, [o[0], o[1], o[2] + 12], T["lp"], "", 2);
    R3.arrow(ctx, cam, [o[0], o[1], o[2] + 12], tip, "#ff8a65", "", 2);
    App.label(ctx, "green: part holding the weight · orange: part turning the aircraft", W - 12, 20, T["stage-muted"], "right", 11);
  }
  if (side) {
    const cg = [1.2, 0, 0], cl = [-1.4, 0, 0];
    const P = p => R3.proj(cam, xf(p));
    R3.arrow(ctx, cam, xf([cl[0], 0, 2]), xf([cl[0], 0, 15]), T["lp"], "WING LIFT", 3);
    R3.arrow(ctx, cam, xf([cg[0], 0, -2]), xf([cg[0], 0, -13]), "#ff8a65", "WEIGHT", 3);
    R3.arrow(ctx, cam, xf([-16.5, 0, 4]), xf([-16.5, 0, -2.5]), T["hi"], "TAIL DOWNFORCE", 2.5);
    const [gx, gy] = P(cg);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, 7); ctx.fill();
    ctx.fillStyle = T["stage-bg"]; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.arc(gx, gy, 6, 0, Math.PI / 2); ctx.lineTo(gx, gy); ctx.arc(gx, gy, 6, Math.PI, Math.PI * 1.5); ctx.fill();
    App.label(ctx, "CG", gx + 10, gy - 8, "#fff", "left", 11);
  }
  // control position mini-indicator
  App.label(ctx, `Flaps ${CONF[S.conf].n}${S.spoil ? " · Speedbrake" : ""}${Math.abs(S.stabNow) > .3 ? ` · Stab trim ${S.stabNow > 0 ? "+" : ""}${S.stabNow.toFixed(1)}°` : ""}`, 12, H - 12, T["stage-muted"], "left", 11);
  if (!pad.dragging) { padDot.style.left = `${50 + c.ail * 38}%`; padDot.style.top = `${50 + c.elev * 38}%`; }
}

function readouts() {
  const bank = S.phi / D, pitch = S.theta / D, hdg = ((S.psi / D) % 360 + 360) % 360;
  stage.setReadouts([
    ["Bank", `${Math.abs(bank).toFixed(0)}°<small>${bank > .5 ? "right" : bank < -.5 ? "left" : "level"}</small>`],
    ["Pitch", `${pitch >= 0 ? "+" : ""}${pitch.toFixed(1)}°<small>${(1 / Math.cos(S.phi)).toFixed(2)} g</small>`],
    ["Heading", `${String(Math.round(hdg) % 360).padStart(3, "0")}°`]
  ]);
}

function onStep(i, st) {
  S.step = i; S.manual = false; S.t = 0; S.level = !st.demo && !st.free ? false : S.level;
  if (st.side) { S.phi = 0; S.p = 0; S.r = 0; }
  if (st.demo === "turn") { S.theta = .03; }
  if (st.demo !== "flaps" && st.demo !== null) S.conf = 0;
  stage.cond.textContent = st.side ? "Side view: forces about the centre of gravity" : "Chase view. Drag the stick pad to take control";
  syncConfUi();
}
function syncConfUi() {
  stage.root.querySelectorAll("#ctFlaps button").forEach((b, k) => b.setAttribute("aria-pressed", String(k === S.conf)));
  stage.root.querySelector("#ctSpd").setAttribute("aria-pressed", String(!!S.spoil));
}
function takeOver() { if (!S.manual) { S.manual = true; } }

App.register({
  id: "controls", nav: "Controls",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, {
      title: "Flight controls", aspect: "16 / 9",
      controls: `<div class="ctl-row">
        <div class="pad" id="ctPad" role="slider" aria-label="Control stick: drag left or right to roll, down to pitch up" tabindex="0"><i></i></div>
        <div class="ctl-grid">
          <label class="rng" for="ctRud">Rudder <input type="range" id="ctRud" min="-1" max="1" step="0.05" value="0"></label>
          <span class="ctl-row">Flaps <span class="seg" id="ctFlaps" role="group" aria-label="Flap setting">${CONF.map((c, k) => `<button type="button" aria-pressed="${k === 0}">${c.n}</button>`).join("")}</span></span>
          <span class="ctl-row"><button class="ctrl-btn" type="button" id="ctSpd" aria-pressed="false">Speedbrake</button><button class="ctrl-btn" type="button" id="ctLevel">Level off</button><button class="ctrl-btn" type="button" id="ctAxes" aria-pressed="false">Axes</button></span>
        </div></div>`
    });
    cv = stage.cv;
    const q = s => stage.root.querySelector(s);
    pad = q("#ctPad"); padDot = pad.querySelector("i");
    const setPad = e => {
      const r = pad.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      S.in.ail = x; S.in.elev = y; takeOver(); S.level = false;
      padDot.style.left = `${50 + x * 38}%`; padDot.style.top = `${50 + y * 38}%`;
    };
    pad.addEventListener("pointerdown", e => { pad.dragging = true; pad.setPointerCapture(e.pointerId); setPad(e); });
    pad.addEventListener("pointermove", e => { if (pad.dragging) setPad(e); });
    const release = () => { pad.dragging = false; S.in.ail = 0; S.in.elev = 0; };
    pad.addEventListener("pointerup", release); pad.addEventListener("pointercancel", release);
    pad.addEventListener("keydown", e => {
      const k = { ArrowLeft: ["ail", -.5], ArrowRight: ["ail", .5], ArrowUp: ["elev", -.5], ArrowDown: ["elev", .5] }[e.key];
      if (!k) return; e.preventDefault(); takeOver(); S.level = false; S.in[k[0]] = clamp(S.in[k[0]] + k[1], -1, 1);
      clearTimeout(pad._t); pad._t = setTimeout(() => { S.in.ail = 0; S.in.elev = 0; }, 400);
    });
    const rud = q("#ctRud");
    rud.addEventListener("input", () => { S.in.rud = +rud.value; takeOver(); });
    const recentre = () => { rud.value = 0; S.in.rud = 0; };
    rud.addEventListener("pointerup", recentre); rud.addEventListener("change", recentre);
    q("#ctFlaps").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; takeOver(); S.conf = [...b.parentNode.children].indexOf(b); syncConfUi(); });
    q("#ctSpd").addEventListener("click", () => { takeOver(); S.spoil = S.spoil ? 0 : 1; syncConfUi(); });
    q("#ctLevel").addEventListener("click", () => { takeOver(); S.level = true; });
    q("#ctAxes").addEventListener("click", () => { S.axes = !S.axes; q("#ctAxes").setAttribute("aria-pressed", String(S.axes)); });
    App.orbit(cv.el, S.cam);
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    ui.extras.innerHTML = `<span class="label">Reference</span><h2>Control surfaces at a glance</h2>
      <div class="scroll-x"><table><thead><tr><th>Surface</th><th>Where</th><th>Moves the aircraft</th><th class="num">Typical travel</th><th>Notes</th></tr></thead><tbody>
      <tr><td>Ailerons</td><td>Outer trailing edge of each wing</td><td>Roll</td><td class="num">±20°</td><td>Move in opposite directions. Some jets add inboard high-speed ailerons.</td></tr>
      <tr><td>Elevators</td><td>Trailing edge of the horizontal tail</td><td>Pitch</td><td class="num">+30° / −17°</td><td>More travel nose-up than nose-down.</td></tr>
      <tr><td>Rudder</td><td>Trailing edge of the fin</td><td>Yaw</td><td class="num">±25° (less at speed)</td><td>Travel is limited as speed rises to protect the fin.</td></tr>
      <tr><td>Stabiliser trim</td><td>Whole horizontal tail</td><td>Pitch (slowly)</td><td class="num">+4° / −13°</td><td>Driven by a jackscrew; sets hands-off pitch.</td></tr>
      <tr><td>Spoilers</td><td>Upper wing, ahead of flaps</td><td>Roll assist, drag, lift dump</td><td class="num">up to 50°</td><td>Five per wing on a typical single-aisle jet.</td></tr>
      <tr><td>Flaps</td><td>Inner trailing edge</td><td>More lift and drag at low speed</td><td class="num">0–35°</td><td>Fowler type: slide aft before tilting down.</td></tr>
      <tr><td>Slats</td><td>Leading edge</td><td>Delay stall to higher angle</td><td class="num">0–27°</td><td>Open a slot that re-energises the upper-surface flow.</td></tr>
      </tbody></table></div>`;
  },
  activate() { this.resize(); },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame(dt) {
    if (!W) return;
    S.t += dt;
    step(dt);
    draw();
    readouts();
  }
});
})();
