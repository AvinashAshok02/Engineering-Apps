/* Chapter: Pack to wheels. Steady-speed energy flow from the pack to the road, and range. */
(() => {
"use strict";
const { clamp } = App;

// A mid-size electric SUV; representative values.
const CAR = { mass: 2000, crr: .009, cda: .62, rho: 1.2, gear: .97, rPack: .09, vPack: 360, aux: 300 };

/* Illustrative model: steady speed on a flat road. */
function flows(p, kmh = p.kmh) {
  const v = kmh / 3.6;
  const roll = CAR.mass * 9.81 * CAR.crr * v, aero = .5 * CAR.rho * CAR.cda * v ** 3;
  const wheel = roll + aero;
  const gearL = wheel * (1 / CAR.gear - 1);
  const shaft = wheel + gearL;
  const etaDrive = .935 - .09 * Math.exp(-shaft / 7000); // motor + inverter, worse at light load
  const driveL = shaft * (1 / etaDrive - 1);
  const dT = p.temp < 18 ? 18 - p.temp : p.temp > 26 ? p.temp - 26 : 0;
  const hvac = p.temp < 18 ? Math.min(6000, 280 * dT) / (p.hp ? 2.6 : 1) : 150 * dT;
  const aux = CAR.aux;
  const out = shaft + driveL + hvac + aux;
  const battL = CAR.rPack * (out / CAR.vPack) ** 2 * (p.temp < 10 ? 1 + (10 - p.temp) * .05 : 1);
  const pack = out + battL;
  const whkm = pack / v / 3.6;
  // cold cells deliver less (chapter 3); assume ~1% per degree below 10 °C, part of it recovered as the pack warms
  const usable = p.kwh * .95 * (p.temp < 10 ? 1 - (10 - p.temp) * .006 : 1);
  return { roll, aero, gearL, driveL, hvac, aux, battL, pack, whkm, range: usable * 1000 / whkm, v };
}

const BASE = { kmh: 100, temp: 20, kwh: 77, hp: true };
const STEPS = [
  { overview: true, kicker: "Chapter 7", title: "Pack to wheels", p: BASE,
    tagline: "Where the energy goes between the pack and the road, and why the range on the sticker isn't the range you get on a cold motorway.",
    body: "<p>The panel follows energy at a steady speed on a flat road for a 2-tonne electric SUV with a 77 kWh pack. The bar shows where each watt drawn from the pack ends up; the curve shows consumption against speed.</p><p>It's an <span class=\"tag-model illus\">illustrative model</span>: standard road-load physics with typical coefficients. The ageing and drive-unit chapters feed into it: a worn pack holds less, and the drive unit's efficiency map sets the loss in the middle.</p>",
    facts: [["Typical consumption", "140–220 Wh/km"], ["Battery to wheel", "~85–90% at cruise"], ["Petrol, tank to wheel", "~20–30%"]] },
  { title: "Rolling and air", tag: "Road load", p: { ...BASE, kmh: 50 },
    body: "<p>At steady speed, the motor only replaces what the road takes away:</p><p class=\"formula\">F = m·g·C<sub>rr</sub> + ½·ρ·C<sub>d</sub>A·v²</p><p>Tyre rolling resistance is roughly constant force, so its power grows with speed. Aerodynamic drag force grows with v², so its power grows with v³. At town speeds the tyres dominate; above about 70–80 km/h the air takes over.</p>" },
  { title: "Speed is the big lever", tag: "Motorway", p: { ...BASE, kmh: 130 },
    body: "<p>At 130 km/h aerodynamic drag is several times the rolling loss, and consumption per km is well above the 50 km/h figure. That's why EVs, which are very efficient in town, lose more of their advantage on the motorway, and why carmakers obsess over drag coefficients (C<sub>d</sub> 0.20–0.28) and frontal area.</p>" },
  { title: "The loss chain", tag: "Efficiency", p: { ...BASE, kmh: 90 },
    body: "<p>From pack to tyre contact patch, each stage takes a small cut: the cells' internal resistance (I²R heating), the inverter's switching and conduction, the motor's copper and iron, the gears and bearings. Each is 1–6%, and together they add up to about 10–15%.</p><p>Auxiliaries (computers, pumps, lights, screens) draw a few hundred watts all the time. That barely matters at speed but matters a lot in a traffic jam.</p>" },
  { title: "Winter", tag: "−5 °C, resistive heater", p: { ...BASE, kmh: 90, temp: -5, hp: false },
    body: "<p>Now it's −5 °C. A combustion car heats the cabin with waste heat for free; an EV has very little waste heat and must spend battery energy. A resistive heater turns 1 kW of battery into 1 kW of heat, and keeping a cabin warm can take several kW.</p><p>The cells are also cold: their resistance rises and they deliver less charge (exactly the effect in the 4 °C NASA cells). Range can fall 25–40%, most of it from heating.</p>" },
  { title: "Heat pumps", tag: "−5 °C, heat pump", p: { ...BASE, kmh: 90, temp: -5, hp: true },
    body: "<p>A heat pump moves heat from outside air (and from the motor, inverter and battery) into the cabin, delivering 2–3 kW of heat per kW of electricity at these temperatures. Same conditions, much less range lost.</p><p>Thermal management in a modern EV is one integrated system: the same refrigerant and coolant loops cool the pack during fast charging, warm it before charging in winter and heat the cabin.</p>" },
  { title: "Regenerative braking", tag: "Getting it back", p: { ...BASE, kmh: 50 },
    body: "<p>When you slow down, the inverter runs the motor as a generator and pushes current back into the pack. In town, 60–70% of the kinetic energy that friction brakes would waste can be recovered, which is why EVs use less energy in city driving than on the motorway, the opposite of combustion cars.</p><p>Regen power is limited by what the cells can accept: little when the pack is full or cold, for exactly the lithium-plating reasons in chapter 2.</p>" },
  { title: "Charging", tag: "Fast charging", p: { ...BASE },
    body: "<p>DC fast charging delivers 50–350 kW straight to the pack, bypassing the car's onboard charger. Power peaks early and tapers as the pack fills, because high SOC and high current together risk lithium plating. That's why \"10–80%\" is the quoted figure: the last 20% can take as long as the first 70%.</p><p>A 77 kWh pack at a 150 kW peak typically goes 10–80% in about 25–30 minutes; 800 V packs with good thermal management can manage under 20. Preconditioning (warming the pack on the way to the charger) makes the biggest difference in winter.</p>",
    ro: [["10–80% (150 kW peak)", "~28<small>min</small>"], ["Energy added", "~54<small>kWh</small>"], ["Average power", "~115<small>kW</small>"]] }
];

const S = { step: 0, p: { ...BASE } };
let ui, stage, cv, W = 0, H = 0, ins = {}, setHp;

const fmtIn = (k, v) => k === "kmh" ? `${v} km/h` : k === "temp" ? `${v} °C` : `${v} kWh`;
function sync() {
  for (const [k, el] of Object.entries(ins)) { el.value = S.p[k]; el.nextElementSibling.textContent = fmtIn(k, S.p[k]); }
  setHp(S.p.hp ? "hp" : "res");
}
function onStep(i, st) { S.step = i; S.p = { ...st.p }; sync(); stage.cond.textContent = st.overview ? "Steady speed, flat road" : st.title; }

function frame() {
  if (!W) return;
  const T = App.tokens, ctx = cv.begin(), st = STEPS[S.step];
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const f = flows(S.p);
  // energy split bar
  const parts = [
    ["Aero", f.aero, T.c3], ["Rolling", f.roll, T.c1], ["Drive unit", f.driveL + f.gearL, T.c5],
    ["Battery heat", f.battL, T.c4], ["Heating / AC", f.hvac, T.c2], ["Auxiliaries", f.aux, T.metal]
  ];
  const bx = 20, by = 40, bw = W - 40, bh = 38;
  App.text(ctx, `Where ${(f.pack / 1000).toFixed(1)} kW from the pack goes`, bx, 20, T["stage-fg"]);
  let x = bx;
  parts.forEach(([n, v, c], i) => {
    const w = v / f.pack * bw;
    ctx.fillStyle = c; ctx.fillRect(x, by, Math.max(0, w - 1), bh);
    const share = Math.round(v / f.pack * 100);
    if (w > 46) { App.text(ctx, `${share}%`, x + 5, by + bh / 2, "#0c1317"); }
    x += w;
  });
  // legend under the bar
  let lx = bx, ly = by + bh + 16;
  ctx.font = App.FONT_MONO;
  parts.forEach(([n, v, c]) => {
    const t = `${n} ${(v / 1000).toFixed(1)} kW`, tw = ctx.measureText(t).width + 30;
    if (lx + tw > bx + bw) { lx = bx; ly += 16; }
    ctx.fillStyle = c; ctx.fillRect(lx, ly - 5, 10, 10); App.text(ctx, t, lx + 14, ly, T["stage-fg"]); lx += tw;
  });
  // consumption against speed
  const y0 = ly + 34;
  const ax = App.axes(ctx, { x: 48, y: y0, w: W - 68, h: H - y0 - 34, x0: 0, x1: 160, y0: 0, y1: 400, xt: [0, 40, 80, 120, 160], yt: [0, 100, 200, 300, 400], yl: "Consumption (Wh/km)", xl: "Speed (km/h)" });
  const curve = (p, col, w, d) => App.line(ctx, Array.from({ length: 31 }, (_, k) => { const s = 10 + k * 5; return [ax.X(s), ax.Y(Math.min(400, flows(p, s).whkm))]; }), col, w, d);
  curve({ ...BASE }, T["stage-rule"], 1.5, [4, 4]);
  curve(S.p, T.c1, 2.5);
  ctx.fillStyle = T.hi; ctx.beginPath(); ctx.arc(ax.X(S.p.kmh), ax.Y(Math.min(400, f.whkm)), 6, 0, 7); ctx.fill();
  App.text(ctx, "20 °C reference", ax.X(150), ax.Y(flows(BASE, 150).whkm) + 14, T["stage-muted"], "right");
  stage.setReadouts(st.ro || [
    ["Consumption", `${Math.round(f.whkm)}<small>Wh/km</small>`],
    ["Range", `${App.fmt(f.range)}<small>km</small>`],
    ["Pack to wheel", `${Math.round((f.roll + f.aero) / f.pack * 100)}<small>%</small>`]
  ]);
}

function buildExtras(host) {
  const rows = [30, 50, 70, 90, 110, 130, 150].map(s => {
    const a = flows({ ...BASE, kmh: s }), b = flows({ ...BASE, kmh: s, temp: -5, hp: false }), c = flows({ ...BASE, kmh: s, temp: -5, hp: true });
    return `<tr><td>${s} km/h</td><td class="num">${Math.round(a.whkm)}</td><td class="num">${App.fmt(a.range)}</td><td class="num">${App.fmt(b.range)}</td><td class="num">${App.fmt(c.range)}</td><td class="num">${Math.round(a.aero / (a.aero + a.roll) * 100)}%</td></tr>`;
  }).join("");
  host.innerHTML = `<span class="label">Reference</span><h2>Range at a glance</h2>
    <p class="lede">From the same illustrative model: 2,000 kg, C<sub>rr</sub> ${CAR.crr}, C<sub>d</sub>A ${CAR.cda} m², ${BASE.kwh} kWh pack (95% usable), steady speed, flat road. Real cars add acceleration, hills, wind and regen.</p>
    <div class="scroll-x"><table><thead><tr><th>Speed</th><th class="num">Wh/km at 20 °C</th><th class="num">Range 20 °C</th><th class="num">Range −5 °C, heater</th><th class="num">Range −5 °C, heat pump</th><th class="num">Aero share</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h3>Worked example: 100 km/h</h3>
    <p class="lede">Rolling: 2,000 × 9.81 × 0.009 ≈ 177 N. Aero: ½ × 1.2 × 0.62 × 27.8² ≈ 287 N. Total 464 N × 27.8 m/s ≈ 12.9 kW at the wheels, or 129 Wh/km. Divide by ~88% drivetrain efficiency and add 0.3 kW of auxiliaries: about 150 Wh/km from the pack, so roughly 490 km from 73 usable kWh.</p>`;
}

App.register({
  id: "road", nav: "To the wheels",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Energy flow and range", aspect: "16 / 12",
      controls: App.slider("rd-kmh", "Speed", 20, 160, 5, 100) + App.slider("rd-temp", "Outside", -15, 40, 1, 20) + App.slider("rd-kwh", "Pack", 40, 110, 1, 77) + App.seg("hpSeg", [["res", "Resistive heater"], ["hp", "Heat pump"]], "hp") });
    cv = stage.cv;
    ins = { kmh: ui.stageHost.querySelector("#rd-kmh"), temp: ui.stageHost.querySelector("#rd-temp"), kwh: ui.stageHost.querySelector("#rd-kwh") };
    for (const [k, el] of Object.entries(ins)) el.addEventListener("input", () => { S.p[k] = +el.value; el.nextElementSibling.textContent = fmtIn(k, el.value); });
    setHp = App.bindSeg(ui.stageHost, "hpSeg", v => { S.p.hp = v === "hp"; });
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    buildExtras(ui.extras);
  },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame
});
})();
