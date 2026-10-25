/* Chapter: Ageing. Degradation mechanisms with an illustrative semi-empirical ageing simulator. */
(() => {
"use strict";
const { clamp } = App;

/* Illustrative model, not fitted to data. Structure follows common
   semi-empirical forms (e.g. Wang et al. 2011; Schmalstieg et al. 2014):
   calendar loss  ~ Arrhenius(T) * f(SOC) * sqrt(t)
   cycle loss     ~ Arrhenius(T) * g(DoD, C) * EFC^0.6
   plating loss   ~ max(0, risk - threshold)^1.5 * EFC, risk rising with charge rate and cold
   knee           extra loss once the total passes ~18%. */
const PACK_KWH = 75, WH_PER_KM = 170;
function simulate(p, years) {
  const T = p.temp + 273.15, Tr = 298.15;
  const dod = clamp(p.km * WH_PER_KM / 1000 / PACK_KWH, .02, p.top / 100 - .05);
  const avgSoc = p.top / 100 - dod / 2;
  const efcYr = 365 * p.km * WH_PER_KM / 1000 / PACK_KWH;
  const aCal = Math.exp(-6000 * (1 / T - 1 / Tr)), aCyc = Math.exp(-3600 * (1 / T - 1 / Tr));
  const fSoc = .6 + .8 * avgSoc;
  const gCyc = Math.sqrt(dod / .5) * (1 + .15 * Math.max(0, p.crate - .5));
  const risk = p.crate * Math.exp(.07 * (25 - p.temp));
  const plPerEfc = 4e-5 * Math.pow(Math.max(0, risk - 1.2), 1.5);
  const out = [];
  for (const t of years) {
    const efc = efcYr * t;
    const cal = .025 * aCal * fSoc * Math.sqrt(t);
    const cyc = .00186 * aCyc * gCyc * Math.pow(efc, .6);
    const pl = plPerEfc * efc;
    const l0 = cal + cyc + pl, knee = 4 * Math.pow(Math.max(0, l0 - .18), 2);
    out.push({ t, cal, cyc, pl, knee, soh: Math.max(0, 1 - l0 - knee) });
  }
  return { pts: out, dod, avgSoc, efcYr, risk };
}

const BASE = { temp: 25, top: 80, km: 40, crate: .3 };
const STEPS = [
  { overview: true, kicker: "Chapter 2", title: "Why cells wear out", p: BASE,
    tagline: "Every cell loses capacity and gains resistance from the day it is made. How fast depends on heat, how full it is kept, how deeply and how often it is cycled, and how fast it is charged.",
    body: "<p>The panel runs a <span class=\"tag-model illus\">illustrative model</span>: textbook ageing equations with typical coefficients for an NMC cell in a 75 kWh car. Use it to build intuition for what matters. The real-data forecaster in chapters 3 and 4 is separate.</p><p>The stacked colours show where the lost capacity went. The thick line is state of health (SOH); automotive warranties usually guarantee 70% for 8 years.</p>",
    facts: [["End of life", "80% SOH (70% in most warranties)"], ["Two clocks", "Calendar time and charge throughput"], ["Main culprits", "SEI growth, lithium plating, particle cracking"]],
    hint: "Scroll, or move the sliders yourself at any point." },
  { title: "Calendar ageing: the SEI keeps growing", tag: "Time", p: { ...BASE },
    body: "<p>The SEI film from chapter 1 never quite stops growing. Electrolyte molecules diffuse through it and react at the graphite, locking up more lithium. Diffusion through a growing layer slows as it thickens, so the loss goes roughly with the square root of time: fast at first, then slower.</p><p>This loss of lithium inventory (LLI) happens parked or driving. For a typical commuter, calendar ageing is the biggest part of the loss.</p>",
    hint: "The teal area is calendar loss. Notice it bends over like √t." },
  { title: "Heat doubles the rate", tag: "Arrhenius", p: { ...BASE, temp: 40 },
    body: "<p>Side reactions are chemistry, so they follow the Arrhenius law: rate ∝ e<sup>−Eₐ/RT</sup>. With typical activation energies, every 10–15 °C rise roughly doubles calendar ageing.</p><p>That's why packs are actively cooled, why cars in hot climates degrade faster, and why parking in the shade matters more than most driving habits. Here the cell runs at 40 °C instead of 25 °C.</p>",
    ro: null },
  { title: "Sitting full hurts", tag: "High SOC", p: { ...BASE, top: 100 },
    body: "<p>At high state of charge the graphite is at its lowest potential and the cathode at its highest, both furthest outside the electrolyte's comfort zone. SEI growth speeds up and the cathode starts oxidising the electrolyte and losing transition metals.</p><p>That's why carmakers recommend daily charging to 80% and saving 100% for road trips, and why LFP, with its gentler voltages, is usually fine at 100%.</p>" },
  { title: "Deep, frequent cycling", tag: "Throughput", p: { ...BASE, km: 220, top: 100 },
    body: "<p>Each cycle swells and shrinks the electrode particles as lithium moves in and out; graphite expands about 10% when full. Repeated strain cracks particles and the SEI. Fresh surface grows new SEI (more lithium lost), and cracked-off fragments stop taking part (loss of active material, LAM).</p><p>Deeper cycles strain more per cycle. Here the car covers 220 km a day on a full charge, about three times a typical commute.</p>" },
  { title: "Cold fast charging plates lithium", tag: "Plating", p: { ...BASE, temp: 2, crate: 2 },
    body: "<p>Charge ions into graphite faster than they can diffuse in, and they deposit as metallic lithium on the surface. Cold makes it much worse because diffusion and reaction slow down. Some plated lithium re-dissolves; the rest is lost, and it can grow into needle-like dendrites that pierce the separator.</p><p>That's why cars precondition (warm) the battery before a DC fast charge and why charging power drops in winter. Here: 2C charging at 2 °C.</p>" },
  { title: "The knee", tag: "Non-linear", p: { ...BASE, temp: 35, km: 200, top: 100, crate: 1.5 },
    body: "<p>Fade often looks gentle and linear, then suddenly accelerates. Typical causes: lithium plating takes over once the anode has lost enough active material that it is overloaded during charging; the electrolyte dries out; pores clog.</p><p>The knee is the hardest thing to predict from early data, because the curve before it looks healthy. That's a key motivation for data-driven forecasting, and also its main weakness: a model can only predict knees like ones it has seen.</p>" },
  { title: "From equations to data", tag: "Next", p: BASE,
    body: "<p>Models like this one are useful for design studies, but each real cell ages differently. Manufacturing spread, temperature gradients in the pack and the actual usage history all matter. The coefficients here are typical values, not measurements.</p><p>The next two chapters use real data instead: 34 cells cycled to failure at NASA, and a model that learns to forecast their capacity from their history and is tested on cells it has never seen.</p>",
    extra: `<button class="next-btn" type="button" onclick="App.show('data');App.jumpTop()">See the data →</button>` }
];

const YEARS = Array.from({ length: 151 }, (_, i) => i / 10);
const S = { p: { ...BASE } };
let ui, stage, cv, W = 0, H = 0, inputs = {};

function syncInputs() {
  for (const [k, el] of Object.entries(inputs)) {
    el.value = S.p[k];
    el.nextElementSibling.textContent = fmtIn(k, S.p[k]);
  }
}
const fmtIn = (k, v) => k === "temp" ? `${v} °C` : k === "top" ? `${v}%` : k === "km" ? `${v} km` : `${(+v).toFixed(1)}C`;

function onStep(i, st) {
  S.p = { ...st.p }; syncInputs();
  stage.cond.textContent = st.overview ? "Illustrative model" : st.title;
}

function frame() {
  if (!W) return;
  const T = App.tokens, ctx = cv.begin();
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const r = simulate(S.p, YEARS);
  const ax = App.axes(ctx, { x: 44, y: 28, w: W - 64, h: H - 64, x0: 0, x1: 15, y0: 50, y1: 100, yt: [50, 60, 70, 80, 90, 100], xt: [0, 3, 6, 9, 12, 15], fy: v => v + "%", yl: "State of health (capacity vs new)", xl: "Years" });
  // stacked loss areas from 100% downward
  const layers = [["cal", T.c1], ["cyc", T.c3], ["pl", T.c4], ["knee", T.c5]];
  let acc = r.pts.map(() => 0);
  for (const [k, col] of layers) {
    const top = r.pts.map((q, i) => [ax.X(q.t), ax.Y(100 - acc[i] * 100)]);
    acc = acc.map((a, i) => Math.min(.5, a + r.pts[i][k]));
    const bot = r.pts.map((q, i) => [ax.X(q.t), ax.Y(100 - acc[i] * 100)]);
    App.band(ctx, top, bot, col + "88");
  }
  // 80% and warranty
  ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = T["stage-muted"];
  ctx.beginPath(); ctx.moveTo(ax.X(0), ax.Y(80)); ctx.lineTo(ax.X(15), ax.Y(80)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax.X(8), ax.Y(50)); ctx.lineTo(ax.X(8), ax.Y(100)); ctx.stroke(); ctx.restore();
  App.text(ctx, "80% end of life", ax.X(15) - 4, ax.Y(80) - 8, T["stage-muted"], "right");
  App.text(ctx, "8-year warranty", ax.X(8) + 4, ax.Y(52), T["stage-muted"]);
  App.line(ctx, r.pts.map(q => [ax.X(q.t), ax.Y(Math.max(50, q.soh * 100))]), T["stage-fg"], 3);
  // legend
  let lx = ax.x + 6;
  ctx.font = App.FONT_MONO;
  [["Calendar", T.c1], ["Cycling", T.c3], ["Plating", T.c4], ["Knee", T.c5]].forEach(([n, c]) => {
    ctx.fillStyle = c; ctx.fillRect(lx, ax.y + ax.h - 16, 10, 10);
    App.text(ctx, n, lx + 14, ax.y + ax.h - 11, T["stage-fg"]); lx += ctx.measureText(n).width + 34;
  });
  const cross = r.pts.find(q => q.soh < .8);
  const at8 = r.pts[80];
  const parts = { Calendar: at8.cal, Cycling: at8.cyc, Plating: at8.pl + at8.knee };
  const dom = Object.entries(parts).sort((a, b) => b[1] - a[1])[0][0];
  stage.setReadouts([
    ["Years to 80%", cross ? `${cross.t.toFixed(1)}<small>yr</small>` : `>15<small>yr</small>`],
    ["SOH at 8 years", `${Math.round(at8.soh * 100)}<small>%</small>`],
    ["Main cause at 8 yr", dom]
  ]);
  stage.where.textContent = `Cycle depth ${Math.round(r.dod * 100)}% · ${Math.round(r.efcYr)} full cycles a year · plating risk ${r.risk < 1.2 ? "low" : r.risk < 3 ? "moderate" : "high"}`;
}

function buildExtras(host) {
  const rows = [
    ["SEI growth", "Lithium inventory (LLI)", "Time, heat, high SOC", "Capacity fade, slow resistance rise", "Cooling, avoid sitting at 100%"],
    ["Lithium plating", "LLI, safety risk", "Fast charging, cold, high SOC", "Sudden fade, knee, dendrites", "Preconditioning, charge-rate maps"],
    ["Particle cracking", "Active material (LAM)", "Deep cycles, high current", "Fade and resistance rise", "Limit DoD, particle engineering"],
    ["Transition-metal dissolution", "Cathode LAM, poisons anode SEI", "High voltage, heat", "Fade, gas", "Coatings, voltage limits"],
    ["Electrolyte oxidation", "Electrolyte loss, gas", "High voltage, heat", "Resistance rise, swelling", "Additives, voltage limits"],
    ["Collector corrosion", "Contact loss", "Over-discharge", "Resistance rise", "BMS low-voltage cut-off"]
  ];
  host.innerHTML = `<span class="label">Reference</span><h2>Degradation mechanisms</h2>
    <p class="lede">Most mechanisms show up as two measurable symptoms: capacity fade (less charge stored) and resistance rise (less power, more heat). Diagnosing which mechanism is acting needs extra tests such as incremental capacity analysis or impedance spectroscopy.</p>
    <div class="scroll-x"><table><thead><tr><th>Mechanism</th><th>What is lost</th><th>Driven by</th><th>Shows up as</th><th>Mitigation</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join("")}
    </tbody></table></div>
    <h3>How the simulator works</h3>
    <p class="lede">Loss = calendar + cycling + plating + knee, with calendar ∝ e<sup>−Eₐ/RT</sup>·(0.6 + 0.8·SOC<sub>avg</sub>)·√t, cycling ∝ e<sup>−Eₐ/RT</sup>·√(DoD/0.5)·EFC<sup>0.6</sup>, plating growing with charge rate × e<sup>0.07(25 − T)</sup>, and a quadratic knee once the loss passes 18%. A full cycle is one pack's worth of energy (75 kWh) at ${WH_PER_KM} Wh/km. Coefficients are typical, chosen to give realistic orders of magnitude, not fitted to any cell.</p>`;
}

App.register({
  id: "ageing", nav: "Ageing",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Ageing simulator", aspect: "16 / 11", extraCanvas: false,
      controls: [App.slider("ag-temp", "Cell temp", -5, 45, 1, 25), App.slider("ag-top", "Charge to", 50, 100, 5, 80),
        App.slider("ag-km", "Daily km", 10, 300, 10, 40), App.slider("ag-crate", "Charge rate", .1, 3, .1, .3)].join("") });
    cv = stage.cv;
    // a status line under the controls
    const where = document.createElement("div"); where.className = "ro-where"; where.innerHTML = `<span class="where"></span>`;
    stage.root.querySelector(".controls").after(where); stage.where = where.firstChild;
    inputs = { temp: ui.stageHost.querySelector("#ag-temp"), top: ui.stageHost.querySelector("#ag-top"), km: ui.stageHost.querySelector("#ag-km"), crate: ui.stageHost.querySelector("#ag-crate") };
    for (const [k, el] of Object.entries(inputs)) el.addEventListener("input", () => { S.p[k] = +el.value; el.nextElementSibling.textContent = fmtIn(k, el.value); });
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    syncInputs();
    buildExtras(ui.extras);
  },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame
});
})();
