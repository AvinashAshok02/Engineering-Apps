/* Chapter: Drive unit. Motor cross-section with a rotating field, phase currents and an efficiency map. */
(() => {
"use strict";
const { clamp, lerp } = App;

const MOTORS = {
  pmsm: { name: "Permanent-magnet synchronous", short: "PMSM" },
  im: { name: "Induction", short: "Induction" },
  eesm: { name: "Wound-rotor synchronous", short: "EESM" }
};
// A 180 kW, 350 Nm drive unit; numbers are representative.
const TMAX = 350, PMAX = 180e3, NMAX = 16000, NBASE = PMAX / (TMAX * 2 * Math.PI / 60);
const tLimit = n => n <= NBASE ? TMAX : PMAX / (n * 2 * Math.PI / 60);

/* Illustrative loss model in watts: copper ~ T², iron ~ n^1.5, mechanical ~ n²,
   plus type-specific terms and inverter conduction and switching losses. */
function efficiency(type, inv, n, T) {
  const w = n * 2 * Math.PI / 60, P = T * w;
  if (P < 200) return NaN;
  let cu = .085 * T * T, fe = 2.4e-3 * Math.pow(n, 1.5), mech = 1.2e-5 * n * n, extra = 250;
  if (type === "pmsm") extra += 2.2e-5 * Math.pow(Math.max(0, n - NBASE), 2); // field-weakening current
  if (type === "im") { cu *= 1.35; extra += 650 * Math.min(1, .3 + n / NBASE); } // magnetising + rotor copper
  if (type === "eesm") { cu *= 1.1; extra += 350 + 250 * T / TMAX; } // rotor field supply
  const I = T / TMAX; // per-unit phase current
  const invLoss = inv === "sic" ? 250 + 2400 * I * I : 700 + 3600 * I * I + 1500 * I;
  return P / (P + cu + fe + mech + extra + invLoss);
}

const STEPS = [
  { overview: true, kicker: "Chapter 6", title: "Electric drive unit", motor: "pmsm", inv: "sic", n: 3000, tq: .35, view: "motor",
    tagline: "A motor, an inverter and a reduction gear, often in one housing: the electric drive unit (EDU) turns the pack's DC into torque at the wheels, and back again when braking.",
    body: "<p>Drive units are remarkably efficient, often above 90% across most of the range and 95–97% at best, against about 20–35% for a petrol engine in real driving. Where the losses happen, and how the design choices move them around, is what this chapter is about.</p><p>The panel shows a motor cross-section (left), its torque–speed map (right) and the three phase currents (bottom). Drag the sliders to move the operating point.</p>",
    facts: [["Peak power (this example)", "180 kW"], ["Peak torque", "350 Nm at the motor"], ["Top motor speed", "16,000 rpm"]] },
  { title: "Three phases, one rotating field", tag: "The stator", motor: "pmsm", inv: "sic", n: 1200, tq: .5, view: "motor", field: true,
    body: "<p>The stator has three sets of copper windings (phases A, B and C), spaced 120° apart. Feed them three sine-wave currents, also 120° apart in time, and their magnetic fields add up to one field of constant strength that rotates smoothly (the yellow arrow).</p><p>The field's speed is set by the current's frequency; its strength by the current's amplitude. Every AC traction motor builds on this.</p>" },
  { title: "Permanent-magnet motor", tag: "PMSM", motor: "pmsm", inv: "sic", n: 3000, tq: .5, view: "motor",
    body: "<p>Rare-earth (neodymium-iron-boron) magnets buried in the rotor lock onto the rotating field and turn with it in sync. No current is needed to magnetise the rotor, so efficiency is high, especially at low speed and high torque. Most EVs use one.</p><p>The downsides: magnets cost money and depend on a concentrated supply chain, and at high speed the spinning magnets induce a back-voltage that the inverter has to fight with extra current (field weakening), which costs efficiency.</p>" },
  { title: "Induction motor", tag: "IM", motor: "im", inv: "sic", n: 3000, tq: .5, view: "motor",
    body: "<p>No magnets: the rotor is a cage of copper or aluminium bars. The rotating field induces currents in the bars, and those currents make the rotor's field. That only works if the rotor slips slightly slower than the field, by a few percent.</p><p>It's cheap, rugged and drags almost nothing when unpowered, so dual-motor cars often put one on the axle that idles at cruise. But magnetising the rotor and the rotor bar currents cost efficiency, most noticeably at light load.</p>" },
  { title: "Wound-rotor synchronous motor", tag: "EESM", motor: "eesm", inv: "sic", n: 3000, tq: .5, view: "motor",
    body: "<p>Replace the magnets with copper windings on the rotor, fed with DC (through slip rings or a contactless exciter). It runs in sync like a PMSM, with no rare earths, and the rotor field can simply be turned down at high speed, so field weakening is cheap.</p><p>The cost is the power to excite the rotor and a more complex rotor. Several carmakers have moved to it to avoid rare-earth magnets.</p>" },
  { title: "The inverter", tag: "DC → AC", motor: "pmsm", inv: "sic", n: 3000, tq: .5, view: "motor", pwm: true,
    body: "<p>Six power switches, two per phase, connect each motor terminal to either the pack's plus or minus rail, switching tens of thousands of times a second. By varying how long each switch stays on (pulse-width modulation, PWM), the inverter makes the average voltage on each phase trace a sine wave, and the winding inductance smooths the current.</p><p>Field-oriented control measures rotor angle and phase currents and sets the current in two parts: one in line with the rotor field (to weaken it) and one at 90° (to make torque). The same hardware runs in reverse for regenerative braking.</p>",
    hint: "The bottom strip now shows phase A's switched voltage and the smooth current it produces." },
  { title: "Silicon or silicon carbide", tag: "Power devices", motor: "pmsm", inv: "si", n: 2500, tq: .15, view: "map",
    body: "<p>Silicon IGBTs were the standard. Silicon-carbide (SiC) MOSFETs switch faster with lower losses, particularly at partial load, where cars spend most of their time, and they handle 800 V packs well. The gain is a few percent of drive efficiency in typical driving, worth roughly 5% more range for the same battery.</p><p>Toggle Si and SiC on the panel and watch the light-load corner of the map.</p>" },
  { title: "Torque–speed envelope", tag: "Limits", motor: "pmsm", inv: "sic", n: 9000, tq: .9, view: "map",
    body: "<p>Up to base speed (about ${Math.round(NBASE / 100) * 100} rpm here), torque is limited by current, so the limit is flat. Above it, the back-voltage reaches what the pack can supply, and the motor runs at roughly constant power, so torque falls as 1/speed.</p><p>Peak figures are for a few seconds; continuous power is often half of peak, limited by how fast heat leaves the windings and magnets.</p>" },
  { title: "Where you actually drive", tag: "Efficiency map", motor: "pmsm", inv: "sic", n: 4500, tq: .12, view: "map", cycle: true,
    body: "<p>The colour map is efficiency. The dots are typical operating points from a mixed driving cycle. Most sit at low torque, well below the motor's best region. That's why carmakers chase light-load efficiency, with SiC, lower-loss steels and even disconnecting a second motor, rather than peak efficiency.</p><p>Compare the three motor types: the induction motor's weakness at light load shows clearly.</p>" },
  { title: "Gearing and integration", tag: "The EDU", motor: "pmsm", inv: "sic", n: 6000, tq: .4, view: "map",
    body: "<p>Motors make their power at high speed, so a single fixed reduction (typically 8:1 to 11:1, two gear stages) plus the differential brings it down to wheel speed. 16,000 rpm through 9:1 gives about 1,780 rpm at the wheel, roughly 220 km/h on a typical tyre.</p><p>Modern drive units integrate motor, inverter and gearbox in one housing (\"3-in-1\"), often sharing an oil circuit that sprays the windings directly. Because there's no engine noise to hide it, gear whine and the inverter's switching tones are a real noise and vibration challenge (NVH).</p>" }
];

const CYCLE_PTS = (() => { // a cloud of representative operating points (rpm, Nm)
  const out = []; let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) { const n = 600 + rnd() * 9000 * rnd(); out.push([n, Math.min(tLimit(n), 15 + 90 * rnd() * rnd())]); }
  return out;
})();

const S = { step: 0, motor: "pmsm", inv: "sic", n: 3000, tq: .35, th: 0, tr: 0, t: 0, map: null, mapKey: "" };
let ui, stage, cv, W = 0, H = 0, inN, inT, setMotor, setInv;

function sync() {
  inN.value = S.n; inN.nextElementSibling.textContent = App.fmt(S.n);
  inT.value = Math.round(S.tq * 100); inT.nextElementSibling.textContent = Math.round(S.tq * 100) + "%";
  setMotor(S.motor); setInv(S.inv);
}
function onStep(i, st) {
  S.step = i; Object.assign(S, { motor: st.motor, inv: st.inv, n: st.n, tq: st.tq }); sync();
  stage.cond.textContent = st.overview ? "Motor, map and phase currents" : st.title;
}

function drawMotor(ctx, T, cx, cy, R, st) {
  const slots = 24, ph = [T.c4, T.c1, T.c3];
  // stator
  ctx.fillStyle = T.metal; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.moveTo(cx + R * .64, cy); ctx.arc(cx, cy, R * .64, 0, Math.PI * 2, true); ctx.fill("evenodd");
  for (let k = 0; k < slots; k++) {
    const a = k / slots * Math.PI * 2, p = Math.floor(k / 2) % 3;
    const cur = Math.cos(S.th - p * 2 * Math.PI / 3) * (Math.floor(k / 6) % 2 ? -1 : 1);
    ctx.save(); ctx.translate(cx + Math.cos(a) * R * .74, cy + Math.sin(a) * R * .74); ctx.rotate(a);
    ctx.fillStyle = ph[p]; ctx.globalAlpha = .25 + .75 * Math.abs(cur);
    ctx.fillRect(-R * .08, -R * .045, R * .16, R * .09); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // rotor
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.tr);
  ctx.fillStyle = T["metal-hi"]; ctx.beginPath(); ctx.arc(0, 0, R * .6, 0, 7); ctx.fill();
  if (S.motor === "pmsm") {
    for (let k = 0; k < 8; k++) {
      ctx.save(); ctx.rotate(k * Math.PI / 4);
      ctx.fillStyle = k % 2 ? T.c3 : T.c4; ctx.fillRect(R * .38, -R * .12, R * .12, R * .24); ctx.restore();
    }
  } else if (S.motor === "im") {
    for (let k = 0; k < 28; k++) {
      const a = k / 28 * Math.PI * 2, glow = .3 + .7 * Math.abs(Math.cos(a * 2 - (S.th / 2 - S.tr) * 2));
      ctx.fillStyle = `rgba(217,169,90,${glow})`; ctx.beginPath(); ctx.arc(Math.cos(a) * R * .52, Math.sin(a) * R * .52, R * .035, 0, 7); ctx.fill();
    }
  } else {
    for (let k = 0; k < 8; k++) {
      ctx.save(); ctx.rotate(k * Math.PI / 4);
      ctx.fillStyle = T.metal; ctx.fillRect(R * .2, -R * .1, R * .38, R * .2);
      ctx.fillStyle = T.c2; ctx.fillRect(R * .26, -R * .14, R * .22, R * .04); ctx.fillRect(R * .26, R * .1, R * .22, R * .04); ctx.restore();
    }
  }
  ctx.fillStyle = T["stage-bg"]; ctx.beginPath(); ctx.arc(0, 0, R * .1, 0, 7); ctx.fill();
  ctx.restore();
  // rotating field arrow (4-pole machine: field turns at electrical angle / 2)
  if (st.field || st.overview) {
    const a = S.th / 2;
    ctx.strokeStyle = T.hi; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * R * .5, cy - Math.sin(a) * R * .5); ctx.lineTo(cx + Math.cos(a) * R * .5, cy + Math.sin(a) * R * .5); ctx.stroke();
    ctx.fillStyle = T.hi; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * .5, cy + Math.sin(a) * R * .5, 5, 0, 7); ctx.fill();
  }
  if (W >= 560) App.text(ctx, MOTORS[S.motor].name, cx, cy + R + 14, T["stage-muted"], "center");
}

