/* Chapter: A flight. Profile of a 90-minute single-aisle trip, phase by phase. */
(() => {
"use strict";
const { clamp, lerp, fmt } = App;

const PH = { takeoff: [0, .07], climb: [.07, .3], cruise: [.3, .64], descent: [.64, .84], approach: [.84, .96], landing: [.96, 1] };
const ease = u => 1 - Math.pow(1 - clamp(u, 0, 1), 1.8);
function alt(s) {
  if (s < .045) return 0;
  if (s < .07) return 1500 * Math.pow((s - .045) / .025, 1.4);
  if (s < .3) return 1500 + 33500 * ease((s - .07) / .23);
  if (s < .47) return 35000;
  if (s < .5) return 35000 + 2000 * (s - .47) / .03;
  if (s < .64) return 37000;
  if (s < .84) return 37000 - 34000 * ((s - .64) / .2);
  if (s < .96) return 3000 - 2950 * ((s - .84) / .12);
  if (s < .975) return 50 * (1 - (s - .96) / .015);
  return 0;
}
function ias(s) {
  if (s < .045) return 145 * Math.pow(s / .045, .7);
  if (s < .07) return lerp(145, 165, (s - .045) / .025);
  if (s < .3) { const a = alt(s); if (a < 10000) return Math.min(250, lerp(165, 250, (s - .07) / .04)); return Math.min(290, lerp(250, 290, (a - 10000) / 4000)) - Math.max(0, (a - 28000) / 7000 * 20); }
  if (s < .64) return s < .5 ? 270 : 265;
  if (s < .84) { const a = alt(s); return a > 10000 ? Math.min(290, lerp(268, 290, (s - .64) / .03)) : lerp(250, 210, 1 - a / 10000); }
  if (s < .96) { const u = (s - .84) / .12; return u < .6 ? lerp(210, 140, u / .6) : 140; }
  if (s < .975) return 135;
  return lerp(130, 20, (s - .975) / .025);
}
function vs(s) {
  if (s < .045) return 0;
  if (s < .07) return 2500;
  if (s < .3) return 3200 * Math.pow(1 - (s - .07) / .23, .7);
  if (s < .64) return s > .47 && s < .5 ? 1000 : 0;
  if (s < .84) return -2200;
  if (s < .96) return -750;
  if (s < .975) return -180;
  return 0;
}
const pitchOf = s => s < .045 ? 0 : s < .3 ? 13 * Math.pow(1 - (s - .045) / .255, .6) + 2 : s < .64 ? 2.5 : s < .84 ? 0 : s < .968 ? 2.5 : s < .975 ? 6 : 0;

const STEPS = [
  { overview: true, kicker: "Chapter 7", title: "A flight", phase: null,
    tagline: "Ninety minutes, gate to gate, on a 180-seat jet: what happens and why.",
    body: "<p>Every chapter so far comes together on a single flight. The profile on the right runs from the take-off roll to the turn off the runway, with altitude drawn to scale against an idealised track. Each step zooms into one phase.</p><p>Watch the airspeed readout in cruise: the number the pilots fly drops as the aircraft climbs, even though it is moving faster than ever. The next steps explain why.</p>",
    facts: [["Cruise", "35,000–37,000 ft at Mach 0.78"], ["Fuel burned", "About 3.5 t on a 90-minute trip"], ["Distance", "About 500 nm (900 km)"]] },
  { title: "Take-off", tag: "V1 · VR · V2", phase: "takeoff",
    body: "<p>The crew set take-off thrust, often less than maximum to save engine wear, with flaps at a low setting. Three calculated speeds structure the roll:</p><ul><li><b>V1</b>, decision speed. Below it they can stop on the runway; above it they must continue, even with an engine failure.</li><li><b>VR</b>, rotation. The pilot raises the nose at about 3° per second toward 15°.</li><li><b>V2</b>, take-off safety speed, which guarantees a safe climb on one engine.</li></ul><p>Gear comes up as soon as the aircraft is positively climbing.</p>" },
  { title: "Climb", tag: "Clean up and climb", phase: "climb",
    body: "<p>At about 1,500 ft the thrust is reduced to climb power; the aircraft accelerates and the flaps come in. Below 10,000 ft speed is limited to 250 kt in most airspace, partly for bird strikes and traffic. Above it the aircraft accelerates to about 290 kt and climbs at that indicated speed until it reaches its cruise Mach number.</p><p>The climb rate tails off as the air thins and the engines make less thrust. Reaching 35,000 ft takes around 20 minutes.</p>" },
  { title: "Cruise", tag: "Mach 0.78", phase: "cruise",
    body: "<p>At 35,000 ft the air is about 30% as dense as at sea level and −54 °C. Thin air means less drag, and the engines are most efficient there. The aircraft flies at Mach 0.78, about 450 kt over the ground in still air.</p><p>The airspeed indicator shows only about 270 kt because it measures the air pressure from motion, which depends on density. Wings care about that same pressure, so it is still the right number to fly. As fuel burns off the aircraft gets lighter and can climb higher to save fuel; this flight steps up to 37,000 ft.</p>" },
  { title: "Descent", tag: "Idle all the way", phase: "descent",
    body: "<p>Ideally the descent is flown with engines at idle, gliding down a planned path. The rule of thumb is to start three nautical miles out for every 1,000 ft to lose, so from 37,000 ft about 110 nm from the airport.</p><p>Speed comes back to 250 kt below 10,000 ft. If air traffic control keeps the aircraft high, the speedbrakes help it catch up with the path.</p>" },
  { title: "Approach", tag: "Configured and stable", phase: "approach",
    body: "<p>Around 3,000 ft and 10 nm out the aircraft intercepts the ILS. Slats and flaps extend in stages as it slows, the gear comes down, and it settles on the 3° glideslope at about 140 kt, descending at roughly 700 ft per minute.</p><p>By 1,000 ft above the runway it must be stable: fully configured, on speed, on path. If not, the crew go around and try again. That is routine, not an emergency.</p>" },
  { title: "Landing", tag: "Flare and stop", phase: "landing",
    body: "<p>At about 30 ft the pilot raises the nose slightly (the flare) to reduce the descent rate, and the main wheels touch down at around 1–2 m/s. The ground spoilers deploy at once, dumping lift so the weight bears on the wheels.</p><p>Autobrakes, reverse thrust and the wheel brakes bring the aircraft to taxi speed, usually within about 1,500 m. Carbon brakes can reach several hundred °C on a hard stop.</p>" }
];
const NAMES = { takeoff: "Take-off", climb: "Climb", cruise: "Cruise", descent: "Descent", approach: "Approach", landing: "Landing" };

const S = { step: 0, t: 0, s: 0 };
let ui, stage, cv, W = 0, H = 0;

function draw() {
  const ctx = cv.begin(), T = App.tokens, st = STEPS[S.step];
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const L = W < 520 ? 40 : 56, R = 14, Tp = 22, B = 40;
  const X = s => L + s * (W - L - R), Y = a => H - B - a / 40000 * (H - Tp - B);
  // phase bands
  Object.entries(PH).forEach(([k, [a, b]], i) => {
    if (st.phase === k) { ctx.fillStyle = T["stage-panel"]; ctx.fillRect(X(a), Tp - 8, X(b) - X(a), H - B - Tp + 8); }
    ctx.strokeStyle = T["stage-rule"]; ctx.beginPath(); ctx.moveTo(X(a) + .5, Tp - 8); ctx.lineTo(X(a) + .5, H - B); ctx.stroke();
    const narrow = (X(b) - X(a)) < 60;
    App.label(ctx, NAMES[k], (X(a) + X(b)) / 2, H - B + (narrow && i % 2 ? 30 : 16), st.phase === k ? T["hi"] : T["stage-muted"], "center", W < 520 ? 9 : 10.5);
  });
  // altitude grid
  for (let a = 0; a <= 40000; a += 10000) { ctx.strokeStyle = T["stage-rule"]; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(L, Y(a)); ctx.lineTo(W - R, Y(a)); ctx.stroke(); ctx.globalAlpha = 1; App.label(ctx, a ? `${a / 1000}k ft` : "0", L - 6, Y(a) + 4, T["stage-muted"], "right", W < 520 ? 9 : 10); }
  // FL100 speed limit line
  ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(255,138,101,.5)"; ctx.beginPath(); ctx.moveTo(L, Y(10000)); ctx.lineTo(W - R, Y(10000)); ctx.stroke(); ctx.setLineDash([]);
  App.label(ctx, "10,000 ft · 250 kt below", W - R - 4, Y(10000) - 5, "rgba(255,138,101,.9)", "right", W < 520 ? 8.5 : 10);
  // path
  ctx.lineWidth = 2.4; ctx.strokeStyle = T["stage-muted"]; ctx.beginPath();
  for (let s = 0; s <= 1.0001; s += .002) { const x = X(s), y = Y(alt(s)); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.strokeStyle = T["hi"]; ctx.beginPath();
  for (let s = 0; s <= S.s; s += .002) { const x = X(s), y = Y(alt(s)); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke(); ctx.lineWidth = 1;
  // annotations
  const fs = W < 520 ? 8.5 : 10;
  const note = (s, text, dy = -10, al = "center") => { ctx.fillStyle = T["stage-fg"]; ctx.beginPath(); ctx.arc(X(s), Y(alt(s)), 2.5, 0, 7); ctx.fill(); App.label(ctx, text, X(s), Y(alt(s)) + dy, T["stage-fg"], al, fs); };
  note(.045, "V1 · VR · V2", -10, "left");
  note(.3, "top of climb", -10, "center");
  note(.485, "step climb", -10, "center");
  note(.64, "top of descent", -10, "center");
  note(.84, "glideslope intercept", -10, "center");
  note(.968, "touchdown", -12, "right");
  // aircraft
  const p = pitchOf(S.s) * Math.PI / 180;
  App.drawPlaneSide(ctx, X(S.s), Y(alt(S.s)) - 6, W < 520 ? 30 : 42, p, "#ffffff");
}

function onStep(i, st) {
  S.step = i;
  stage.cond.textContent = st.phase ? `${NAMES[st.phase]} · altitude to scale, distance compressed` : "Altitude to scale, distance compressed";
}

App.register({
  id: "journey", nav: "A flight",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Flight profile", aspect: "16 / 9" });
    cv = stage.cv;
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    ui.extras.innerHTML = `<span class="label">Reference</span><h2>Pilots' rules of thumb</h2>
      <p class="lede">Mental arithmetic that crews still use to sanity-check the computers.</p>
      <div class="rules">
        <div class="rule-item"><b>3 to 1 descent</b><span>Start down 3 nm for every 1,000 ft to lose. From 36,000 ft: about 108 nm out.</span></div>
        <div class="rule-item"><b>300 ft per mile</b><span>A 3° glideslope drops about 300 ft each nautical mile. At 10 nm the aircraft should be near 3,000 ft above the runway.</span></div>
        <div class="rule-item"><b>Groundspeed × 5</b><span>Descent rate in ft/min on a 3° path. At 140 kt: about 700 ft/min.</span></div>
        <div class="rule-item"><b>1 in 60</b><span>1° off track for 60 nm puts you 1 nm off course. Works for any small angle.</span></div>
        <div class="rule-item"><b>TAS ÷ 10 + 7</b><span>Bank angle for a standard-rate turn (3° per second). At 200 kt true airspeed: about 27°.</span></div>
        <div class="rule-item"><b>Mach and TAS</b><span>At cruise altitude, Mach 0.78 is about 450 kt true airspeed, but only around 270 kt indicated.</span></div>
      </div>`;
  },
  activate() { this.resize(); },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame(dt) {
    if (!W) return;
    S.t += dt;
    const st = STEPS[S.step];
    const [a, b] = st.phase ? PH[st.phase] : [0, 1];
    const dur = st.phase ? 9 : 36;
    const u = (S.t % (dur + 1.5)) / dur;
    S.s = a + (b - a) * Math.min(1, u);
    if (st.phase === "landing") S.s = lerp(.9, 1, Math.min(1, u)); // show the end of the approach too
    draw();
    const v = vs(S.s);
    stage.setReadouts([
      ["Altitude", `${fmt(Math.round(alt(S.s) / 10) * 10)}<small>ft</small>`],
      ["Indicated speed", `${fmt(ias(S.s))}<small>kt</small>`],
      ["Vertical speed", `${v > 0 ? "+" : ""}${fmt(v)}<small>ft/min</small>`]
    ]);
  }
});
})();
