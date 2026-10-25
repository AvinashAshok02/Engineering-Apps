/* Chapter: The cell. An animated lithium-ion cell cross-section with its open-circuit voltage curve. */
(() => {
"use strict";
const { clamp, lerp } = App;

// Open-circuit voltage against state of charge, typical graphite-anode cells.
const CHEM = {
  nmc: { name: "NMC", long: "Nickel manganese cobalt oxide", cath: "#b48be0", wh: "~250", v: "3.6–3.7",
    ocv: [[0, 3.0], [.05, 3.45], [.1, 3.55], [.2, 3.62], [.3, 3.68], [.4, 3.73], [.5, 3.79], [.6, 3.86], [.7, 3.94], [.8, 4.02], [.9, 4.1], [1, 4.18]] },
  lfp: { name: "LFP", long: "Lithium iron phosphate", cath: "#5cc2ae", wh: "~170", v: "3.2",
    ocv: [[0, 2.5], [.03, 3.1], [.1, 3.2], [.2, 3.26], [.3, 3.29], [.5, 3.3], [.6, 3.31], [.7, 3.33], [.9, 3.34], [.97, 3.4], [1, 3.6]] },
  nca: { name: "NCA", long: "Nickel cobalt aluminium oxide", cath: "#6f9cf0", wh: "~260", v: "3.6",
    ocv: [[0, 3.0], [.05, 3.4], [.1, 3.5], [.2, 3.58], [.3, 3.64], [.4, 3.7], [.5, 3.77], [.6, 3.85], [.7, 3.93], [.8, 4.01], [.9, 4.09], [1, 4.2]] }
};

const STEPS = [
  { overview: true, kicker: "Chapter 1", title: "The cell", mode: "discharge", chem: "nmc",
    tagline: "A lithium-ion cell is two crystal hosts and a shuttle: lithium ions cross inside the cell while electrons go the long way round, through whatever you are powering.",
    body: "<p>An EV pack holds thousands of these cells. Everything later in this guide, from range to ageing to the motor's power limit, starts with what happens inside one of them.</p><p>On the right: the negative electrode (graphite) on the left, the positive electrode (a metal oxide) on the right, a porous separator between them, and an external circuit over the top. Amber dots are lithium ions; cyan dots are electrons.</p>",
    facts: [["Nominal voltage", "3.2–3.7 V per cell"], ["Cells per car", "~100 large to ~7,000 small"], ["Energy per cell", "~10 Wh (18650) to ~1 kWh (large prismatic)"]] },
  { title: "Two hosts, one shuttle", tag: "Intercalation", mode: "rest", chem: "nmc",
    body: "<p>Neither electrode is consumed. Lithium ions slot in between the layers of each host crystal, a process called intercalation, and slot out again. Graphite stores one lithium per six carbon atoms (LiC<sub>6</sub>); the oxide stores roughly one per metal atom.</p><p>Charged means most of the lithium sits in the graphite, where it has high energy. Discharged means it has moved to the oxide, where it has low energy. The energy difference per unit of charge is the cell voltage.</p>",
    ro: [["Anode", "Graphite<small>LiC₆</small>"], ["Separator", "~15<small>µm polymer</small>"], ["Electrolyte", "LiPF₆<small>in carbonates</small>"]] },
  { title: "Discharge", tag: "Driving", mode: "discharge", chem: "nmc",
    body: "<p>Close the circuit and lithium in the graphite gives up an electron. The ion crosses the electrolyte and separator to the oxide; the electron can't cross the separator, so it flows through the motor instead and rejoins the ion in the oxide.</p><p>The current through the motor is the electron flow. The voltage falls as the graphite empties and the oxide fills, which is why a battery's voltage is a rough fuel gauge.</p>",
    hint: "Watch the voltage readout and the dot on the curve below the cell." },
  { title: "Charge", tag: "Plugged in", mode: "charge", chem: "nmc",
    body: "<p>A charger pushes electrons back into the graphite, and lithium ions follow them back across the separator. The charger has to push at a higher voltage than the cell's own, and the difference is lost as heat.</p><p>Charge too fast or too cold and ions arrive at the graphite faster than they can slot in. They then plate out as lithium metal on the surface, the most damaging thing you can do to a cell. Chapter 2 covers this.</p>",
    ro: [["Standard charge", "0.3–0.5<small>C</small>"], ["DC fast charge", "1.5–3<small>C peak</small>"], ["Charge limit", "4.2<small>V (NMC)</small>"]] },
  { title: "The film that saves it", tag: "SEI", mode: "rest", chem: "nmc", sei: true,
    body: "<p>Graphite at full charge sits outside the electrolyte's stability window, so the electrolyte reacts with it. On the first charge this forms a thin layer called the solid electrolyte interphase (SEI), which lets ions through but blocks electrons and stops further reaction.</p><p>The SEI is essential, but it costs lithium: every ion locked into the film is lost from the shuttle for good. It also keeps growing slowly for the rest of the cell's life. That growth is the main reason cells lose capacity just sitting on a shelf.</p>",
    ro: [["SEI thickness", "~10–50<small>nm</small>"], ["First-cycle loss", "~5–10<small>% of lithium</small>"], ["Growth", "∝ √time"]] },
  { title: "Chemistry sets the voltage", tag: "OCV curve", mode: "cycle", chem: "lfp", chips: true,
    body: "<p>The cathode material sets both the voltage and the shape of the curve below the cell. NMC and NCA slope steadily from about 4.2 V down to 3.0 V. LFP sits almost flat near 3.3 V for most of its range.</p><p>That flat plateau makes LFP hard to fuel-gauge from voltage alone, so its battery management system leans on current counting. LFP is lower voltage and less energy-dense, but it is cheaper, cobalt-free, more thermally stable and lasts more cycles.</p>",
    hint: "Switch chemistry with the buttons on the panel." },
  { title: "The cells in the data", tag: "NASA 18650", mode: "cycle", chem: "nmc",
    body: "<p>The real ageing data in chapters 3 and 4 comes from commercial 18650 cells (18 mm diameter, 65 mm long), rated at 2 Ah. NASA does not publish their chemistry; the 4.2 V charge limit and the voltage curve fit a layered-oxide cathode like the ones above.</p><p>Each was charged at 1.5 A to 4.2 V, held at 4.2 V until the current fell to 20 mA, then discharged at a fixed current to a cut-off voltage, over and over, until it wore out.</p>",
    ro: [["Rated capacity", "2.0<small>Ah</small>"], ["Charge", "1.5 A CC<small>→ 4.2 V CV</small>"], ["Discharge", "1–4 A<small>to 2.0–2.7 V</small>"]] }
];

const N_SLOT_R = 7, N_SLOT_C = 6, N_ION = 34;
const S = { step: 0, mode: "discharge", chem: "nmc", soc: .9, ions: [], moving: [], electrons: [], tAcc: 0, t: 0 };
let ui, stage, cv, W = 0, H = 0, L, setChip;

function layout() {
  const top = 40, bot = H * .6;
  L = {
    top, bot,
    cuA: [W * .05, W * .085], an: [W * .085, W * .42], sep: [W * .42, W * .5], ca: [W * .5, W * .835], alC: [W * .835, W * .87],
    wireY: 16, plot: { x: 44, y: H * .69, w: W - 64, h: H * .31 - 40 }
  };
}
const slot = (side, k) => {
  const r = Math.floor(k / N_SLOT_C), c = k % N_SLOT_C;
  const [x0, x1] = side === "a" ? L.an : L.ca;
  const yy = L.top + 14 + (r + .5) * (L.bot - L.top - 28) / N_SLOT_R;
  return [x0 + (c + .5) * (x1 - x0) / N_SLOT_C, yy];
};

function initIons() {
  const nA = Math.round(S.soc * N_ION);
  const aSlots = [...Array(N_SLOT_R * N_SLOT_C).keys()].sort(() => Math.random() - .5);
  const cSlots = [...Array(N_SLOT_R * N_SLOT_C).keys()].sort(() => Math.random() - .5);
  S.ions = [...Array(N_ION).keys()].map(i => i < nA ? { side: "a", k: aSlots[i] } : { side: "c", k: cSlots[i] });
  S.moving = [];
}

function freeSlot(side) {
  const used = new Set(S.ions.filter(o => o.side === side && !o.move).map(o => o.k));
  S.moving.forEach(o => { if (o.to === side) used.add(o.k2); });
  const free = [...Array(N_SLOT_R * N_SLOT_C).keys()].filter(k => !used.has(k));
  return free[Math.floor(Math.random() * free.length)];
}

function launch(from) {
  const cands = S.ions.filter(o => o.side === from && !o.move);
  if (!cands.length) return;
  // ions nearest the separator leave first
  cands.sort((a, b) => from === "a" ? (b.k % N_SLOT_C) - (a.k % N_SLOT_C) : (a.k % N_SLOT_C) - (b.k % N_SLOT_C));
  const ion = cands[Math.floor(Math.random() * Math.min(4, cands.length))];
  const to = from === "a" ? "c" : "a";
  ion.move = { p: slot(from, ion.k), t: 0 };
  ion.to = to; ion.k2 = freeSlot(to);
  S.moving.push(ion);
  for (let i = 0; i < 2; i++) S.electrons.push({ u: -i * .08, dir: from === "a" ? 1 : -1 });
}

function onStep(i, st) {
  S.step = i;
  if (st.chem !== S.chem) { S.chem = st.chem; setChip && setChip(st.chem); }
  S.mode = st.mode;
  if (st.mode === "discharge" && S.soc < .3) { S.soc = .9; initIons(); }
  if (st.mode === "charge" && S.soc > .7) { S.soc = .15; initIons(); }
  stage.cond.textContent = st.overview ? "Amber: Li⁺ ions · cyan: electrons" : st.title;
  S.stepRo = st.ro || null;
}

function ocv(soc) { return App.at(CHEM[S.chem].ocv, soc); }

function frame(dt) {
  if (!W) return;
  S.t += dt;
  const T = App.tokens, ctx = cv.begin(), chem = CHEM[S.chem];
  // simulate
  let dir = S.mode === "discharge" ? "a" : S.mode === "charge" ? "c" : null;
  if (S.mode === "cycle") {
    if (S.cycleDir == null) S.cycleDir = "a";
    if (S.soc < .08) S.cycleDir = "c"; else if (S.soc > .95) S.cycleDir = "a";
    dir = S.cycleDir;
  }
  if (dir) {
    S.tAcc += dt;
    const rate = App.reduceMotion ? .5 : 2.6;
    if (S.tAcc > 1 / rate) { S.tAcc = 0; if ((dir === "a" && S.soc > .04) || (dir === "c" && S.soc < .97)) launch(dir); }
  }
  for (const ion of S.moving) {
    ion.move.t += dt * .9;
    if (ion.move.t >= 1) { ion.side = ion.to; ion.k = ion.k2; ion.move = null; }
  }
  S.moving = S.moving.filter(o => o.move);
  const inA = S.ions.filter(o => o.side === "a" && !o.move).length;
  S.soc = lerp(S.soc, inA / N_ION, Math.min(1, dt * 3));
  S.electrons.forEach(e => e.u += dt * .7);
  S.electrons = S.electrons.filter(e => e.u < 1);

  // draw
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const { top, bot } = L;
  // electrolyte
  ctx.fillStyle = "rgba(111,156,240,0.07)"; ctx.fillRect(L.an[0], top, L.ca[1] - L.an[0], bot - top);
  // collectors
  ctx.fillStyle = "#b87245"; ctx.fillRect(L.cuA[0], top, L.cuA[1] - L.cuA[0], bot - top);
  ctx.fillStyle = "#9aa6ae"; ctx.fillRect(L.alC[0], top, L.alC[1] - L.alC[0], bot - top);
  // graphite layers
  const rows = N_SLOT_R + 1, gap = (bot - top - 28) / N_SLOT_R;
  ctx.strokeStyle = "#6d7a83"; ctx.lineWidth = 2;
  for (let r = 0; r < rows; r++) { const y = top + 14 + r * gap; ctx.beginPath(); ctx.moveTo(L.an[0] + 4, y); ctx.lineTo(L.an[1] - 4, y); ctx.stroke(); }
  // cathode layers (metal-oxide slabs)
  ctx.fillStyle = chem.cath; ctx.globalAlpha = .55;
  for (let r = 0; r < rows; r++) {
    const y = top + 14 + r * gap;
    for (let x = L.ca[0] + 8; x < L.ca[1] - 4; x += 12) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // separator
  ctx.strokeStyle = T["stage-muted"]; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
  for (let x = L.sep[0] + 6; x < L.sep[1]; x += 8) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot); ctx.stroke(); }
  ctx.setLineDash([]);
  // SEI film
  if (STEPS[S.step].sei) {
    ctx.fillStyle = "rgba(217,169,90,0.55)"; ctx.fillRect(L.an[1] - 7, top, 7, bot - top);
    ctx.fillStyle = "rgba(255,207,90,0.35)";
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(L.an[1] - 3.5, top + 18 + i * (bot - top - 36) / 8, 3, 0, 7); ctx.fill(); }
    App.text(ctx, "SEI", L.an[1] - 4, top - 8, T.c2, "center");
  }
  // labels
  App.text(ctx, "−  Graphite", (L.an[0] + L.an[1]) / 2, bot + 12, T["stage-muted"], "center");
  App.text(ctx, "Separator", (L.sep[0] + L.sep[1]) / 2, bot + 12, T["stage-muted"], "center");
  App.text(ctx, `${chem.name}  +`, (L.ca[0] + L.ca[1]) / 2, bot + 12, T["stage-muted"], "center");
  // ions
  ctx.fillStyle = T.hi;
  for (const ion of S.ions) {
    let p;
    if (ion.move) {
      const a = ion.move.p, b = slot(ion.to, ion.k2), t = ion.move.t, e = t * t * (3 - 2 * t);
      p = [lerp(a[0], b[0], e), lerp(a[1], b[1], e) + Math.sin(t * Math.PI * 3) * 6];
    } else p = slot(ion.side, ion.k);
    ctx.beginPath(); ctx.arc(p[0], p[1], 4.2, 0, 7); ctx.fill();
  }
  // external circuit
  const xa = (L.cuA[0] + L.cuA[1]) / 2, xc = (L.alC[0] + L.alC[1]) / 2, wy = L.wireY + 6, mid = W * .46;
  ctx.strokeStyle = T["stage-muted"]; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(xa, top); ctx.lineTo(xa, wy); ctx.lineTo(xc, wy); ctx.lineTo(xc, top); ctx.stroke();
  const busy = S.moving.length > 0;
  const devTxt = S.mode === "rest" ? "open circuit" : (dir === "c" ? "charger" : "motor");
  ctx.fillStyle = T["stage-panel"]; ctx.strokeStyle = busy ? T.hi : T["stage-rule"];
  App.rr(ctx, mid - 46, wy - 11, 92, 22, 4); ctx.fill(); ctx.stroke();
  App.text(ctx, devTxt, mid, wy, busy ? T["stage-fg"] : T["stage-muted"], "center");
  // electrons travel along the wire: anode -> cathode on discharge, reverse on charge
  const path = [[xa, top], [xa, wy], [xc, wy], [xc, top]];
  const segL = [wy - top, xc - xa, top - wy].map(Math.abs), tot = segL.reduce((a, b) => a + b);
  ctx.fillStyle = "#62d6f0";
  for (const e of S.electrons) {
    if (e.u < 0) continue;
    let d = (e.dir > 0 ? e.u : 1 - e.u) * tot, i = 0;
    while (i < 2 && d > segL[i]) { d -= segL[i]; i++; }
    const a = path[i], b = path[i + 1], f = clamp(d / segL[i], 0, 1);
    ctx.beginPath(); ctx.arc(lerp(a[0], b[0], f), lerp(a[1], b[1], f), 3, 0, 7); ctx.fill();
  }
  // OCV plot
  const P = L.plot, chemOcv = chem.ocv;
  const ax = App.axes(ctx, { x: P.x, y: P.y, w: P.w, h: P.h, x0: 0, x1: 100, y0: 2.5, y1: 4.3, yt: [2.5, 3, 3.5, 4], xt: [0, 25, 50, 75, 100], fx: v => v + "%", fy: v => v.toFixed(1), yl: W < 560 ? "" : "Open-circuit voltage (V)", xl: W < 560 ? "" : "State of charge" });
  Object.entries(CHEM).forEach(([k, c]) => {
    if (k === S.chem) return;
    App.line(ctx, c.ocv.map(([s, v]) => [ax.X(s * 100), ax.Y(v)]), T["stage-rule"], 1.5);
  });
  App.line(ctx, chemOcv.map(([s, v]) => [ax.X(s * 100), ax.Y(v)]), chem.cath, 2.5);
  const v = ocv(S.soc);
  ctx.fillStyle = T.hi; ctx.beginPath(); ctx.arc(ax.X(S.soc * 100), ax.Y(v), 5, 0, 7); ctx.fill();

  stage.setReadouts(S.stepRo || [
    ["Cell voltage", `${v.toFixed(2)}<small>V</small>`],
    ["State of charge", `${Math.round(S.soc * 100)}<small>%</small>`],
    [`${chem.name} cell energy`, `${chem.wh}<small>Wh/kg</small>`]
  ]);
}

