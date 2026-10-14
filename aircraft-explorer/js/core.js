/* Shared runtime: helpers, chapter router, scroll-driven steps, stage builder,
   a small flat-shaded 3D renderer and a parametric single-aisle airliner model. */
(() => {
"use strict";
const App = window.App = { chapters: [], active: null, tokens: {} };

/* ---------- helpers ---------- */
App.at = (p, x) => {
  if (typeof p === "number") return p;
  const n = p.length;
  if (x <= p[0][0]) return p[0][1];
  for (let i = 1; i < n; i++) {
    if (x <= p[i][0]) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      return x1 === x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return p[n - 1][1];
};
App.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
App.lerp = (a, b, t) => a + (b - a) * t;
App.fmt = n => Math.round(n).toLocaleString("en-US");
App.hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
App.rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
App.deg = Math.PI / 180;
App.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
App.$ = (sel, root = document) => root.querySelector(sel);

const TOKEN_NAMES = ["bg","fg","muted","rule","accent","accent-soft","stage-bg","stage-panel","stage-fg","stage-muted","stage-rule","metal","metal-hi","hub","lp","hp","hi","airframe"];
App.readTokens = () => {
  const cs = getComputedStyle(document.documentElement);
  TOKEN_NAMES.forEach(k => App.tokens[k] = cs.getPropertyValue("--" + k).trim());
};

/* ---------- stage ---------- */
// Builds the dark instrument panel used by every chapter.
App.stage = (host, { title = "", cond = "", controls = "", aspect = "2 / 1", extraCanvas = false, readouts = 3 }) => {
  host.innerHTML = `<div class="stage">
    <div class="stage-head"><span class="stage-title">${title}</span><span class="stage-cond">${cond}</span></div>
    <canvas class="stage-cv" style="aspect-ratio:${aspect}"></canvas>
    ${controls ? `<div class="controls">${controls}</div>` : ""}
    ${extraCanvas ? `<canvas class="sub-cv" aria-hidden="true"></canvas><div class="ro-where"><span class="where"></span><span class="keyline"></span></div>` : ""}
    <div class="readouts">${Array.from({ length: readouts }, () => `<div class="ro"><span class="k"></span><span class="v"></span></div>`).join("")}</div>
  </div>`;
  const st = {
    root: host.firstElementChild,
    title: host.querySelector(".stage-title"),
    cond: host.querySelector(".stage-cond"),
    cv: App.canvas(host.querySelector(".stage-cv")),
    sub: extraCanvas ? App.canvas(host.querySelector(".sub-cv")) : null,
    where: host.querySelector(".where"),
    keyline: host.querySelector(".keyline"),
    ro: [...host.querySelectorAll(".ro")].map(el => ({ k: el.querySelector(".k"), v: el.querySelector(".v") }))
  };
  st.setReadouts = rows => rows.forEach(([k, v], i) => {
    if (!st.ro[i]) return;
    if (st.ro[i].k.textContent !== k) st.ro[i].k.textContent = k;
    // the display face draws "~" almost like a minus sign, so set "approximately" in the mono face
    if (st.ro[i].v._v !== v) { st.ro[i].v.innerHTML = v.replace(/^~/, '<span class="approx">≈</span>'); st.ro[i].v._v = v; }
  });
  return st;
};

App.canvas = el => {
  const c = { el, ctx: el.getContext("2d"), w: 0, h: 0, dpr: 1 };
  c.fit = () => {
    const r = el.getBoundingClientRect();
    c.dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.w = r.width; c.h = r.height;
    el.width = Math.max(1, Math.round(c.w * c.dpr)); el.height = Math.max(1, Math.round(c.h * c.dpr));
  };
  c.begin = () => { c.ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0); return c.ctx; };
  return c;
};

/* ---------- scroll-driven steps ---------- */
App.defaultStep = (st, i, n) => {
  if (st.overview) {
    return `<span class="label">${st.kicker || ""}</span><h2>${st.title}</h2>${st.tagline ? `<p class="tagline">${st.tagline}</p>` : ""}${st.body}
      ${st.facts ? `<dl class="facts">${st.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>` : ""}
      <p class="hint">${st.hint || "Scroll to step through it. The panel follows along."}</p>`;
  }
  return `<p class="stn"><b>${st.tag || ""}</b><span class="label">${i} / ${n - 1}</span></p>
    <h3>${st.title}</h3>${st.body}${st.hint ? `<p class="hint">${st.hint}</p>` : ""}${st.extra || ""}`;
};
App.scrolly = (stepsEl, steps, onStep, render = App.defaultStep) => {
  const s = { cur: -1, steps };
  s.render = (list) => {
    s.steps = list || s.steps; s.cur = -1;
    stepsEl.innerHTML = s.steps.map((st, i) => `<article class="step" data-i="${i}"><div class="step-in">${render(st, i, s.steps.length)}</div></article>`).join("");
  };
  s.set = i => {
    if (i === s.cur) return;
    s.cur = i;
    stepsEl.querySelectorAll(".step").forEach(el => el.classList.toggle("active", +el.dataset.i === i));
    onStep(i, s.steps[i]);
  };
  s.update = () => {
    const els = stepsEl.querySelectorAll(".step");
    if (!els.length) return;
    const narrow = window.matchMedia("(max-width: 880px)").matches;
    const ref = window.innerHeight * (narrow ? .76 : .5);
    let best = 0, bestD = Infinity;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      const d = r.top <= ref && r.bottom >= ref ? 0 : Math.min(Math.abs(r.top - ref), Math.abs(r.bottom - ref));
      if (d < bestD) { bestD = d; best = +el.dataset.i; }
    });
    s.set(best);
  };
  s.goto = i => {
    const el = stepsEl.querySelector(`.step[data-i="${i}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: App.reduceMotion ? "auto" : "smooth" });
  };
  s.render();
  return s;
};

/* Chapter section skeleton: steps column + sticky stage + extras below. */
App.section = (ch) => {
  const sec = document.createElement("section");
  sec.className = "chapter"; sec.id = "ch-" + ch.id; sec.hidden = true;
  sec.innerHTML = `<div class="wrap explorer"><div class="steps"></div><div class="stage-col"></div></div><div class="wrap extras"></div>`;
  document.getElementById("chapters").appendChild(sec);
  return { sec, steps: sec.querySelector(".steps"), stageHost: sec.querySelector(".stage-col"), extras: sec.querySelector(".extras") };
};

/* Pointer drag to orbit a 3D camera. */
App.orbit = (el, cam, onMove) => {
  let drag = null;
  el.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el }; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", e => {
    if (!drag) return;
    cam.az = drag.az - (e.clientX - drag.x) * .01;
    cam.el = App.clamp(drag.el + (e.clientY - drag.y) * .008, -1.2, 1.4);
    cam.user = true; onMove && onMove();
  });
  const end = () => { drag = null; };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  el.style.touchAction = "pan-y";
  el.style.cursor = "grab";
};

/* ---------- 3D ---------- */
const R3 = App.r3 = {};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
R3.dot = dot; R3.sub = sub; R3.cross = cross; R3.norm = norm;

// Camera orbiting the origin. az measured from +x (nose) toward +y (right wing).
R3.cam = (c, W, H) => {
  const C = [c.dist * Math.cos(c.el) * Math.cos(c.az), c.dist * Math.cos(c.el) * Math.sin(c.az), c.dist * Math.sin(c.el)];
  const t = c.target || [0, 0, 0];
  const P = [C[0] + t[0], C[1] + t[1], C[2] + t[2]];
  const f = norm(sub(t, P));
  // x forward, y right wing, z up is left-handed, so build the basis to match
  let r = cross([0, 0, 1], f);
  if (Math.hypot(...r) < 1e-6) r = [0, 1, 0];
  r = norm(r);
  const u = cross(f, r);
  return { P, f, r, u, W, H, F: (c.zoom || 1) * Math.min(W * 1.15, H * 2.3), cx: W / 2 + (c.ox || 0) * W, cy: H / 2 + (c.oy || 0) * H };
};
R3.proj = (cm, p) => {
  const d = sub(p, cm.P);
  const z = dot(d, cm.f);
  return [cm.cx + dot(d, cm.r) * cm.F / z, cm.cy - dot(d, cm.u) * cm.F / z, z];
};
// Body attitude: roll phi (right wing down +), pitch theta (nose up +), yaw psi (nose right +).
R3.att = (a) => {
  const cf = Math.cos(a.phi || 0), sf = Math.sin(a.phi || 0), ct = Math.cos(a.theta || 0), stt = Math.sin(a.theta || 0), cp = Math.cos(a.psi || 0), sp = Math.sin(a.psi || 0);
  return p => {
    // roll about x
    let x = p[0], y = p[1] * cf + p[2] * sf, z = p[2] * cf - p[1] * sf;
    // pitch about y
    const x2 = x * ct - z * stt, z2 = x * stt + z * ct; x = x2; z = z2;
    // yaw about z (nose toward +y)
    const x3 = x * cp - y * sp, y3 = x * sp + y * cp;
    return [x3, y3, z];
  };
};
const LIGHT = norm([.35, -.45, 1]);
R3.faces = (ctx, cm, faces, colorOf, xf) => {
  const list = [];
  for (const f of faces) {
    const pw = xf ? f.p.map(xf) : f.p;
    const pr = pw.map(p => R3.proj(cm, p));
    if (pr.some(q => q[2] < .5)) continue;
    let depth = 0; pr.forEach(q => depth += q[2]); depth /= pr.length;
    const n = norm(cross(sub(pw[1], pw[0]), sub(pw[pw.length > 3 ? 3 : 2], pw[0])));
    const col = colorOf(f);
    if (!col) continue;
    list.push({ pr, depth, shade: .5 + .5 * Math.abs(dot(n, LIGHT)), col, a: f.a ?? col[3] ?? 1 });
  }
  list.sort((a, b) => b.depth - a.depth);
  for (const it of list) {
    const c = it.col, k = it.shade;
    const s = `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${it.a})`;
    ctx.fillStyle = s; ctx.strokeStyle = s; ctx.lineWidth = .8;
    ctx.beginPath();
    it.pr.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
};
R3.lines = (ctx, cm, lines, styleOf, xf) => {
  const groups = new Map();
  for (const l of lines) {
    const st = styleOf(l);
    if (!st) continue;
    const key = st.join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  // draw dim groups first, bright last
  const keys = [...groups.keys()].sort((a, b) => parseFloat(a.split("|")[1]) - parseFloat(b.split("|")[1]));
  ctx.lineCap = "round";
  for (const key of keys) {
    const [color, width] = key.split("|");
    ctx.strokeStyle = color; ctx.lineWidth = +width;
    ctx.beginPath();
    for (const l of groups.get(key)) {
      const a = R3.proj(cm, xf ? xf(l.a) : l.a), b = R3.proj(cm, xf ? xf(l.b) : l.b);
      if (a[2] < .5 || b[2] < .5) continue;
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  }
};
R3.arrow = (ctx, cm, from, to, color, label, width = 2.5) => {
  const a = R3.proj(cm, from), b = R3.proj(cm, to);
  if (a[2] < .5 || b[2] < .5) return;
  App.arrow2d(ctx, a[0], a[1], b[0], b[1], color, width);
  if (label) {
    ctx.font = "600 13px 'Saira Condensed', sans-serif"; ctx.fillStyle = color;
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    ctx.textAlign = dx / l > .3 ? "left" : dx / l < -.3 ? "right" : "center";
    ctx.fillText(label, b[0] + dx / l * 10, b[1] + dy / l * 10 + 4);
  }
};
App.arrow2d = (ctx, x0, y0, x1, y1, color, width = 2) => {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy);
  if (l < 2) return;
  const ux = dx / l, uy = dy / l, h = Math.min(12, l * .4) + width;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * h * .6, y1 - uy * h * .6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * h - uy * h * .45, y1 - uy * h + ux * h * .45);
  ctx.lineTo(x1 - ux * h + uy * h * .45, y1 - uy * h - ux * h * .45);
  ctx.closePath(); ctx.fill();
};
App.label = (ctx, text, x, y, color, align = "left", size = 11) => {
  ctx.font = `${size}px 'IBM Plex Mono', monospace`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
};

/* ---------- airliner geometry (metres; x forward, y right wing, z up) ----------
   Proportions follow a 150–180 seat single-aisle jet: 37.6 m long, 35.8 m span. */
const G = App.geo = {};
const D = App.deg;
G.R0 = 1.98;
G.fus = x => {
  const R0 = G.R0;
  if (x > 13) { const t = Math.min(1, (18.8 - x) / 5.8); const r = R0 * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))); return { r, zc: -.45 * Math.pow(1 - t, 1.5) }; }
  if (x >= -9) return { r: R0, zc: 0 };
  const t = Math.min(1, (-9 - x) / 9.8); const r = R0 * (1 - .85 * Math.pow(t, 1.3)); return { r, zc: (R0 - r) * .8 };
};
G.FX = (() => { const xs = []; for (let x = 18.8; x > 13; x -= .55) xs.push(x); for (let x = 13; x > -9; x -= 2) xs.push(x); for (let x = -9; x >= -18.8; x -= .98) xs.push(x); xs.push(-18.8); return xs; })();
G.y0 = 1.7; G.yk = 6.3; G.y1 = 17;
G.wLE = y => 3.4 - (y - G.y0) * Math.tan(27 * D);
G.wTE = y => y < G.yk ? -2.7 - (y - G.y0) / (G.yk - G.y0) * .6 : -3.3 - (y - G.yk) / (G.y1 - G.yk) * 2.5;
G.wZ = y => -.9 + (y - G.y0) * Math.tan(5 * D);
G.wPt = (y, f, bend = 0) => {
  const le = G.wLE(y), te = G.wTE(y);
  const k = (y - G.y0) / (G.y1 - G.y0);
  return [le + f * (te - le), y, G.wZ(y) + bend * k * k];
};
G.WY = [1.7, 3, 5, 6.3, 8, 10, 12, 12.5, 14.5, 16.5, 17];
G.WF = [0, .12, .6, .75, 1];
G.hsLE = y => -14.0 - (y - .5) * Math.tan(30 * D);
G.hsC = y => 3.6 + (1.4 - 3.6) * (y - .5) / 5.7;
G.hsZ = y => 1.0 + (y - .5) * Math.tan(6 * D);
G.fnLE = z => -11.4 - (z - 1.6) * Math.tan(34 * D);
G.fnC = z => 5.8 + (2.0 - 5.8) * (z - 1.6) / 5.9;
G.NAC = { y: 5.75, z: -2.0, xs: [4.8, 4.3, 2.5, .7], rs: [1.0, 1.08, 1.05, .75] };

// Rotate (dx, dz) about a hinge in the x–z plane.
const hingeXZ = (p, hx, hz, a) => { const dx = p[0] - hx, dz = p[2] - hz; return [hx + dx * Math.cos(a) - dz * Math.sin(a), p[1], hz + dx * Math.sin(a) + dz * Math.cos(a)]; };

/* Solid model. o = { ail, elev, rud, flap, slat, spoil, stab (deg), gear, winglet, bend } */
G.build = (o = {}) => {
  const F = [];
  const add = (p, part) => F.push({ p, part });
  // fuselage
  const N = 18, xs = G.FX;
  const ring = x => { const { r, zc } = G.fus(x); return Array.from({ length: N }, (_, i) => { const a = i / N * Math.PI * 2; return [x, Math.cos(a) * r * 1.0, zc + Math.sin(a) * r]; }); };
  let prev = ring(xs[0]);
  for (let i = 1; i < xs.length; i++) {
    const cur = ring(xs[i]);
    const part = xs[i - 1] > 16.6 ? "radome" : xs[i] < -11.6 ? "tailcone" : "fuselage";
    for (let j = 0; j < N; j++) { const k = (j + 1) % N; add([prev[j], prev[k], cur[k], cur[j]], part); }
    prev = cur;
  }
  // wings
  const bend = o.bend || 0;
  for (const s of [1, -1]) {
    for (let i = 0; i < G.WY.length - 1; i++) {
      const ya = G.WY[i], yb = G.WY[i + 1], ym = (ya + yb) / 2;
      for (let j = 0; j < G.WF.length - 1; j++) {
        const fa = G.WF[j], fb = G.WF[j + 1];
        let part = "wing";
        if (j === 0 && ya >= 5) part = "slat";
        if (j === 3 && yb <= 12) part = "flap";
        if (j === 3 && ya >= 12.5 && yb <= 16.5) part = "aileron";
        let pts = [G.wPt(ya, fa, bend), G.wPt(yb, fa, bend), G.wPt(yb, fb, bend), G.wPt(ya, fb, bend)];
        if (part === "flap" && o.flap) {
          const sh = -(o.flap / 40) * .22 * (G.wLE(ym) - G.wTE(ym));
          pts = pts.map(p => [p[0] + sh, p[1], p[2]]);
          pts = pts.map((p, k) => k < 2 ? p : hingeXZ(p, pts[k === 2 ? 1 : 0][0], pts[k === 2 ? 1 : 0][2], (o.flap) * D));
        }
        if (part === "aileron") {
          const a = -(o.ail || 0) * s * D;
          pts = pts.map((p, k) => k < 2 ? p : hingeXZ(p, pts[k === 2 ? 1 : 0][0], pts[k === 2 ? 1 : 0][2], a));
        }
        if (part === "slat" && o.slat) {
          const h = [G.wPt(ya, fb, bend), G.wPt(yb, fb, bend)];
          pts = pts.map((p, k) => k >= 2 ? p : hingeXZ([p[0] + .25 * o.slat / 25, p[1], p[2]], h[k][0], h[k][2], -o.slat * D));
        }
        add(pts.map(p => [p[0], p[1] * s, p[2]]), part);
        // spoilers sit on the upper surface ahead of the flaps
        if (j === 2 && ya >= 3 && yb <= 12) {
          const roll = Math.max(0, (o.ail || 0) * s) * .8;
          const up = Math.max(o.spoil || 0, roll);
          let sp = [G.wPt(ya, .6, bend), G.wPt(yb, .6, bend), G.wPt(yb, .74, bend), G.wPt(ya, .74, bend)].map(p => [p[0], p[1], p[2] + .03]);
          if (up) sp = sp.map((p, k) => k < 2 ? p : hingeXZ(p, sp[k === 2 ? 1 : 0][0], sp[k === 2 ? 1 : 0][2], -up * D));
          add(sp.map(p => [p[0], p[1] * s, p[2]]), "spoiler");
        }
      }
    }
    // winglet
    if (o.winglet) {
      const le = G.wLE(G.y1), te = G.wTE(G.y1), z = G.wZ(G.y1) + bend;
      add([[le, G.y1 * s, z], [te, G.y1 * s, z], [te - .3, (G.y1 + .25) * s, z + 2.2], [te + .5, (G.y1 + .25) * s, z + 2.2]], "winglet");
    }
    // nacelle + pylon
    const n = G.NAC, M = 12;
    const nr = (x, r) => Array.from({ length: M }, (_, i) => { const a = i / M * Math.PI * 2; return [x, s * n.y + Math.cos(a) * r, n.z + Math.sin(a) * r]; });
    let pr = nr(n.xs[0], n.rs[0]);
    for (let i = 1; i < n.xs.length; i++) {
      const cr = nr(n.xs[i], n.rs[i]);
      for (let j = 0; j < M; j++) { const k = (j + 1) % M; add([pr[j], pr[k], cr[k], cr[j]], i === 1 ? "inlet" : "nacelle"); }
      pr = cr;
    }
    add(nr(n.xs[1] - .05, n.rs[0] * .92), "fan");
    const wz = G.wZ(n.y);
    add([[3.6, s * n.y, n.z + .98], [-.4, s * n.y, n.z + .9], [-.9, s * n.y, wz - .05], [2.4, s * n.y, wz - .05]], "pylon");
    // horizontal tail
    const stab = (o.stab || 0) * D;
    const hs = [.5, 2, 3.6, 5, 6.2];
    for (let i = 0; i < hs.length - 1; i++) {
      const ya = hs[i], yb = hs[i + 1];
      const P = (y, f) => [G.hsLE(y) - f * G.hsC(y), y, G.hsZ(y)];
      const fix = p => hingeXZ(p, -16.5, 1.2, -stab);
      const main = [P(ya, 0), P(yb, 0), P(yb, .7), P(ya, .7)].map(fix);
      add(main.map(p => [p[0], p[1] * s, p[2]]), "hstab");
      let el = [P(ya, .7), P(yb, .7), P(yb, 1), P(ya, 1)].map(fix);
      const a = -(o.elev || 0) * D;
      el = el.map((p, k) => k < 2 ? p : hingeXZ(p, el[k === 2 ? 1 : 0][0], el[k === 2 ? 1 : 0][2], a));
      add(el.map(p => [p[0], p[1] * s, p[2]]), "elevator");
    }
    // main gear
    if (o.gear) {
      const gy = 3.8 * s, gx = -1.0, top = G.wZ(3.8);
      add([[gx + .12, gy, top], [gx - .12, gy, top], [gx - .12, gy, -3.3], [gx + .12, gy, -3.3]], "gear");
      for (const off of [-.35, .35]) add(Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return [gx + Math.cos(a) * .6, gy + off * s, -3.4 + Math.sin(a) * .6]; }), "gear");
    }
  }
  // fin + rudder
  const zs = [1.6, 3.1, 4.6, 6.1, 7.5];
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1];
    const P = (z, f) => [G.fnLE(z) - f * G.fnC(z), 0, z];
    add([P(za, 0), P(zb, 0), P(zb, .68), P(za, .68)], "fin");
    const r = [P(za, .68), P(zb, .68), P(zb, 1), P(za, 1)];
    const a = (o.rud || 0) * D;
    add(r.map((p, k) => { if (k < 2) return p; const h = r[k === 2 ? 1 : 0]; const dx = p[0] - h[0]; return [h[0] + dx * Math.cos(a), -dx * Math.sin(a), p[2]]; }), "rudder");
  }
  if (o.gear) {
    add([[13.7, .1, -1.6], [13.5, .1, -1.6], [13.5, .1, -3.2], [13.7, .1, -3.2]], "gear");
    add(Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return [13.6 + Math.cos(a) * .4, .3, -3.5 + Math.sin(a) * .4]; }), "gear");
  }
  return F;
};

/* Line model of the primary structure. o = { bend, breathe } */
G.structure = (o = {}) => {
  const L = [];
  const seg = (a, b, part) => L.push({ a, b, part });
  const poly = (pts, part, closed) => { for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i], part); if (closed) seg(pts[pts.length - 1], pts[0], part); };
  const br = 1 + (o.breathe || 0);
  const N = 24;
  const ringPts = (x, scale = 1) => { const { r, zc } = G.fus(x); return Array.from({ length: N }, (_, i) => { const a = i / N * Math.PI * 2; return [x, Math.cos(a) * r * br * scale, zc + Math.sin(a) * r * br * scale]; }); };
  // frames
  for (let x = 16.5; x >= -17.5; x -= 1.0) poly(ringPts(x), "frames", true);
  // stringers
  const sx = []; for (let x = 18.6; x >= -18.6; x -= .6) sx.push(x);
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    poly(sx.map(x => { const { r, zc } = G.fus(x); return [x, Math.cos(a) * r * br, zc + Math.sin(a) * r * br]; }), "stringers");
  }
  // windows (rounded) and doors
  for (const s of [1, -1]) {
    for (let x = 12; x > -9.5; x -= .76) {
      if (Math.abs(x - 1) < .5 || Math.abs(x + .6) < .3) continue;
      const pts = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return [x + Math.cos(a) * .14, s * Math.sqrt(Math.max(0, (G.R0 * br) ** 2 - .3 * .3)), .3 + Math.sin(a) * .2]; });
      poly(pts, "windows", true);
    }
    for (const dx of [14.6, -10.6]) {
      const y = s * G.R0 * br * .995;
      poly([[dx + .4, y, -.9], [dx - .4, y, -.9], [dx - .4, y, 1.0], [dx + .4, y, 1.0]], "doors", true);
    }
  }
  // floor beams + seat tracks
  const fz = -.6;
  for (let x = 16; x >= -10; x -= 1.0) { const w = Math.sqrt(G.R0 ** 2 - fz ** 2) * br; seg([x, -w, fz], [x, w, fz], "floor"); }
  for (const y of [-1.4, -.6, .6, 1.4]) seg([16, y, fz], [-10, y, fz], "floor");
  // pressure bulkheads
  for (let k = 1; k <= 4; k++) {
    const f = k / 4;
    const xb = -11.2 - (1 - f * f) * .9;
    const { r, zc } = G.fus(-11.2);
    poly(Array.from({ length: N }, (_, i) => { const a = i / N * Math.PI * 2; return [xb, Math.cos(a) * r * f, zc + Math.sin(a) * r * f]; }), "bulkhead", true);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, { r, zc } = G.fus(-11.2);
    poly(Array.from({ length: 5 }, (_, k) => { const f = k / 4; return [-11.2 - (1 - f * f) * .9, Math.cos(a) * r * f, zc + Math.sin(a) * r * f]; }), "bulkhead");
  }
  const fr = ringPts(16.5, .97); for (let i = 0; i < N / 2; i++) seg(fr[i], fr[N - 1 - i], "bulkhead");
  // wing box: spars, ribs, skin stringers
  const bend = o.bend || 0;
  const th = y => .32 * (G.wLE(y) - G.wTE(y)) / 6.1 / 2;
  for (const s of [1, -1]) {
    const m = p => [p[0], p[1] * s, p[2]];
    const ys = []; for (let y = G.y0; y <= G.y1 + 1e-6; y += .5) ys.push(y);
    for (const f of [.15, .65]) for (const sg of [1, -1]) poly(ys.map(y => { const p = G.wPt(y, f, bend); return m([p[0], p[1], p[2] + sg * th(y)]); }), "spars");
    for (const f of [.25, .35, .45, .55]) for (const sg of [1, -1]) poly(ys.map(y => { const p = G.wPt(y, f, bend); return m([p[0], p[1], p[2] + sg * th(y) * .95]); }), "skin");
    poly([...ys.map(y => m(G.wPt(y, 0, bend))), ...ys.slice().reverse().map(y => m(G.wPt(y, 1, bend)))], "outline", true);
    for (let y = G.y0 + .4; y < G.y1; y += .85) {
      for (const sg of [1, -1]) poly([0, .15, .4, .65, 1].map(f => { const p = G.wPt(y, f, bend); const t = f < .15 || f > .65 ? .4 : 1; return m([p[0], p[1], p[2] + sg * th(y) * t]); }), "ribs");
      for (const f of [.15, .65]) { const p = G.wPt(y, f, bend); seg(m([p[0], p[1], p[2] + th(y)]), m([p[0], p[1], p[2] - th(y)]), "ribs"); }
    }
    // tail spars & ribs
    const hy = []; for (let y = .5; y <= 6.2; y += .5) hy.push(y);
    for (const f of [.15, .65]) poly(hy.map(y => m([G.hsLE(y) - f * G.hsC(y), y, G.hsZ(y)])), "tail");
    poly([...hy.map(y => m([G.hsLE(y), y, G.hsZ(y)])), ...hy.slice().reverse().map(y => m([G.hsLE(y) - G.hsC(y), y, G.hsZ(y)]))], "tail", true);
    for (let y = 1; y < 6.2; y += .8) seg(m([G.hsLE(y), y, G.hsZ(y)]), m([G.hsLE(y) - G.hsC(y), y, G.hsZ(y)]), "tail");
    // engine pylon & nacelle outline
    const n = G.NAC;
    for (const x of n.xs) poly(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; const r = n.rs[n.xs.indexOf(x)]; return [x, s * n.y + Math.cos(a) * r, n.z + Math.sin(a) * r]; }), "nacelle", true);
    seg([3.6, s * n.y, n.z + .98], [2.4, s * n.y, G.wZ(n.y)], "pylon"); seg([-.4, s * n.y, n.z + .9], [-.9, s * n.y, G.wZ(n.y)], "pylon"); seg([3.6, s * n.y, n.z + .98], [-.4, s * n.y, n.z + .9], "pylon");
    // main gear
    const gy = 3.8 * s, gx = -1.0, top = G.wZ(3.8);
    seg([gx, gy, top], [gx, gy, -3.3], "gear"); seg([gx - 1.4, gy * .55, top - .05], [gx, gy, -1.6], "gear");
    for (const off of [-.35, .35]) poly(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return [gx + Math.cos(a) * .6, gy + off * s, -3.4 + Math.sin(a) * .6]; }), "gear", true);
  }
  // centre wing box & keel beam
  const cz = [-1.25, -.6];
  for (const f of [.15, .65]) for (const z of cz) seg([G.wPt(G.y0, f)[0], -G.y0, z], [G.wPt(G.y0, f)[0], G.y0, z], "centrebox");
  for (let y = -G.y0; y <= G.y0 + .01; y += .85) for (const z of cz) seg([G.wPt(G.y0, .15)[0], y, z], [G.wPt(G.y0, .65)[0], y, z], "centrebox");
  for (const y of [-G.y0, G.y0]) for (const f of [.15, .65]) seg([G.wPt(G.y0, f)[0], y, cz[0]], [G.wPt(G.y0, f)[0], y, cz[1]], "centrebox");
  for (const y of [-.25, .25]) seg([G.wPt(G.y0, .65)[0], y, -1.95], [-7.5, y, -1.9], "keel");
  // fin
  const zs = []; for (let z = 1.6; z <= 7.5; z += .5) zs.push(z);
  for (const f of [.15, .65]) poly(zs.map(z => [G.fnLE(z) - f * G.fnC(z), 0, z]), "tail");
  poly([...zs.map(z => [G.fnLE(z), 0, z]), ...zs.slice().reverse().map(z => [G.fnLE(z) - G.fnC(z), 0, z])], "tail", true);
  for (let z = 2.2; z < 7.5; z += .8) seg([G.fnLE(z), 0, z], [G.fnLE(z) - G.fnC(z), 0, z], "tail");
  // nose gear
  seg([13.6, 0, -1.6], [13.6, 0, -3.2], "gear");
  poly(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return [13.6 + Math.cos(a) * .4, 0, -3.5 + Math.sin(a) * .4]; }), "gear", true);
  return L;
};

/* Small 2D side-view airliner silhouette for profile diagrams. */
App.drawPlaneSide = (ctx, x, y, len, pitch, color) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-pitch); ctx.scale(len / 40, len / 40);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.quadraticCurveTo(19, -2.2, 14, -2.2); ctx.lineTo(-12, -2.2); ctx.lineTo(-19, -9); ctx.lineTo(-21, -9); ctx.lineTo(-20, -1.2);
  ctx.lineTo(-12, 1.6); ctx.lineTo(14, 2); ctx.quadraticCurveTo(19, 1.8, 20, 0); ctx.fill();
  ctx.globalAlpha = .75; ctx.beginPath(); ctx.moveTo(3, .5); ctx.lineTo(-5, .5); ctx.lineTo(-9, 2.6); ctx.lineTo(-6, 2.6); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, 2.6, 3, 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

/* ---------- router & loop ---------- */
App.register = ch => App.chapters.push(ch);
App.show = (id, sub) => {
  const ch = App.chapters.find(c => c.id === id) || App.chapters[0];
  const changed = App.active !== ch;
  App.chapters.forEach(c => { c.ui.sec.hidden = c !== ch; });
  document.querySelectorAll("#chnav .tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.id === ch.id)));
  const tb = document.querySelector(`#chnav .tab[data-id="${ch.id}"]`); if (tb) tb.scrollIntoView({ block: "nearest", inline: "nearest" });
  App.active = ch;
  ch.resize && ch.resize();
  if (ch.activate) ch.activate(sub);
  ch.scrolly && ch.scrolly.update();
  const hash = sub || ch.id;
  try { history.replaceState(null, "", "#" + hash); } catch (_) {}
  if (changed) document.title = `${ch.nav} · Anatomy of Flight`;
};
App.setHash = h => { try { history.replaceState(null, "", "#" + h); } catch (_) {} };
App.jumpTop = () => {
  const nav = document.getElementById("navbar");
  const top = nav.getBoundingClientRect().top + window.scrollY;
  if (window.scrollY > top + 2) window.scrollTo({ top, behavior: "auto" });
};
App.resolveHash = () => {
  const h = (location.hash || "").slice(1);
  for (const c of App.chapters) {
    if (c.id === h) return [c.id];
    if (c.subs && c.subs.includes(h)) return [c.id, h];
  }
  return [App.chapters[0].id];
};
App.boot = () => {
  App.readTokens();
  const nav = document.getElementById("chnav");
  nav.innerHTML = App.chapters.map((c, i) => `<button class="tab" role="tab" type="button" data-id="${c.id}" aria-selected="false"><small>${String(i + 1).padStart(2, "0")}</small>${c.nav}</button>`).join("");
  nav.addEventListener("click", e => { const b = e.target.closest(".tab"); if (!b) return; App.show(b.dataset.id); App.jumpTop(); });
  App.chapters.forEach(c => c.build());
  const [id, sub] = App.resolveHash();
  App.show(id, sub);
  window.addEventListener("hashchange", () => { const [i, s] = App.resolveHash(); if (App.active.id !== i || s) App.show(i, s); });
  window.addEventListener("scroll", () => requestAnimationFrame(() => App.active && App.active.scrolly && App.active.scrolly.update()), { passive: true });
  window.addEventListener("resize", () => App.active && App.active.resize && App.active.resize());
  const refresh = () => { App.readTokens(); App.active && App.active.themeChanged && App.active.themeChanged(); };
  // light/dark switch: dark by default, the visitor's choice is remembered
  const themeBtn = document.getElementById("themeBtn");
  const syncThemeBtn = () => {
    const dark = document.documentElement.dataset.theme !== "light";
    themeBtn.textContent = dark ? "Light mode" : "Dark mode";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  };
  if (themeBtn) {
    syncThemeBtn();
    themeBtn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("aof-theme", next); } catch (e) {}
      syncThemeBtn();
    });
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener ? mq.addEventListener("change", refresh) : mq.addListener(refresh);
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => App.active && App.active.resize && App.active.resize());
  let last = performance.now();
  const tick = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (App.active && App.active.frame) App.active.frame(dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
})();
