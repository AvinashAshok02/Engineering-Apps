/* Chapter: The data. Every NASA cell's measured capacity, grouped by test condition. */
(() => {
"use strict";

const GROUPS = {
  all: null,
  classic: ["B0005", "B0006", "B0007", "B0018"],
  hot: ["B0029", "B0030", "B0031", "B0032"],
  room4: ["B0025", "B0026", "B0027", "B0028", "B0033", "B0034", "B0036"],
  cold: ["B0045", "B0046", "B0047", "B0048", "B0049", "B0050", "B0051", "B0052", "B0053", "B0054", "B0055", "B0056"],
  switched: ["B0038", "B0039", "B0040", "B0041", "B0042", "B0043", "B0044"]
};

const STEPS = [
  { overview: true, kicker: "Chapter 3", title: "Real ageing data", group: "all",
    tagline: "34 cells, cycled until they wore out, at three temperatures and several discharge currents. This is the data the forecaster in chapter 4 learns from.",
    body: "<p>NASA's Prognostics Center of Excellence ran commercial 18650 cells through repeated charge–discharge cycles from 2008 to 2010, recording voltage, current and temperature every few seconds, plus impedance spectra every few cycles. The data set is public and one of the most widely used in battery prognostics.</p><p>The panel plots the capacity each cell delivered on every discharge. Colour shows the test temperature.</p>",
    facts: [["Cells", "34 (18650, 2 Ah rated)"], ["Discharges", "2,767 recorded"], ["Temperatures", "4, 22–24, 43–44 °C"]] },
  { title: "The classic four", tag: "24 °C, 2 A", group: "classic",
    body: "<p>Cells 5, 6, 7 and 18 are the best-known battery curves in the prognostics literature: 2 A discharges at room temperature, 132–168 cycles, fading from about 1.85 Ah to 1.3 Ah.</p><p>Look closely and the curves aren't smooth: capacity jumps up after the test paused for a few days, then falls back over the next cycles. This regeneration happens because, during rest, lithium and electrolyte concentrations even out and some stranded lithium becomes usable again. Any forecaster has to cope with it.</p>",
    hint: "The small upward jumps follow rests of a day or more." },
  { title: "Heat", tag: "43 °C, 4 A", group: "hot",
    body: "<p>Cells 29–32 were run at 43 °C with 4 A discharges. They lost 10–12% in only 40 cycles, a steeper rate than at room temperature, as the Arrhenius discussion in chapter 2 predicts.</p><p>Only 40 cycles per cell makes long-range forecasts on this group impossible to check: there is no data 100 cycles ahead.</p>" },
  { title: "Room temperature, harder load", tag: "24 °C, 4 A", group: "room4",
    body: "<p>Cells 25–28 used a 4 A square-wave load, 28 cycles each. Cells 33, 34 and 36 used 4 A and 2 A, nearly 200 cycles each. Cell 33 also shows a mid-test collapse to under 0.5 Ah for a few runs, followed by recovery, which looks like a test-rig problem rather than ageing.</p>" },
  { title: "Cold: capacity you get back", tag: "4 °C", group: "cold",
    body: "<p>At 4 °C, cells deliver far less: about 1.5 Ah at 1 A, 1.1–1.3 Ah at 2 A, and at 4 A only 0.05 Ah, because the cell hits its cut-off voltage almost immediately. That loss is not ageing. Warm the cell and the capacity comes back.</p><p>Cold slows lithium diffusion and raises internal resistance, so the voltage sags under load. That's why EVs lose winter range, and why \"capacity\" in this data set means delivered capacity under that run's conditions, not true health.</p>" },
  { title: "Changing conditions", tag: "Switched mid-test", group: "switched",
    body: "<p>Cells 38–44 had their temperature or load changed part-way through. Their curves jump up or down at each switch, by far more than any ageing step.</p><p>A forecaster that ignored this would learn that capacity sometimes leaps by 1.5 Ah from one cycle to the next. So each cell is split into regimes of constant temperature and current, and forecasts never cross a regime boundary.</p>" },
  { title: "Cleaning", tag: "Quality control", group: "all", showBad: true,
    body: "<p>Three rules, applied before any training:</p><ul><li>Drop runs under 0.3 Ah: failed or near-empty discharges.</li><li>Flag single-run glitches with a Hampel filter: any value more than 4 robust standard deviations from the median of its 10 neighbours.</li><li>Drop the break-in runs at the start of each regime, before the cell settles to its new conditions.</li></ul><p>Flagged runs (crosses) are never used as forecast targets. Features are computed only from runs that were already in the past at each point, so the cleaning can't leak future information into a forecast.</p>" },
  { title: "What's left", tag: "Usable", group: "usable",
    body: "<p>Regimes with at least 20 clean discharges are kept: 35 regimes from 32 cells, about 2,400 discharges. The rest are too short to forecast from or to check a forecast against.</p><p>That's a small data set by machine-learning standards, and it covers one cell type under lab conditions. Chapter 4 shows what a model can learn from it, and is honest about what it can't.</p>",
    extra: `<button class="next-btn" type="button" onclick="App.show('model');App.jumpTop()">Meet the forecaster →</button>` }
];

const S = { step: 0, pick: "" };
let ui, stage, cv, W = 0, H = 0, D, sel;

const colT = (t, T) => t < 10 ? T.c3 : t < 30 ? T.c1 : T.c4;

function onStep(i, st) {
  S.step = i;
  stage.cond.textContent = st.overview ? "Colour: test temperature" : st.title;
  if (S.pick && st.group !== "all") { S.pick = ""; sel.value = ""; }
}

function frame() {
  if (!W || !D) return;
  const T = App.tokens, ctx = cv.begin(), st = STEPS[S.step];
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const ax = App.axes(ctx, { x: 44, y: 26, w: W - 64, h: H - 60, x0: 0, x1: 200, y0: 0, y1: 2.1, yt: [0, .5, 1, 1.5, 2], xt: [0, 50, 100, 150, 200], fy: v => v.toFixed(1), yl: "Delivered capacity (Ah)", xl: "Discharge number" });
  const grp = S.pick ? [S.pick] : GROUPS[st.group];
  const on = (c, r) => st.group === "usable" ? r.usable : !grp || grp.includes(c.id);
  let nOn = 0, nRuns = 0, nBad = 0;
  // background first, highlighted on top
  for (const pass of [0, 1]) {
    for (const c of D.cells) for (const r of c.regimes) {
      const hl = on(c, r);
      if (hl !== !!pass) continue;
      const col = hl ? colT(r.ambient_c, T) : T["stage-rule"];
      const pts = r.cycle.map((x, i) => [ax.X(x), r.valid[i] && r.cap[i] != null ? ax.Y(r.cap[i]) : NaN]);
      App.line(ctx, pts, col, hl ? 1.6 : 1);
      if (hl) {
        nOn++; nRuns += r.cycle.length;
        r.cycle.forEach((x, i) => {
          if (r.valid[i] || r.cap[i] == null) return;
          nBad++;
          if (!st.showBad && !S.pick) return;
          const px = ax.X(x), py = ax.Y(Math.min(2.1, r.cap[i]));
          ctx.strokeStyle = T.hi; ctx.lineWidth = 1.4; ctx.beginPath();
          ctx.moveTo(px - 3, py - 3); ctx.lineTo(px + 3, py + 3); ctx.moveTo(px + 3, py - 3); ctx.lineTo(px - 3, py + 3); ctx.stroke();
        });
      }
    }
  }
  // legend
  let lx = ax.x + ax.w - 230;
  [["4 °C", T.c3], ["22–24 °C", T.c1], ["43–44 °C", T.c4]].forEach(([n, c]) => {
    ctx.fillStyle = c; ctx.fillRect(lx, ax.y + 4, 10, 10); App.text(ctx, n, lx + 14, ax.y + 9, T["stage-fg"]); lx += 76;
  });
  if (S.pick) {
    const c = D.cells.find(x => x.id === S.pick);
    const amb = [...new Set(c.regimes.map(r => r.ambient_c + " °C"))].join(" → ");
    const cur = [...new Set(c.regimes.map(r => r.current_a.toFixed(0) + " A"))].join(" → ");
    stage.setReadouts([["Cell", c.id.replace("B00", "#")], ["Conditions", `${amb}<small>${cur}</small>`], ["Flagged runs", `${nBad}<small>of ${nRuns}</small>`]]);
  } else {
    stage.setReadouts([[st.group === "usable" ? "Usable regimes" : "Regimes shown", String(nOn)], ["Discharges", App.fmt(nRuns)], ["Flagged runs", String(nBad)]]);
  }
}

function buildExtras(host) {
  const rows = D.cells.map(c => {
    const all = c.regimes.flatMap(r => r.cap.filter((x, i) => r.valid[i]));
    const n = c.regimes.reduce((a, r) => a + r.cycle.length, 0);
    const conds = c.regimes.map(r => `${r.ambient_c} °C, ${r.current_a.toFixed(0)} A${r.usable ? "" : " (unused)"}`).join("; ");
    return `<tr><td>${c.id}</td><td>${conds}</td><td class="num">${c.cutoff_v.toFixed(1)}</td><td class="num">${n}</td><td class="num">${all.length ? all[0].toFixed(2) : "–"}</td><td class="num">${all.length ? all[all.length - 1].toFixed(2) : "–"}</td><td class="num">${c.days.toFixed(0)}</td></tr>`;
  }).join("");
  host.innerHTML = `<span class="label">Reference</span><h2>Every cell</h2>
    <p class="lede">Test conditions per regime, discharge cut-off voltage, number of recorded discharges, first and last clean capacity, and test duration. Source: B. Saha and K. Goebel, “Battery Data Set”, NASA Prognostics Data Repository, NASA Ames Research Center (2007), with the READMEs shipped in each archive.</p>
    <div class="scroll-x"><table><thead><tr><th>Cell</th><th>Regimes (ambient, current)</th><th class="num">Cut-off V</th><th class="num">Runs</th><th class="num">First Ah</th><th class="num">Last Ah</th><th class="num">Days</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note">The data has known quirks that NASA's READMEs mention but don't explain: very low capacities at 4 °C, a software crash ending cells 49–52, and runs with zero capacity. Treat any result on this data set as indicative of the method, not of a particular commercial cell.</p>`;
}

App.register({
  id: "data", nav: "Data",
  build() {
    ui = this.ui = App.section(this);
    D = window.BDE_DATA;
    stage = App.stage(ui.stageHost, { title: "NASA cell capacity", aspect: "16 / 11",
      controls: `<label class="rng">Highlight cell <select class="sel" id="dataPick"><option value="">Step's group</option>${(D ? D.cells : []).map(c => `<option value="${c.id}">${c.id}</option>`).join("")}</select></label>` });
    cv = stage.cv;
    sel = ui.stageHost.querySelector("#dataPick");
    sel.addEventListener("change", () => { S.pick = sel.value; });
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    if (D) buildExtras(ui.extras);
    else ui.extras.innerHTML = `<p class="note">Model data not found. Run <code>python -m bde.train</code> in <code>battery-model/</code>.</p>`;
  },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame
});
})();