function buildMap(ax) {
  const key = S.motor + S.inv + Math.round(ax.w) + "x" + Math.round(ax.h);
  if (S.mapKey === key) return S.map;
  const nx = 48, ny = 30, cells = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const n = (i + .5) / nx * NMAX, T = (j + .5) / ny * TMAX;
    if (T > tLimit(n)) continue;
    cells.push([i, j, efficiency(S.motor, S.inv, n, T)]);
  }
  S.map = { nx, ny, cells }; S.mapKey = key;
  return S.map;
}
const effCol = e => {
  if (!isFinite(e)) return "rgba(0,0,0,0)";
  const u = clamp((e - .8) / .17, 0, 1);
  return `rgb(${Math.round(lerp(40, 255, u > .7 ? (u - .7) / .3 : 0) * .9 + 30)},${Math.round(lerp(60, 207, u))},${Math.round(lerp(110, 90, u))})`;
};

function frame(dt) {
  if (!W) return;
  const T = App.tokens, ctx = cv.begin(), st = STEPS[S.step];
  // animation runs at a slowed, visible rate tied to speed
  const vis = App.reduceMotion ? .2 : .6 + S.n / 4000;
  S.th += dt * vis * 4; // electrical angle
  const slip = S.motor === "im" ? .06 : 0;
  S.tr = S.th / 2 * (1 - slip);
  S.t += dt;
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const narrowMap = st.view === "map";
  const R = Math.min(W * (narrowMap ? .17 : .2), H * .28);
  drawMotor(ctx, T, 16 + R, 20 + R, R, st);
  // map
  const mx = 16 + 2 * R + 64, my = 28, mw = W - mx - 18, mh = H * .62 - 20;
  const ax = App.axes(ctx, { x: mx, y: my, w: mw, h: mh, x0: 0, x1: NMAX, y0: 0, y1: TMAX + 20, xt: [0, 4000, 8000, 12000, 16000], yt: [0, 100, 200, 300], fx: v => v / 1000 + "k", yl: "Torque (Nm)", xl: "Motor rpm" });
  const map = buildMap(ax), cw = mw / map.nx, ch = (ax.Y(0) - ax.Y(TMAX)) / map.ny;
  for (const [i, j, e] of map.cells) { ctx.fillStyle = effCol(e); ctx.fillRect(mx + i * cw, ax.Y(0) - (j + 1) * ch, cw + .5, ch + .5); }
  App.line(ctx, Array.from({ length: 81 }, (_, k) => { const n = k / 80 * NMAX; return [ax.X(n), ax.Y(tLimit(n))]; }), T["stage-fg"], 2);
  if (st.cycle) { ctx.fillStyle = "rgba(255,255,255,0.75)"; CYCLE_PTS.forEach(([n, q]) => { ctx.beginPath(); ctx.arc(ax.X(n), ax.Y(q), 2.2, 0, 7); ctx.fill(); }); }
  const tq = Math.min(S.tq * TMAX, tLimit(S.n)), eff = efficiency(S.motor, S.inv, S.n, tq);
  ctx.fillStyle = T.hi; ctx.beginPath(); ctx.arc(ax.X(S.n), ax.Y(tq), 6, 0, 7); ctx.fill();
  ctx.strokeStyle = T["stage-bg"]; ctx.lineWidth = 2; ctx.stroke();
  // efficiency key
  for (let k = 0; k <= 20; k++) { ctx.fillStyle = effCol(.8 + k / 20 * .17); ctx.fillRect(mx + mw - 120 + k * 5, my - 18, 5, 8); }
  App.text(ctx, "80%", mx + mw - 124, my - 14, T["stage-muted"], "right"); App.text(ctx, "97%", mx + mw - 12, my - 14, T["stage-muted"], "left");
  // phase currents strip
  const sy = H * .62 + 40, sh = H - sy - 14, sx = 20, sw = W - 40;
  ctx.strokeStyle = T["stage-rule"]; ctx.beginPath(); ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + sw, sy + sh / 2); ctx.stroke();
  App.text(ctx, st.pwm ? "Phase A: switched voltage (grey) and current" : "Phase currents A, B, C", sx, sy - 8, T["stage-muted"]);
  const amp = sh / 2 * .85 * Math.max(.15, S.tq), cyc = 2;
  if (st.pwm) {
    // sine-triangle PWM for phase A at a visible carrier frequency
    ctx.fillStyle = "rgba(127,147,158,0.35)";
    const nCar = 36;
    for (let k = 0; k < nCar; k++) {
      const x0 = sx + k / nCar * sw, ph = S.th + (k + .5) / nCar * cyc * 2 * Math.PI;
      const duty = .5 + .45 * Math.sin(ph) * Math.max(.3, S.tq);
      const wpx = sw / nCar;
      ctx.fillRect(x0 + wpx * (1 - duty) / 2, sy, wpx * duty, sh / 2);
      ctx.fillRect(x0, sy + sh / 2, wpx * (1 - duty) / 2, sh / 2); ctx.fillRect(x0 + wpx * (1 + duty) / 2, sy + sh / 2, wpx * (1 - duty) / 2, sh / 2);
    }
  }
  [T.c4, T.c1, T.c3].forEach((c, p) => {
    if (st.pwm && p) return;
    App.line(ctx, Array.from({ length: 121 }, (_, k) => [sx + k / 120 * sw, sy + sh / 2 - amp * Math.sin(S.th + k / 120 * cyc * 2 * Math.PI - p * 2 * Math.PI / 3)]), c, 2);
  });
  const P = tq * S.n * 2 * Math.PI / 60;
  stage.setReadouts([
    ["Operating point", `${App.fmt(tq)}<small>Nm @ ${App.fmt(S.n)} rpm</small>`],
    ["Shaft power", `${(P / 1000).toFixed(0)}<small>kW</small>`],
    ["Drive efficiency", isFinite(eff) ? `${(eff * 100).toFixed(1)}<small>% motor + ${S.inv === "sic" ? "SiC" : "Si"}</small>` : "–"]
  ]);
}

