/* Chapter: The forecaster. Out-of-fold capacity forecasts from the gradient-boosted model, per NASA cell. */
(() => {
"use strict";
const { clamp } = App;

const S = { step: 0, key: "", ai: 0, look: 50, play: false, acc: 0, user: false };
let ui, stage, cv, W = 0, H = 0, D, M, REG = {}, sel, slider, playBtn, setLook, STEPS;

const pct = x => Math.round(x * 100) + "%";
const ah = x => x.toFixed(3);

function regimes() {
  for (const c of D.cells) for (const r of c.regimes) if (r.forecast) REG[`${c.id}:${r.regime}`] = { cell: c, r };
}

function makeSteps() {
  const m = M.mae_ah_cell_avg, bh = Object.fromEntries(M.by_h.map(r => [r.h, r]));
  const imp = M.importance.slice(0, 3).map(d => D.labels[d.feature].toLowerCase());
  return [
    { overview: true, kicker: "Chapter 4", title: "The forecaster", key: "B0005:0", at: 60,
      tagline: "Given everything measured on a cell so far, how much capacity will it deliver 5 to 100 cycles from now, and how sure can we be?",
      body: `<p>This is a <span class="tag-model data">data-driven model</span>: gradient-boosted decision trees trained on the NASA cells from chapter 3. It predicts a range, not just one number: a median forecast and a band that should contain the real outcome 80% of the time.</p><p>Every forecast on the panel was made by a model that never saw that cell during training. Pick any cell, then drag <b>Now</b> to move through its life and compare the forecast with what really happened.</p>`,
      facts: [["Training data", `${M.n_cells} cells, ${App.fmt(M.n_examples)} forecast examples`], ["Error on unseen cells", `${ah(m.gbm)} Ah average (≈${(m.gbm / 2 * 100).toFixed(1)}% of rated)`], ["vs no-change guess", `${ah(m.persistence)} Ah, ${(m.persistence / m.gbm).toFixed(1)}× worse`]],
      hint: "The fan is the forecast; grey dots after the line are what actually happened." },
    { title: "The question", tag: "Task", key: "B0005:0", at: 30,
      body: `<p>At each discharge (\"now\"), the model sees the cell's history up to that point and forecasts capacity at nine horizons: 5, 10, 20, 30, 40, 50, 60, 80 and 100 cycles ahead. It predicts the relative change from today's smoothed capacity, so cells that started at different capacities share one scale.</p><p>A battery management system that could do this could warn of an early end of life, plan warranty replacements or adjust its limits. Use cases in aviation and grid storage are the same.</p>` },
    { title: "Two baselines to beat", tag: "Baselines", key: "B0007:0", at: 60, base: true,
      body: `<p>A model is only interesting if it beats simple guesses. Two of them are drawn here:</p><ul><li><b>No change</b> (dotted): capacity stays at today's value. Hard to beat over a few cycles.</li><li><b>Straight line</b> (dashed amber): extend the slope of the last 30 cycles. The engineer's default.</li></ul><p>Averaged over cells, they miss by ${ah(m.persistence)} Ah and ${ah(m.linear)} Ah. A ridge regression on the same features gets ${ah(m.ridge)} Ah. The boosted trees get ${ah(m.gbm)} Ah.</p>` },
    { title: "What the model sees", tag: "Features", key: "B0018:0", at: 70,
      body: `<p>${D.labels ? Object.keys(D.labels).length : 23} features, all computed only from discharges before \"now\":</p><ul><li><b>Capacity trend</b>: smoothed capacity, fade so far, slopes over the last 10 and 30 cycles, the straight-line extrapolation, and how far the latest run sits above or below the trend (it catches recovery after rest).</li><li><b>Conditions</b>: ambient temperature, discharge current, cut-off voltage, load type, rest time before the run.</li><li><b>Health signals</b>: electrolyte and charge-transfer resistance from the latest impedance test, constant-current charge time, temperature rise during discharge.</li></ul><p>Removing ${imp.join(", ")} hurts accuracy most.</p>` },
    { title: "Gradient-boosted quantile trees", tag: "Model", key: "B0046:0", at: 25,
      body: `<p>Gradient boosting builds hundreds of small decision trees, each correcting the errors of the ones before. Three models are trained with a quantile loss, for the 10th, 50th and 90th percentile of the outcome. Together they give the median line and the edges of the band.</p><p>Each cell is weighted equally in training, so the 197-cycle cells don't drown out the 28-cycle ones. Trees suit this problem: a few hundred samples per cell, mixed units, interactions (cold and high current behave nothing like warm and gentle) and no need to assume a shape for the fade curve.</p>` },
    { title: "Tested on cells it never saw", tag: "Validation", key: "B0006:0", at: 50,
      body: `<p>Discharges from one cell are strongly correlated, so splitting rows at random would let the model memorise each cell's curve and look far better than it is. Instead, validation is <b>leave-one-cell-out</b>: train on ${M.n_cells - 1} cells, forecast the remaining one, and repeat ${M.n_cells} times.</p><p>That is the question a real deployment faces: a new cell, a new car, no history of its own beyond what it has done so far.</p>` },
    { title: "Honest uncertainty", tag: "Calibration", key: "B0047:0", at: 30,
      body: `<p>Straight out of training, the 10–90% band held only ${pct(M.coverage_raw)} of real outcomes, not 80%. Every new cell differs a little from those the model learned on, and quantile models trained on the same data are overconfident.</p><p>The fix is conformal calibration: for each held-out cell, see how far outcomes fell outside the band on the <i>other</i> cells, and widen the band at each horizon just enough to cover 80% of those misses. After calibration the band holds ${pct(M.coverage)} of outcomes (${pct(bh[5].coverage)} at 5 cycles, ${pct(bh[100].coverage)} at 100). The band widens with horizon, from ±${(bh[5].width_ah / 2).toFixed(2)} Ah to ±${(bh[100].width_ah / 2).toFixed(2)} Ah.</p>` },
    { title: "Results", tag: "Scorecard", key: "B0005:0", at: 90,
      body: `<p>Mean absolute error on unseen cells, averaged per cell:</p><ul><li>No change: ${ah(m.persistence)} Ah</li><li>Straight line: ${ah(m.linear)} Ah</li><li>Ridge regression: ${ah(m.ridge)} Ah</li><li><b>Boosted trees: ${ah(m.gbm)} Ah</b></li></ul><p>The trees beat \"no change\" on ${M.cells_gbm_beats_persistence} of ${M.n_cells} cells and the straight line on ${M.cells_gbm_beats_linear}. The lead grows with horizon: 100 cycles out, the error is ${ah(bh[100].gbm)} Ah against ${ah(bh[100].linear)} Ah for the straight line.</p>` },
    { title: "Where it struggles", tag: "Failures", key: "B0049:0", at: 8,
      body: `<p>Cell 49 is the worst case: a cold cell whose test ended in a software crash, with large unexplained drops. It's short, noisy and unlike any other cell, so the model's error there is about three times its average.</p><p>Elsewhere, on cell 36's slow, steady fade, the straight line wins. On the very flat 44 °C regimes of cells 38–40, \"no change\" wins. The trees are better on average, not everywhere. The per-cell table below shows every case.</p>` },
    { title: "What it can't tell you", tag: "Limits", key: "B0034:0", at: 120,
      body: `<ul><li><b>One cell type, lab conditions.</b> Constant-current cycling of one 18650 model. Another chemistry, format or real driving profile would need new data, or at least checking against it.</li><li><b>Delivered capacity, not health.</b> The target is what the cell gave under that run's load and temperature (chapter 3).</li><li><b>Short horizons.</b> 100 cycles is a few months of daily driving. Forecasting a car's 8-year life needs field data spanning years.</li><li><b>Knees it hasn't seen.</b> A sudden acceleration unlike anything in training will be missed. The bands help, but they can't predict the unprecedented.</li></ul>`,
      hint: "Now pick your own cell from the list and press play." }
  ];
}

function setKey(k, at) {
  if (!REG[k]) k = Object.keys(REG)[0];
  S.key = k; sel.value = k;
  const a = REG[k].r.forecast.anchor;
  const idx = at == null ? Math.floor(a.length / 2) : a.findIndex(x => x >= at);
  S.ai = idx < 0 ? a.length - 1 : idx;
  slider.max = a.length - 1; slider.value = S.ai; syncSlider();
}
function syncSlider() { const a = REG[S.key].r.forecast.anchor; slider.nextElementSibling.textContent = "cycle " + a[S.ai]; }

function onStep(i, st) {
  S.step = i;
  if (!S.user || st.overview) setKey(st.key, st.at);
  stage.cond.textContent = st.overview ? "Out-of-fold forecasts" : st.title;
}

function frame(dt) {
  if (!W || !D) return;
  const T = App.tokens, ctx = cv.begin(), st = STEPS[S.step];
  const { cell, r } = REG[S.key], f = r.forecast, hz = D.horizons;
  if (S.play) {
    S.acc += dt;
    if (S.acc > .12) { S.acc = 0; S.ai = S.ai >= f.anchor.length - 1 ? 0 : S.ai + 1; slider.value = S.ai; syncSlider(); }
  }
  ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
  const vc = r.cap.filter((x, i) => r.valid[i]);
  const c0 = r.cycle[0], cEnd = r.cycle[r.cycle.length - 1];
  const x1 = cEnd + Math.max(25, Math.round((cEnd - c0) * .25));
  const y0 = Math.floor((Math.min(...vc) - .12) * 10) / 10, y1 = Math.ceil((Math.max(...vc) + .04) * 10) / 10;
  const ax = App.axes(ctx, { x: 48, y: 28, w: W - 68, h: H - 66, x0: c0, x1, y0, y1, fy: v => v.toFixed(2), ny: 5, yl: "Delivered capacity (Ah)", xl: "Discharge number" });
  const n = f.anchor[S.ai], cn = f.c_now[S.ai];
  ctx.save(); ctx.beginPath(); ctx.rect(ax.x, ax.y, ax.w, ax.h); ctx.clip();
  // forecast band and median
  const pts = k => [[ax.X(n), ax.Y(cn)], ...hz.map((h, j) => [ax.X(n + h), ax.Y(f[k][S.ai][j])])];
  App.band(ctx, pts("lo"), pts("hi"), T.c1 + "38");
  App.line(ctx, pts("q50"), T.c1, 2.5);
  // baselines
  const s30 = f.slope30[S.ai] || 0, hs = [0, ...hz];
  const lw = st.base ? 2.2 : 1.4;
  App.line(ctx, hs.map(h => [ax.X(n + h), ax.Y(cn * (1 + clamp(s30 * h, -.6, .2)))]), T.c2, lw, [6, 4]);
  App.line(ctx, [[ax.X(n), ax.Y(cn)], [ax.X(n + 100), ax.Y(cn)]], T["stage-muted"], lw, [2, 4]);
  // measured
  r.cycle.forEach((x, i) => {
    const v = r.cap[i]; if (v == null) return;
    const px = ax.X(x), py = ax.Y(v), past = x <= n;
    if (!r.valid[i]) {
      ctx.strokeStyle = past ? T.hi : T["stage-rule"]; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(px - 2.5, py - 2.5); ctx.lineTo(px + 2.5, py + 2.5); ctx.moveTo(px + 2.5, py - 2.5); ctx.lineTo(px - 2.5, py + 2.5); ctx.stroke();
      return;
    }
    ctx.fillStyle = past ? T["stage-fg"] : T["stage-muted"];
    ctx.beginPath(); ctx.arc(px, py, past ? 2.3 : 1.8, 0, 7); ctx.fill();
  });
  ctx.restore();
  // now line and test end
  ctx.strokeStyle = T.hi; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax.X(n) + .5, ax.y); ctx.lineTo(ax.X(n) + .5, ax.y + ax.h); ctx.stroke();
  App.text(ctx, "now", ax.X(n) + 4, ax.y + 8, T.hi);
  if (x1 > cEnd) {
    ctx.fillStyle = "rgba(127,147,158,0.08)"; ctx.fillRect(ax.X(cEnd), ax.y, ax.X(x1) - ax.X(cEnd), ax.h);
    App.text(ctx, "test ended", ax.X(cEnd) + 4, ax.y + ax.h - 10, T["stage-muted"]);
  }
  // legend (wide panels only; phones rely on the step text)
  if (W >= 560) {
  let lx = ax.x + 6; const ly = ax.y + ax.h - 12;
  [["Forecast + 80% band", T.c1, null], ["Straight line", T.c2, [6, 4]], ["No change", T["stage-muted"], [2, 4]]].forEach(([t, c, d]) => {
    App.line(ctx, [[lx, ly], [lx + 18, ly]], c, 2, d); App.text(ctx, t, lx + 24, ly, T["stage-fg"]); ctx.font = App.FONT_MONO; lx += ctx.measureText(t).width + 40;
  });
  }
  // readouts
  const j = hz.indexOf(S.look), target = n + S.look;
  const iT = r.cycle.indexOf(target);
  const meas = iT >= 0 && r.valid[iT] ? r.cap[iT] : null;
  const q = f.q50[S.ai][j], lo = f.lo[S.ai][j], hi = f.hi[S.ai][j];
  stage.setReadouts([
    ["Capacity now", `${cn.toFixed(2)}<small>Ah</small>`],
    [`Forecast +${S.look} cycles`, `${q.toFixed(2)}<small>${lo.toFixed(2)}–${hi.toFixed(2)}</small>`],
    ["Measured then", meas != null ? `${meas.toFixed(2)}<small>${meas >= lo && meas <= hi ? "in band" : "outside band"}</small>` : `–<small>${target > cEnd ? "after test" : "not valid"}</small>`]
  ]);
  stage.where.textContent = `${cell.id} · ${r.ambient_c} °C · ${r.current_a.toFixed(1)} A · cut-off ${cell.cutoff_v} V`;
}

/* ---------- extras ---------- */
function svgLines(series, xs, { w = 1100, h = 380, yMax, yl, fx = String, fy = String }) {
  const L = 56, R = 120, Tp = 16, B = 34, X = x => L + (x - xs[0]) / (xs[xs.length - 1] - xs[0]) * (w - L - R), Y = y => Tp + (1 - y / yMax) * (h - Tp - B);
  let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${yl}">`;
  App.ticks(0, yMax, 5).forEach(v => { s += `<line class="grid" x1="${L}" x2="${w - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${fy(v)}</text>`; });
  xs.forEach(x => { s += `<text x="${X(x)}" y="${h - 12}" text-anchor="middle">${fx(x)}</text>`; });
  series.forEach(({ name, ys, col, dash }) => {
    s += `<polyline class="ln" stroke="${col}" ${dash ? `stroke-dasharray="${dash}"` : ""} points="${ys.map((y, i) => `${X(xs[i])},${Y(y)}`).join(" ")}"/>`;
    s += `<text class="lab" x="${X(xs[xs.length - 1]) + 8}" y="${Y(ys[ys.length - 1]) + 4}">${name}</text>`;
  });
  return s + `<text x="${L}" y="10">${yl}</text></svg>`;
}

function buildExtras(host) {
  const m = M.mae_ah_cell_avg, hz = M.by_h.map(r => r.h);
  const ser = [
    { name: "No change", key: "persistence", col: "var(--muted)", dash: "2 4" },
    { name: "Straight line", key: "linear", col: "#d9a95a", dash: "6 4" },
    { name: "Ridge", key: "ridge", col: "#6f9cf0" },
    { name: "Boosted trees", key: "gbm", col: "var(--accent)" }
  ].map(s => ({ ...s, ys: M.by_h.map(r => r[s.key]) }));
  const yMax = Math.ceil(Math.max(...ser.flatMap(s => s.ys)) * 20) / 20;
  const imp = M.importance.slice(0, 12), iMax = imp[0].mae_increase_ah;
  const W2 = 760, left = 270, rowH = 26;
  let svgI = `<svg class="chart" viewBox="0 0 ${W2} ${imp.length * rowH + 8}" role="img" aria-label="Permutation feature importance">`;
  imp.forEach((d, i) => {
    const w = d.mae_increase_ah / iMax * (W2 - left - 90), y = i * rowH + 4;
    svgI += `<text x="0" y="${y + 15}" style="fill:var(--fg)">${D.labels[d.feature]}</text><rect x="${left}" y="${y + 3}" width="${Math.max(1, w)}" height="16" rx="2" fill="var(--accent)"></rect><text x="${left + w + 6}" y="${y + 15}">+${(d.mae_increase_ah * 1000).toFixed(1)} mAh</text>`;
  });
  svgI += `</svg>`;
  const best = r => Object.entries({ persistence: r.persistence, linear: r.linear, ridge: r.ridge, gbm: r.gbm }).sort((a, b) => a[1] - b[1])[0][0];
  const cellRows = M.per_cell.slice().sort((a, b) => a.cell.localeCompare(b.cell)).map(r => {
    const b = best(r), td = k => `<td class="num"${k === b ? ' style="color:var(--accent);font-weight:600"' : ""}>${r[k].toFixed(3)}</td>`;
    return `<tr><td>${r.cell}</td>${td("persistence")}${td("linear")}${td("ridge")}${td("gbm")}</tr>`;
  }).join("");
  host.innerHTML = `<span class="label">Model card</span><h2>How well it works</h2>
    <p class="lede">All numbers are from leave-one-cell-out cross-validation: each cell scored by a model trained only on the other ${M.n_cells - 1}. Error is mean absolute error in amp-hours (the cells are rated at 2 Ah), averaged within each cell first so long tests don't dominate.</p>
    <div class="cards">
      <div class="card"><span class="k">Boosted trees</span><span class="v">${m.gbm.toFixed(3)}</span><span class="s">Ah mean abs. error</span></div>
      <div class="card"><span class="k">Straight line</span><span class="v">${m.linear.toFixed(3)}</span><span class="s">Ah (${(m.linear / m.gbm).toFixed(1)}× the trees)</span></div>
      <div class="card"><span class="k">No change</span><span class="v">${m.persistence.toFixed(3)}</span><span class="s">Ah (${(m.persistence / m.gbm).toFixed(1)}× the trees)</span></div>
      <div class="card"><span class="k">80% band holds</span><span class="v">${pct(M.coverage)}</span><span class="s">of outcomes (${pct(M.coverage_raw)} before calibration)</span></div>
    </div>
    <h3>Error by forecast horizon</h3>
    <p class="lede">All rows, not cell-averaged. Every method gets worse further out; the trees degrade slowest.</p>
    <div class="scroll-x">${svgLines(ser, hz, { yMax, yl: "Mean absolute error (Ah) vs cycles ahead", fy: v => v.toFixed(2) })}</div>
    <div class="scroll-x"><table><thead><tr><th>Cycles ahead</th><th class="num">Examples</th><th class="num">No change</th><th class="num">Straight line</th><th class="num">Ridge</th><th class="num">Trees</th><th class="num">Band coverage</th><th class="num">Band width Ah</th></tr></thead><tbody>
    ${M.by_h.map(r => `<tr><td>${r.h}</td><td class="num">${App.fmt(r.n)}</td><td class="num">${r.persistence.toFixed(3)}</td><td class="num">${r.linear.toFixed(3)}</td><td class="num">${r.ridge.toFixed(3)}</td><td class="num">${r.gbm.toFixed(3)}</td><td class="num">${pct(r.coverage)}</td><td class="num">${r.width_ah.toFixed(3)}</td></tr>`).join("")}
    </tbody></table></div>
    <h3>What it relies on</h3>
    <p class="lede">Permutation importance for the final median model: how much the error rises when one feature's values are shuffled. This measures reliance, not cause. Correlated features (the slopes and the straight-line term) share credit.</p>
    <div class="scroll-x">${svgI}</div>
    <h3>Every held-out cell</h3>
    <p class="lede">Mean absolute error (Ah) when that cell was held out. The best method for each cell is highlighted.</p>
    <div class="scroll-x"><table><thead><tr><th>Cell</th><th class="num">No change</th><th class="num">Straight line</th><th class="num">Ridge</th><th class="num">Trees</th></tr></thead><tbody>${cellRows}</tbody></table></div>
    <h3>Reproduce it</h3>
    <p class="lede">The code is in <code>battery-model/</code>. <code>pip install -e ".[dev]"</code>, then <code>python -m bde.train</code> retrains from the committed cycle table and rewrites this page's data; <code>python -m bde.train --raw &lt;dir&gt;</code> rebuilds the table from NASA's .mat files. <code>pytest</code> checks the cleaning, that features never use future data, and that validation is grouped by cell.</p>`;
}

App.register({
  id: "model", nav: "Forecaster",
  build() {
    ui = this.ui = App.section(this);
    D = window.BDE_DATA; M = D && D.metrics;
    if (!D) {
      ui.steps.innerHTML = `<p class="note" style="padding-top:40px">Model data not found. Run <code>python -m bde.train</code> in <code>battery-model/</code>.</p>`;
      this.frame = null; return;
    }
    regimes();
    const opts = Object.entries(REG).map(([k, { cell, r }]) => `<option value="${k}">${cell.id} · ${r.ambient_c} °C, ${r.current_a.toFixed(0)} A</option>`).join("");
    stage = App.stage(ui.stageHost, { title: "Capacity forecast", aspect: "16 / 11",
      controls: `<select class="sel" id="mdPick" aria-label="Cell">${opts}</select>${App.slider("mdNow", "Now", 0, 10, 1, 0, true)}<button class="ctrl-btn" id="mdPlay" type="button" aria-pressed="false">Play</button>
        <span class="rng">Look ahead ${App.seg("mdLook", [[10, "10"], [30, "30"], [50, "50"], [100, "100"]].map(([v, l]) => [String(v), l]), "50")}</span>` });
    cv = stage.cv;
    const where = document.createElement("div"); where.className = "ro-where"; where.innerHTML = `<span class="where"></span>`;
    stage.root.querySelector(".controls").after(where); stage.where = where.firstChild;
    sel = ui.stageHost.querySelector("#mdPick"); slider = ui.stageHost.querySelector("#mdNow"); playBtn = ui.stageHost.querySelector("#mdPlay");
    sel.addEventListener("change", () => { S.user = true; setKey(sel.value, null); });
    slider.addEventListener("input", () => { S.user = true; S.ai = +slider.value; syncSlider(); });
    playBtn.addEventListener("click", () => { S.play = !S.play; playBtn.setAttribute("aria-pressed", String(S.play)); playBtn.textContent = S.play ? "Pause" : "Play"; });
    setLook = App.bindSeg(ui.stageHost, "mdLook", v => { S.look = +v; });
    STEPS = makeSteps();
    setKey(STEPS[0].key, STEPS[0].at);
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    buildExtras(ui.extras);
  },
  resize() { if (cv) { cv.fit(); W = cv.w; H = cv.h; } },
  frame
});
})();
