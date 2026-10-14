/* Chapter: Materials. A composite-era airliner coloured by what it is made of. */
(() => {
"use strict";
const { lerp, r3: R3 } = App;

// Mid-tone colours that read on the dark stage and on both page themes.
const MAT = {
  cfrp: { name: "Carbon fibre composite", short: "Composites", col: "#4f86e8" },
  al: { name: "Aluminium alloys", short: "Aluminium", col: "#a3afb8" },
  ti: { name: "Titanium alloys", short: "Titanium", col: "#a77bd9" },
  steel: { name: "Steel", short: "Steel", col: "#d99a3f" },
  gfrp: { name: "Glass fibre composite", short: "Other", col: "#3fb39a" },
  other: { name: "Other", short: "Other", col: "#6b7780" }
};
const PART_MAT = { fuselage: "cfrp", tailcone: "cfrp", wing: "cfrp", flap: "cfrp", aileron: "cfrp", spoiler: "cfrp", hstab: "cfrp", elevator: "cfrp", fin: "cfrp", rudder: "cfrp", nacelle: "cfrp", slat: "al", inlet: "al", radome: "gfrp", pylon: "ti", gear: "steel", fan: null };

const STEPS = [
  { overview: true, kicker: "Chapter 5", title: "Materials", hl: "all",
    tagline: "Every part of an airliner is a compromise between strength, stiffness, weight, heat, cost and how it ages.",
    body: "<p>For forty years airliners were mostly aluminium. The latest wide-bodies are about half carbon fibre composite by structural weight, with titanium, aluminium and steel used where each does a job composites can't.</p><p>The aircraft on the right is coloured the way a current composite wide-body is built. Each step picks out one material.</p>",
    facts: [["Composites", "About 50% of structure on the latest wide-bodies"], ["Aluminium", "About 70% on the previous generation"], ["Hottest metal", "Turbine blades near 1,100 °C"]],
    ro: [["Composite share", "~50<small>%</small>"], ["Aluminium share", "~20<small>%</small>"], ["Titanium share", "~15<small>%</small>"]] },
  { title: "Why weight matters", tag: "The snowball", hl: "all",
    body: "<p>Every kilogram of structure needs lift to hold it up, lift costs drag, drag costs thrust, and thrust costs fuel, which itself has to be carried. A heavier structure means a bigger wing, bigger engines and more fuel, all of which add more weight.</p><p>So designers prize specific strength (strength divided by density) and specific stiffness. That is where composites shine, and why the chart below the drawing matters more than raw strength.</p>",
    ro: [["Fuel per flight", "~35<small>% of take-off weight, long haul</small>"], ["Structure", "~30<small>% of take-off weight</small>"], ["Payload", "~15–20<small>%</small>"]] },
  { title: "Aluminium alloys", tag: "Al", hl: ["al"],
    body: "<p>Aluminium alloyed with copper, zinc or lithium is light, cheap, easy to shape and well understood. Different alloys suit different loads: tough, crack-resistant 2024 for fuselage skins and lower wings, which are in tension; stronger 7075 and 7050 for upper wing skins, which are in compression. Newer aluminium-lithium alloys are a few percent lighter and stiffer.</p><p>Its weaknesses are corrosion and fatigue cracking, which drive regular inspections. On composite aircraft it remains in leading edges and engine inlet lips, where impact and de-icing heat favour metal.</p>",
    ro: [["Density", "2.8<small>g/cm³</small>"], ["Tensile strength", "480–570<small>MPa</small>"], ["Max temperature", "~120<small>°C</small>"]] },
  { title: "Carbon fibre composite", tag: "CFRP", hl: ["cfrp"],
    body: "<p>Carbon fibres, each thinner than a hair and stronger than steel along their length, are set in epoxy resin and laid up in layers (plies) pointing in the directions the loads run. The part is then cured in an autoclave at about 180 °C and 7 bar. Whole fuselage sections can be made as single barrels, removing thousands of fasteners.</p><p>Composites don't corrode or crack from fatigue like metals, which also allows higher cabin humidity and pressure. The trade-offs: impact damage can hide below an undamaged-looking surface, lightning protection needs embedded copper mesh, and repairs are specialised work.</p>",
    ro: [["Density", "1.6<small>g/cm³</small>"], ["Tensile strength", "~600<small>MPa, all directions</small>"], ["Along the fibre", "1,500+<small>MPa</small>"]] },
  { title: "Titanium", tag: "Ti", hl: ["ti"],
    body: "<p>Titanium alloy (mostly Ti-6Al-4V) is nearly as strong as steel at 60% of the weight, keeps its strength to around 400 °C and barely corrodes. It is used for engine pylons and mounts, highly loaded fittings, fan blades and compressor parts.</p><p>It also partners with carbon fibre: aluminium touching carbon fibre corrodes galvanically, titanium doesn't. So the more composite an aircraft has, the more titanium joins it. It is expensive and hard to machine.</p>",
    ro: [["Density", "4.4<small>g/cm³</small>"], ["Tensile strength", "~950<small>MPa</small>"], ["Max temperature", "~400<small>°C</small>"]] },
  { title: "Steel", tag: "Fe", hl: ["steel"],
    body: "<p>Where load is enormous and space is tight, nothing beats ultra-high-strength steel. Landing gear legs, flap tracks, engine mounts and many fasteners are steel such as 300M, heat-treated to nearly 2,000 MPa.</p><p>Steel is the heaviest material on the aircraft, so it is used sparingly: about a tenth of the structure.</p>",
    ro: [["Density", "7.8<small>g/cm³</small>"], ["Tensile strength", "~1,930<small>MPa</small>"], ["Main use", "landing gear"]] },
  { title: "Glass fibre and others", tag: "GFRP", hl: ["gfrp"],
    body: "<p>Glass fibre composite is weaker than carbon but transparent to radio waves, so the nose radome over the weather radar is made from it, as are many fairings and antenna covers. Cabin floors, panels and bins use honeycomb sandwich panels; windows are stretched acrylic.</p>",
    ro: [["Density", "1.9<small>g/cm³</small>"], ["Radar", "transparent"], ["Windows", "stretched acrylic"]] },
  { title: "The hot section", tag: "Ni + CMC", hl: ["engine"],
    body: "<p>Inside the engines, gas reaching the turbine is hotter than the melting point of any practical metal. Turbine blades are nickel superalloys grown as a single crystal, with no grain boundaries to creep apart, coated with ceramic and riddled with cooling holes. They run with metal near 1,100 °C while spinning at over 10,000 rpm.</p><p>Newer engines add ceramic matrix composites (silicon carbide fibre in silicon carbide), a third the density of nickel and good to about 1,300 °C. See the Engines chapter for where those temperatures come from.</p>",
    ro: [["Superalloy density", "8.2<small>g/cm³</small>"], ["Blade metal temp.", "~1,100<small>°C</small>"], ["CMC limit", "~1,300<small>°C</small>"]] }
];

const S = { step: 0, t: 0, cam: { az: -2.4, el: .25, dist: 60 }, mix: {} };
let ui, stage, cv, W = 0, H = 0, faces;

function onStep(i, st) { S.step = i; stage.setReadouts(st.ro); stage.cond.textContent = st.overview ? "Drag to rotate" : st.title; S.cam.user = false; }

function legendHtml() {
  return ["cfrp", "al", "ti", "steel", "gfrp"].map(k => `<span><i class="swatch" style="background:${MAT[k].col}"></i>${MAT[k].name.split(" ")[0] === "Carbon" ? "Carbon fibre" : MAT[k].name.split(" ")[0] === "Glass" ? "Glass fibre" : MAT[k].short}</span>`).join("");
}

function buildExtras(host) {
  const shares = [
    { n: "777 (1995)", v: { cfrp: 11, al: 70, ti: 7, steel: 11, other: 1 } },
    { n: "787 (2011)", v: { cfrp: 50, al: 20, ti: 15, steel: 10, other: 5 } },
    { n: "A350 (2015)", v: { cfrp: 53, al: 19, ti: 14, steel: 6, other: 8 } }
  ];
  const props = [
    ["Aluminium 2024-T3", "al", 2.78, 480, 120, "Fuselage skin, lower wing"],
    ["Aluminium 7075-T6", "al", 2.81, 570, 120, "Upper wing, frames"],
    ["Titanium Ti-6Al-4V", "ti", 4.43, 950, 400, "Pylons, fittings, fan blades"],
    ["Steel 300M", "steel", 7.83, 1930, 300, "Landing gear, flap tracks"],
    ["Carbon/epoxy laminate", "cfrp", 1.58, 600, 120, "Fuselage, wings, tail"],
    ["Glass/epoxy laminate", "gfrp", 1.9, 350, 120, "Radome, fairings"],
    ["Nickel alloy 718", "other", 8.19, 1375, 650, "Turbine discs, casings"]
  ];
  const order = ["cfrp", "al", "ti", "steel", "other"];
  const W = 760, left = 120, rowH = 44, top = 10, Hs = top + shares.length * rowH + 30;
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${Hs}" role="img" aria-label="Share of structural weight by material for three airliners">`;
  shares.forEach((s, i) => {
    const y = top + i * rowH;
    svg += `<text class="rowname" x="0" y="${y + 20}">${s.n}</text>`;
    let x = left;
    order.forEach(k => {
      const w = s.v[k] / 100 * (W - left - 10);
      svg += `<rect x="${x}" y="${y + 4}" width="${Math.max(0, w - 1)}" height="22" fill="${MAT[k].col}"></rect>`;
      if (s.v[k] >= 6) svg += `<text class="inbar" x="${x + 6}" y="${y + 20}" style="fill:#0c1317">${s.v[k]}%</text>`;
      x += w;
    });
  });
  [0, 25, 50, 75, 100].forEach(p => { const x = left + p / 100 * (W - left - 10); svg += `<text x="${x}" y="${Hs - 6}" text-anchor="middle">${p}%</text>`; });
  svg += `</svg>`;
  const maxSS = Math.max(...props.map(p => p[3] / p[2]));
  const W2 = 760, left2 = 200, rowH2 = 30, Hs2 = props.length * rowH2 + 30;
  let svg2 = `<svg class="chart" viewBox="0 0 ${W2} ${Hs2}" role="img" aria-label="Specific strength of aerospace materials">`;
  props.slice().sort((a, b) => b[3] / b[2] - a[3] / a[2]).forEach((p, i) => {
    const ss = p[3] / p[2], y = i * rowH2 + 4, w = ss / 400 * (W2 - left2 - 60);
    svg2 += `<text x="0" y="${y + 16}" style="fill:var(--fg)">${p[0]}</text><rect x="${left2}" y="${y + 3}" width="${w}" height="18" rx="2" fill="${MAT[p[1]].col}"></rect><text x="${left2 + w + 6}" y="${y + 16}">${Math.round(ss)}</text>`;
  });
  [0, 100, 200, 300, 400].forEach(v => { const x = left2 + v / 400 * (W2 - left2 - 60); svg2 += `<text x="${x}" y="${Hs2 - 4}" text-anchor="middle">${v}</text>`; });
  svg2 += `</svg>`;
  host.innerHTML = `<span class="label">Reference</span><h2>What airliners are made of</h2>
    <p class="lede">Share of structural weight by material, from manufacturer figures. Composites went from a tenth of the structure to over half in one generation.</p>
    <div class="scroll-x">${svg}</div>
    <p class="lede" style="display:flex;gap:16px;flex-wrap:wrap">${order.map(k => `<span><i class="swatch" style="background:${MAT[k].col}"></i>${k === "other" ? "Other" : MAT[k].short}</span>`).join("")}</p>
    <h3>Strength for its weight</h3>
    <p class="lede">Specific strength: tensile strength divided by density, in kN·m/kg. Typical room-temperature values; composite laminates are quasi-isotropic (fibres in four directions).</p>
    <div class="scroll-x">${svg2}</div>
    <div class="scroll-x"><table><thead><tr><th>Material</th><th class="num">Density g/cm³</th><th class="num">Strength MPa</th><th class="num">Max service °C</th><th>Typical use</th></tr></thead><tbody>
    ${props.map(p => `<tr><td><i class="swatch" style="background:${MAT[p[1]].col}"></i>${p[0]}</td><td class="num">${p[2]}</td><td class="num">${App.fmt(p[3])}</td><td class="num">~${p[4]}</td><td>${p[5]}</td></tr>`).join("")}
    </tbody></table></div>`;
}

App.register({
  id: "materials", nav: "Materials",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Built from", aspect: "16 / 10", controls: `<span class="ctl-row" style="gap:14px">${legendHtml()}</span>` });
    cv = stage.cv;
    App.orbit(cv.el, S.cam);
    faces = App.geo.build({ gear: true, flap: 0 });
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    buildExtras(ui.extras);
  },
  activate() { this.resize(); },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame(dt) {
    if (!W) return;
    S.t += dt;
    if (!S.cam.user) S.cam.az += dt * .12;
    const st = STEPS[S.step], T = App.tokens;
    // fade each part toward its target colour
    const dim = App.hex("#3a4750");
    for (const f of faces) {
      const m = PART_MAT[f.part];
      let target;
      if (m === null) target = [28, 34, 38];
      else if (st.hl === "all") target = App.hex(MAT[m].col);
      else if (st.hl[0] === "engine") target = ["nacelle", "inlet"].includes(f.part) ? App.hex("#ff7a59") : dim;
      else target = st.hl.includes(m) ? App.hex(MAT[m].col) : dim;
      const cur = S.mix[f.part + m] || target;
      S.mix[f.part + m] = cur.map((v, i) => lerp(v, target[i], Math.min(1, dt * 4)));
    }
    const ctx = cv.begin();
    ctx.fillStyle = T["stage-bg"]; ctx.fillRect(0, 0, W, H);
    const cam = R3.cam({ ...S.cam, zoom: .95, target: [0, 0, -1] }, W, H);
    R3.faces(ctx, cam, faces, f => S.mix[f.part + PART_MAT[f.part]]);
  }
});
})();