function buildExtras(host) {
  host.innerHTML = `<span class="label">Reference</span><h2>Motor types compared</h2>
    <div class="scroll-x"><table><thead><tr><th>Type</th><th>Rotor field from</th><th>Peak efficiency</th><th>Light-load efficiency</th><th>Rare earths</th><th>Notes</th></tr></thead><tbody>
    <tr><td>PMSM (interior magnet)</td><td>NdFeB magnets</td><td>96–97%</td><td>High</td><td>Yes</td><td>Most common; best power density; field weakening costs at high speed</td></tr>
    <tr><td>Induction</td><td>Induced rotor currents</td><td>94–95%</td><td>Lower</td><td>No</td><td>Cheap and rugged; no drag when unpowered; rotor heat hard to remove</td></tr>
    <tr><td>EESM (wound rotor)</td><td>DC rotor winding</td><td>95–96%</td><td>Medium–high</td><td>No</td><td>Adjustable field, good at high speed; excitation losses; brushes or contactless exciter</td></tr>
    <tr><td>Axial flux</td><td>Magnets (disc rotor)</td><td>96–97%</td><td>High</td><td>Yes</td><td>Very short and torque-dense; performance and in-wheel uses</td></tr>
    </tbody></table></div>
    <h3>How the efficiency map is drawn</h3>
    <p class="lede">An <span class="tag-model illus">illustrative model</span> with copper loss ∝ torque², iron loss ∝ speed<sup>1.5</sup>, windage and bearing loss ∝ speed², a field-weakening penalty for the PMSM above base speed, magnetising and rotor losses for the induction motor, excitation loss for the EESM, and inverter conduction and switching losses that are lower for SiC. Coefficients are chosen to give realistic shapes and peaks, not taken from a specific unit.</p>`;
}

