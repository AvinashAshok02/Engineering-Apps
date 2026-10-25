/* Chapter: Pack and BMS. Series/parallel arithmetic, cell-group voltages, balancing and thermal spread. */
(() => {
"use strict";
const { clamp, lerp } = App;

const FORMATS = {
  c21700: { name: "21700 cylindrical", short: "21700", ah: 5, v: 3.6, wh: 18, kg: .07 },
  pouch: { name: "Pouch (NMC)", short: "Pouch", ah: 60, v: 3.65, wh: 219, kg: .87 },
  prism: { name: "Prismatic (LFP)", short: "Prismatic LFP", ah: 150, v: 3.2, wh: 480, kg: 2.8 }
};

const STEPS = [
  { overview: true, kicker: "Chapter 5", title: "Pack and BMS", fmt: "c21700", s: 96, p: 46, view: "pack",
    tagline: "A pack is hundreds or thousands of cells wired in series for voltage and in parallel for capacity, plus the electronics, cooling and structure that keep every one of them inside its safe window.",
    body: "<p>Cells are grouped into modules (or, increasingly, straight into the pack: cell-to-pack). The battery management system (BMS) measures every series group, estimates charge and health, balances the cells and opens the contactors if anything goes out of bounds.</p><p>The panel shows a pack built from 21700 cylindrical cells. Change the format and the series and parallel counts to see what they do to voltage and energy.</p>",
    facts: [["Typical pack", "60–100 kWh, 350–800 V"], ["Mass", "~400–600 kg, ~160–200 Wh/kg at pack level"], ["Cell share of pack mass", "~60–75%"]] },
  { title: "Series adds volts, parallel adds amp-hours", tag: "S × P", fmt: "c21700", s: 96, p: 46, view: "pack",
    body: "<p>Cells in series add their voltages; cells in parallel add their capacities. A \"96s46p\" pack has 96 series groups, each of 46 cells in parallel: 96 × 3.6 V ≈ 346 V, and 46 × 5 Ah = 230 Ah, so 346 V × 230 Ah ≈ 79 kWh.</p><p>The parallel cells in a group share one voltage, so the BMS treats each group as one big cell. It measures 96 voltages, not 4,416.</p>" },
  { title: "400 V or 800 V", tag: "Architecture", fmt: "pouch", s: 192, p: 2, view: "pack",
    body: "<p>Doubling the series count to about 192 doubles the pack voltage. For the same power, current halves, so resistive losses (I²R) drop by four, cables get thinner and DC fast charging can push 350 kW without extreme currents.</p><p>The costs: every component needs a higher voltage rating, and silicon-carbide inverters (chapter 6) become close to essential. Here: 192 large pouch cells, two in parallel.</p>" },
  { title: "What the BMS measures", tag: "Sensing", fmt: "c21700", s: 96, p: 46, view: "bms",
    body: "<p>Cell-monitoring chips read every series-group voltage to about ±1 mV, several dozen temperatures and the pack current, many times a second. The BMS also checks insulation resistance between the high-voltage system and the chassis.</p><p>From those, it enforces limits: no group above about 4.2 V or below about 2.5–3.0 V, no cell too hot or too cold, and no current beyond what the cells can take at their present temperature and charge.</p>" },
  { title: "Estimating charge and health", tag: "SOC and SOH", fmt: "c21700", s: 96, p: 46, view: "bms",
    body: "<p>State of charge cannot be measured directly. The BMS counts charge in and out (coulomb counting), which drifts with sensor error, and corrects it with the voltage-to-SOC curve when the pack rests. A Kalman filter combines the two with a circuit model of the cell. LFP's flat curve (chapter 1) makes the correction much weaker.</p><p>State of health is estimated the same way over longer periods, from capacity between known SOC points and from resistance measured during current steps. Forecasting it ahead is what chapter 4's model does.</p>" },
  { title: "Balancing", tag: "Keeping groups level", fmt: "c21700", s: 96, p: 46, view: "bms", balance: true,
    body: "<p>No two cells age, self-discharge or sit at quite the same temperature, so series groups drift apart. The pack is only as good as its weakest group: charging stops when the highest group hits its limit, and discharging stops when the lowest hits its own.</p><p>Passive balancing bleeds the highest groups through resistors (yellow) until they match the rest; active balancing moves charge between groups instead of burning it. Watch the spread close.</p>" },
  { title: "Thermal management", tag: "Cooling", fmt: "c21700", s: 96, p: 46, view: "thermal",
    body: "<p>Cells like 20–35 °C. A liquid glycol loop runs through a cold plate under the modules, cooled by the car's refrigerant circuit, or heated by a heat pump or heater in winter. The goal is not just a good average but a small spread, typically under 5 °C across the pack, because hotter cells age faster and drag the pack down.</p><p>Here coolant enters on the left; cells downstream run a few degrees warmer.</p>" },
  { title: "When it goes wrong", tag: "Safety", fmt: "c21700", s: 96, p: 46, view: "thermal", runaway: true,
    body: "<p>An internal short, crush or overcharge can heat a cell past about 150–200 °C, where its materials react exothermically and it vents and burns: thermal runaway. Packs are designed so one failing cell can't ignite its neighbours, using spacing, barriers, vent paths and mica sheets.</p><p>The disconnect side is electrical: two main contactors, a pyrotechnic fuse that cuts the circuit in milliseconds in a crash, and a manual service disconnect.</p>" }
];

const S = { step: 0, fmt: "c21700", s: 96, p: 46, v: [], t: 0 };
let ui, stage, cv, W = 0, H = 0, inS, inP, setFmt;

function resetGroups() {
  // series-group voltages around 3.9 V with a little manufacturing spread
  S.v = Array.from({ length: 24 }, (_, i) => 3.9 + .03 * Math.sin(i * 2.1) + .02 * Math.cos(i * 5.3) + (i === 7 ? .05 : 0) + (i === 17 ? -.03 : 0));
}

function sync() {
  inS.value = S.s; inS.nextElementSibling.textContent = S.s + "s";
  inP.value = S.p; inP.nextElementSibling.textContent = S.p + "p";
  setFmt(S.fmt);
}

function onStep(i, st) {
  S.step = i;
  S.fmt = st.fmt; S.s = st.s; S.p = st.p; sync();
  if (st.balance || st.view === "bms") resetGroups();
  stage.cond.textContent = st.overview ? "Pack plan view" : st.title;
}

function drawPack(ctx, T, st, box) {
  const f = FORMATS[S.fmt], view = st.view;
  // modules: lay out the series groups as modules of up to 12 groups
  const perMod = S.fmt === "c21700" ? 6 : 12, nMod = Math.ceil(S.s / perMod);
  const cols = nMod > 12 ? 6 : 4, rows = Math.ceil(nMod / cols);
  const gap = 6, mw = (box.w - gap * (cols - 1)) / cols, mh = Math.min(70, (box.h - gap * (rows - 1)) / rows);
  for (let m = 0; m < nMod; m++) {
    const c = m % cols, r = Math.floor(m / cols), x = box.x + c * (mw + gap), y = box.y + r * (mh + gap);
    let fill = T["stage-panel"];
    if (view === "thermal") {
      const tC = 24 + 6 * (c / Math.max(1, cols - 1)) + 1.2 * Math.sin(r * 1.7 + c);
      const hot = st.runaway && m === Math.floor(nMod / 2) ? .5 + .5 * Math.sin(S.t * 6) : 0;
      fill = hot ? `rgba(232,112,90,${.5 + hot * .5})` : `rgba(${Math.round(lerp(92, 232, (tC - 24) / 8))},${Math.round(lerp(194, 112, (tC - 24) / 8))},${Math.round(lerp(174, 90, (tC - 24) / 8))},0.75)`;
    }
    ctx.fillStyle = fill; ctx.strokeStyle = T["stage-rule"]; App.rr(ctx, x, y, mw, mh, 3); ctx.fill(); ctx.stroke();
    // cells inside the module
    ctx.fillStyle = view === "thermal" ? "rgba(0,0,0,0.25)" : T.c5;
    if (S.fmt === "c21700") {
      const n = 10, rr = Math.min(mw / n, mh / 4) * .38;
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(x + (i + .5) * mw / n, y + (j + .7) * mh / 3.4, rr, 0, 7); ctx.fill(); }
    } else {
      const n = 12;
      for (let i = 0; i < n; i++) ctx.fillRect(x + 4 + i * (mw - 8) / n, y + 6, (mw - 8) / n - 2, mh - 12);
    }
  }
  if (view === "thermal") {
    ctx.strokeStyle = T.c3; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(box.x - 12, box.y + box.h + 10); ctx.lineTo(box.x + box.w + 8, box.y + box.h + 10); ctx.stroke();
    App.text(ctx, "coolant in →", box.x - 10, box.y + box.h + 22, T.c3);
  }
  return f;
}

function frame(dt) {
  if (!W) return;
  S.t += dt;
  const T = App.tokens, ctx = cv.begin(), st = STEPS[S.step], f = FORMATS[S.fmt];
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  if (st.view === "bms") {
    // series-group voltages; balancing bleeds the high ones
    const vmin = Math.min(...S.v);
    if (st.balance) S.v = S.v.map(v => v > vmin + .002 ? v - dt * .012 * (v - vmin) / .05 : v);
    else S.v = S.v.map((v, i) => v + Math.sin(S.t * 1.3 + i) * .00005);
    const ax = App.axes(ctx, { x: 46, y: 26, w: W - 66, h: H * .62, x0: 0, x1: 24, y0: 3.8, y1: 4.0, yt: [3.8, 3.85, 3.9, 3.95, 4.0], xt: [], fy: v => v.toFixed(2), yl: "Series-group voltage (V), first 24 of " + S.s });
    const bw = ax.w / 24;
    S.v.forEach((v, i) => {
      const hot = st.balance && v > vmin + .004;
      ctx.fillStyle = hot ? T.hi : T.c1;
      ctx.fillRect(ax.X(i) + 2, ax.Y(v), bw - 4, ax.Y(3.8) - ax.Y(v));
    });
    const spread = (Math.max(...S.v) - vmin) * 1000;
    App.text(ctx, `spread ${spread.toFixed(0)} mV`, ax.x + ax.w, ax.y - 8, T["stage-fg"], "right");
    // SOC estimation sketch: true SOC vs coulomb count drift vs filtered
    const y0 = H * .62 + 60, h2 = H - y0 - 22;
    const ax2 = App.axes(ctx, { x: 46, y: y0, w: W - 66, h: h2, x0: 0, x1: 60, y0: 40, y1: 90, yt: [40, 65, 90], xt: [0, 20, 40, 60], fy: v => v + "%", yl: "SOC estimate over a drive", xl: "Minutes" });
    const tru = m => 88 - m * .75, cc = m => tru(m) + m * .09, kf = m => tru(m) + 1.6 * Math.sin(m / 4) * Math.exp(-m / 15);
    const pts = g => Array.from({ length: 61 }, (_, m) => [ax2.X(m), ax2.Y(g(m))]);
    App.line(ctx, pts(tru), T["stage-fg"], 2);
    App.line(ctx, pts(cc), T.c2, 1.5, [4, 4]);
    App.line(ctx, pts(kf), T.c1, 1.5);
    App.text(ctx, "true", ax2.X(60) + 2, ax2.Y(tru(60)), T["stage-fg"]);
    App.text(ctx, "current count only", ax2.X(36), ax2.Y(cc(36)) - 10, T.c2);
    App.text(ctx, "Kalman", ax2.X(12), ax2.Y(kf(12)) + 12, T.c1);
  } else {
    drawPack(ctx, T, st, { x: 40, y: 34, w: W - 80, h: H - 84 });
    App.text(ctx, `${S.s}s${S.p}p · ${f.name} · ${App.fmt(S.s * S.p)} cells`, 40, 18, T["stage-muted"]);
  }
  const vNom = S.s * f.v, ah = S.p * f.ah, kwh = vNom * ah / 1000;
  stage.setReadouts([
    ["Pack voltage", `${App.fmt(vNom)}<small>V nominal</small>`],
    ["Energy", `${kwh.toFixed(0)}<small>kWh</small>`],
    ["Current at 150 kW", `${App.fmt(150000 / vNom)}<small>A</small>`]
  ]);
}

function buildExtras(host) {
  host.innerHTML = `<span class="label">Reference</span><h2>Pack building blocks</h2>
    <div class="scroll-x"><table><thead><tr><th>Format</th><th class="num">Capacity Ah</th><th class="num">Energy Wh</th><th class="num">Mass kg</th><th>Strengths</th><th>Trade-offs</th></tr></thead><tbody>
    <tr><td>Cylindrical (2170, 4680)</td><td class="num">5–26</td><td class="num">18–95</td><td class="num">0.07–0.36</td><td>Cheap, mature, robust can, good cooling per cell</td><td>Many cells and welds, wasted space between cans</td></tr>
    <tr><td>Pouch</td><td class="num">50–80</td><td class="num">180–290</td><td class="num">0.8–1.1</td><td>Light, good packing, flexible shapes</td><td>Needs external compression and protection, swells</td></tr>
    <tr><td>Prismatic</td><td class="num">100–300</td><td class="num">350–1,000</td><td class="num">2–5</td><td>Few large cells, rigid, suits cell-to-pack and LFP</td><td>Harder to cool evenly, heat builds in the centre</td></tr>
    </tbody></table></div>
    <h3>BMS functions</h3>
    <div class="rules">
      <div class="rule-item"><b>Measure</b><span>Every series-group voltage, temperatures, pack current, insulation resistance.</span></div>
      <div class="rule-item"><b>Estimate</b><span>SOC, SOH, available power over the next few seconds, remaining range.</span></div>
      <div class="rule-item"><b>Protect</b><span>Voltage, current and temperature limits; contactor control; fault detection.</span></div>
      <div class="rule-item"><b>Balance</b><span>Keep series groups level so the whole pack's capacity is usable.</span></div>
      <div class="rule-item"><b>Thermal</b><span>Request cooling or heating; precondition before fast charging.</span></div>
      <div class="rule-item"><b>Report</b><span>CAN messages to the vehicle; logging for warranty and diagnostics. Functional safety to ISO 26262 (typically ASIL C/D).</span></div>
    </div>`;
}

App.register({
  id: "pack", nav: "Pack & BMS",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Battery pack", aspect: "16 / 11",
      controls: App.seg("fmtSeg", Object.entries(FORMATS).map(([k, f]) => [k, f.short]), "c21700") + App.slider("pk-s", "Series", 24, 216, 4, 96) + App.slider("pk-p", "Parallel", 1, 80, 1, 46) });
    cv = stage.cv;
    setFmt = App.bindSeg(ui.stageHost, "fmtSeg", v => { S.fmt = v; });
    inS = ui.stageHost.querySelector("#pk-s"); inP = ui.stageHost.querySelector("#pk-p");
    inS.addEventListener("input", () => { S.s = +inS.value; inS.nextElementSibling.textContent = S.s + "s"; });
    inP.addEventListener("input", () => { S.p = +inP.value; inP.nextElementSibling.textContent = S.p + "p"; });
    resetGroups();
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    buildExtras(ui.extras);
  },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame
});
})();