function buildExtras(host) {
  const rows = [
    ["NMC 811", "3.65", "240–280", "1,500–2,500", "Medium", "High", "Long-range cars"],
    ["NMC 532 / 622", "3.65", "200–240", "2,000–3,000", "Medium", "Medium", "Mainstream cars"],
    ["NCA", "3.6", "250–270", "1,000–2,000", "Lower", "High", "Performance cars, early Teslas"],
    ["LFP", "3.2", "160–190", "3,000–6,000", "High", "Low", "Standard-range cars, buses, storage"],
    ["LMFP", "3.7", "190–220", "2,000–3,000", "High", "Low", "Emerging"],
    ["Sodium-ion", "3.1", "120–160", "2,000–4,000", "High", "Lowest", "Small cars, storage"]
  ];
  host.innerHTML = `<span class="label">Reference</span><h2>Cathode chemistries</h2>
    <p class="lede">Typical cell-level values against a graphite anode. Cycle life is to 80% capacity under moderate conditions and varies a lot with how the cell is used.</p>
    <div class="scroll-x"><table><thead><tr><th>Chemistry</th><th class="num">Nominal V</th><th class="num">Wh/kg (cell)</th><th class="num">Cycles to 80%</th><th>Thermal stability</th><th>Cost</th><th>Typical use</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td></tr>`).join("")}
    </tbody></table></div>
    <h3>Words you will meet in every chapter</h3>
    <div class="rules">
      <div class="rule-item"><b>Capacity (Ah)</b><span>Charge a cell can deliver from full to empty. A 2 Ah cell gives 2 A for one hour. Depends on temperature and current.</span></div>
      <div class="rule-item"><b>Energy (Wh)</b><span>Capacity × average voltage. A 2 Ah, 3.6 V cell holds about 7.2 Wh. Packs are quoted in kWh.</span></div>
      <div class="rule-item"><b>C-rate</b><span>Current relative to capacity. 1C empties the cell in one hour; 2C in 30 minutes. 2 A on a 2 Ah cell is 1C.</span></div>
      <div class="rule-item"><b>SOC and DoD</b><span>State of charge is how full the cell is now. Depth of discharge is how much of it one cycle uses.</span></div>
      <div class="rule-item"><b>SOH</b><span>State of health: capacity now ÷ capacity when new. 80% is the usual end of life for automotive packs.</span></div>
      <div class="rule-item"><b>Internal resistance</b><span>Why voltage sags under load and the cell heats. It rises with age and falls with temperature.</span></div>
    </div>`;
}

App.register({
  id: "cell", nav: "Cell",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Inside a Li-ion cell", aspect: "16 / 13",
      controls: App.seg("chemSeg", Object.entries(CHEM).map(([k, c]) => [k, c.name]), "nmc") });
    cv = stage.cv;
    setChip = App.bindSeg(ui.stageHost, "chemSeg", v => { S.chem = v; });
    initIons();
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    buildExtras(ui.extras);
  },
  resize() { cv.fit(); W = cv.w; H = cv.h; if (W) layout(); },
  frame
});
})();