App.register({
  id: "drive", nav: "Drive unit",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Drive unit", aspect: "16 / 11",
      controls: App.seg("motSeg", Object.entries(MOTORS).map(([k, m]) => [k, m.short]), "pmsm") + App.seg("invSeg", [["si", "Si IGBT"], ["sic", "SiC"]], "sic") +
        App.slider("dr-n", "rpm", 0, NMAX, 100, 3000) + App.slider("dr-t", "Torque", 0, 100, 1, 35) });
    cv = stage.cv;
    setMotor = App.bindSeg(ui.stageHost, "motSeg", v => { S.motor = v; });
    setInv = App.bindSeg(ui.stageHost, "invSeg", v => { S.inv = v; });
    inN = ui.stageHost.querySelector("#dr-n"); inT = ui.stageHost.querySelector("#dr-t");
    inN.addEventListener("input", () => { S.n = +inN.value; inN.nextElementSibling.textContent = App.fmt(S.n); });
    inT.addEventListener("input", () => { S.tq = inT.value / 100; inT.nextElementSibling.textContent = inT.value + "%"; });
    STEPS.forEach(s => { s.body = s.body.replace("${Math.round(NBASE / 100) * 100}", App.fmt(Math.round(NBASE / 100) * 100)); });
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    buildExtras(ui.extras);
  },
  resize() { cv.fit(); W = cv.w; H = cv.h; S.mapKey = ""; },
  frame
});
})();
