/* Chapter: How planes fly. Four forces, a live potential-flow airfoil,
   stall, the lift equation, drag, wingtip vortices and wing sweep. */
(() => {
"use strict";
const { at, clamp, fmt, lerp, deg: D, r3: R3 } = App;

/* ---------- Joukowski airfoil (exact 2-D potential flow) ----------
   Circle centre mu, radius R through zeta = 1 maps to an airfoil by z = zeta + 1/zeta.
   The Kutta condition fixes circulation so the flow leaves the sharp trailing edge. */
const MU = [-.09, .07], R = Math.hypot(1 - MU[0], MU[1]), BETA = Math.atan2(MU[1], 1 - MU[0]);
const cm = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cd = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const csqrt = a => { const r = Math.hypot(a[0], a[1]); const re = Math.sqrt(Math.max(0, (r + a[0]) / 2)), im = Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, a[1] < 0 ? -im : im]; };
const SHAPE = Array.from({ length: 160 }, (_, i) => { const t = i / 160 * Math.PI * 2; const z = [MU[0] + R * Math.cos(t), MU[1] + R * Math.sin(t)]; const w = cd([1, 0], z); return [z[0] + w[0], z[1] + w[1]]; });
const XMIN = Math.min(...SHAPE.map(p => p[0])), XMAX = Math.max(...SHAPE.map(p => p[0])), CHORD = XMAX - XMIN, XMID = (XMIN + XMAX) / 2;
const clPot = a => 8 * Math.PI * R * Math.sin(a * D + BETA) / CHORD;
// Real wings stall: lift peaks near 15° then falls as the flow separates.
const clReal = a => {
  if (a <= 11) return clPot(a);
  const d = a - 11;
  return clPot(11) + .09 * d - .012 * d * d - (a > 16 ? .04 * Math.pow(a - 16, 1.5) : 0);
};

// Velocity at a display-frame point (free stream horizontal, airfoil pitched up by alpha).
function vel(px, py, alpha) {
  const ea = [Math.cos(alpha), Math.sin(alpha)];
  const z = cm([px, py], ea); z[0] += XMID;
  const q = csqrt([z[0] * z[0] - z[1] * z[1] - 4, 2 * z[0] * z[1]]);
  const z1 = [(z[0] + q[0]) / 2, (z[1] + q[1]) / 2], z2 = [(z[0] - q[0]) / 2, (z[1] - q[1]) / 2];
  const d1 = Math.hypot(z1[0] - MU[0], z1[1] - MU[1]), d2 = Math.hypot(z2[0] - MU[0], z2[1] - MU[1]);
  const zeta = d1 >= d2 ? z1 : z2, dist = Math.max(d1, d2);
  if (dist < R * 1.0005) return null;
  const s = [zeta[0] - MU[0], zeta[1] - MU[1]];
  const G = 4 * Math.PI * R * Math.sin(alpha + BETA);
  const emi = [Math.cos(alpha), -Math.sin(alpha)], epi = [Math.cos(alpha), Math.sin(alpha)];
  const s2 = cm(s, s);
  const t1 = cd(cm([R * R, 0], epi), s2);
  const t2 = cd([0, G / (2 * Math.PI)], s);
  const dF = [emi[0] - t1[0] + t2[0], emi[1] - t1[1] + t2[1]];
  const dz = (() => { const iz2 = cd([1, 0], cm(zeta, zeta)); return [1 - iz2[0], -iz2[1]]; })();
  if (Math.hypot(dz[0], dz[1]) < 1e-4) return [1, 0];
  const w = cd(dF, dz);
  // w = u - iv in the airfoil frame; rotate back to display frame
  const u = w[0], v = -w[1];
  return [u * Math.cos(alpha) + v * Math.sin(alpha), -u * Math.sin(alpha) + v * Math.cos(alpha)];
}
const shapeDisp = alpha => SHAPE.map(p => { const x = p[0] - XMID, y = p[1], c = Math.cos(-alpha), s = Math.sin(-alpha); return [x * c - y * s, x * s + y * c]; });

/* ---------- aircraft numbers (single-aisle jet) ---------- */
const AC = { S: 122.6, W: 64000 * 9.81, AR: 9.5, e: .8, CD0: .022, rho: 1.225 };
const KT = .5144;
const lift = (vkt, cl) => .5 * AC.rho * (vkt * KT) ** 2 * AC.S * cl;
const dragParts = vkt => { const qS = .5 * AC.rho * (vkt * KT) ** 2 * AC.S; return [qS * AC.CD0, AC.W * AC.W / (qS * Math.PI * AC.AR * AC.e)]; };

/* ---------- steps ---------- */
const STEPS = [
  { overview: true, kicker: "Chapter 1", title: "How planes fly", scene: "forces",
    tagline: "A 70-tonne airliner stays up by throwing air downwards, about its own weight's worth every second.",
    body: "<p>An aircraft flies because its wings are shaped and tilted to bend the oncoming air down. Pushing air down pushes the wing up. Everything else in aviation, from engines to flaps to fuel planning, exists to keep that process going safely and efficiently.</p><p>This chapter starts with the forces on the whole aircraft, then zooms into a slice of wing in a virtual wind tunnel where you can change the angle yourself.</p>",
    facts: [["Wing area", "About 123 m² on a 180-seat jet"], ["Lift needed", "About 630 kN at 64 tonnes"], ["Lift-to-drag", "About 17 : 1 in cruise"]] },
  { title: "Four forces", tag: "Equilibrium", scene: "forces",
    body: "<p>Lift acts upward, weight downward, thrust forward and drag backward. In steady, level flight they cancel in pairs: lift equals weight and thrust equals drag. The aircraft keeps moving at a constant speed because nothing is unbalanced, the same way a puck slides across ice.</p><p>Change one and the aircraft responds. More thrust than drag and it speeds up or climbs. Less lift than weight and it descends.</p>",
    hint: "Lift is about 17 times larger than drag. That ratio is the single best measure of how efficient a wing is." },
  { title: "The wing section", tag: "Airfoil", scene: "tunnel", alpha: 4, labels: true, field: false,
    body: "<p>Cut through a wing and you get an airfoil: a rounded leading edge, a sharp trailing edge and a curved middle. The straight line from nose to tail is the chord. The line halfway between the upper and lower surfaces is the camber line; its curve is what lets the wing lift even at zero tilt.</p><p>This airfoil is computed, not drawn. The particles follow the exact mathematical solution for smooth flow around this shape.</p>" },
  { title: "Turning the air", tag: "Newton", scene: "tunnel", alpha: 6, field: false,
    body: "<p>Watch the streams: air ahead of the wing rises to meet it (upwash) and air behind it leaves heading slightly down (downwash). The wing has changed the air's direction, and changing the momentum of something takes a force. The air is pushed down, so the wing is pushed up.</p><p>An airliner wing at cruise deflects several tonnes of air every second.</p>" },
  { title: "The pressure difference", tag: "Bernoulli", scene: "tunnel", alpha: 6, field: true,
    body: "<p>The same flow seen as pressure. Air speeds up over the curved top (blue, below ambient pressure) and slows under the bottom and at the nose (red, above ambient). Low pressure above and high pressure below add up to a net upward push across the whole surface.</p><p>This and the momentum view are not rival theories. They are two ways of describing the same flow; both give the same lift.</p>",
    hint: "Most of the lift comes from suction on the upper surface, especially just behind the leading edge." },
  { title: "No equal transit time", tag: "Myth", scene: "tunnel", alpha: 6, field: false, timeline: true,
    body: "<p>A common school explanation says air over the top must travel further and so goes faster to meet up with the air underneath at the trailing edge. It doesn't. Watch the white markers released in a straight line: the ones going over the top reach the trailing edge well ahead of those underneath, and never meet up again.</p><p>The upper flow is faster than the meeting-up idea would need, and the reason is the wing's circulation, not a path-length race.</p>" },
  { title: "Angle of attack", tag: "α", scene: "tunnel", alpha: 8, field: true, interactive: true,
    body: "<p>The angle between the chord and the oncoming air is the angle of attack. Tilt the wing more and it turns more air, so lift rises steadily: about 0.11 in lift coefficient per degree for this section.</p><p>Drag the angle slider under the drawing. Watch the stagnation point (where the flow splits at the nose) move under the leading edge, and the blue suction peak sharpen.</p>",
    hint: "Pilots don't see angle of attack directly in most airliners; they fly speed, which sets it for a given weight." },
  { title: "Stall", tag: "Separation", scene: "tunnel", alpha: 17, field: false,
    body: "<p>Beyond about 15° the air can no longer follow the sharply curved upper surface. It breaks away into a turbulent wake, lift collapses and drag soars. That is a stall. It is about angle, not speed: a wing can stall at any speed if pulled to too steep an angle.</p><p>The chart shows the measured-style curve peeling away from the smooth-flow theory. Airliners use stick shakers, warnings and computer protection to keep well clear of this point.</p>" },
  { title: "The lift equation", tag: "L = ½ρV²SC<sub>L</sub>", scene: "tunnel", alpha: 5, field: true, interactive: true, speed: true,
    body: "<p>Lift grows with air density ρ, wing area S, the lift coefficient C<sub>L</sub> (set mostly by angle of attack) and the square of airspeed V. Double the speed and you get four times the lift.</p><div class=\"formula\">L = ½ · ρ · V² · S · C<sub>L</sub></div><p>Set the speed to 140 kt, a typical approach speed. To hold up 64 tonnes the clean wing needs a C<sub>L</sub> around 1.6, uncomfortably close to stall. That is why airliners extend flaps and slats for take-off and landing (next chapter).</p>",
    hint: "The readout shows lift as a share of the aircraft's weight. 100% means level flight." },
  { title: "Drag", tag: "Parasite + induced", scene: "drag", speed: true,
    body: "<p>Drag comes in two main kinds. Parasite drag (skin friction and form drag) grows with the square of speed. Induced drag, the price of making lift, shrinks as you go faster because the wing needs less angle of attack.</p><p>Add them and you get a U-shaped curve. Its bottom, the minimum-drag speed, is where the aircraft gets the most lift per unit of drag: about 210 kt at this weight near sea level.</p>" },
  { title: "Wingtip vortices", tag: "3-D flow", scene: "vortex",
    body: "<p>High-pressure air under the wing leaks around the tips toward the low-pressure top, rolling up into two powerful vortices that trail behind the aircraft for miles. They tilt the airflow over the whole wing slightly downward, and that tilt is where induced drag comes from.</p><p>Long, slender wings (high aspect ratio) and winglets weaken the vortices. Air traffic control spaces aircraft apart on approach so a small aircraft doesn't fly into a big one's wake.</p>" },
  { title: "Sweep and the speed of sound", tag: "Transonic", scene: "sweep",
    body: "<p>At Mach 0.78 the air speeding over the wing's upper surface already exceeds Mach 1 locally, forming a shock wave and a sharp rise in drag. Sweeping the wing back means the airfoil only feels the component of airflow perpendicular to its leading edge.</p><p>With 25° of sweep, a Mach 0.78 aircraft's wing behaves like one flying at about Mach 0.71. Flatter-topped supercritical airfoils push the shock further back and weaken it.</p>" }
];

/* ---------- state ---------- */
const S = { step: 0, alpha: 4, alphaT: 4, manual: false, vkt: 140, field: false, labels: false, timeline: false, t: 0, parts: [], marks: [], heat: null, heatA: null, scene: "forces" };
let ui, stage, cv, scrolly, ctx2;
const heatCv = document.createElement("canvas"); heatCv.width = 220; heatCv.height = 110;
const DOM = { x0: -4.6, x1: 5.4, y0: -2.5, y1: 2.5 };
let W = 0, H = 0;
const toPx = (x, y) => { const k = Math.min(W / (DOM.x1 - DOM.x0), H / (DOM.y1 - DOM.y0)); const ox = (W - k * (DOM.x1 - DOM.x0)) / 2; return [ox + (x - DOM.x0) * k, H / 2 - y * k, k]; };

function spawn(p, initial) {
  p.x = initial ? DOM.x0 + Math.random() * (DOM.x1 - DOM.x0) : DOM.x0 - Math.random() * .4;
  p.y = DOM.y0 + Math.random() * (DOM.y1 - DOM.y0);
  p.life = 0; p.px = p.x; p.py = p.y;
}
function resetParticles() {
  const n = W < 520 ? 320 : 600;
  S.parts = Array.from({ length: n }, () => { const p = {}; spawn(p, true); return p; });
}
function advect(p, dt, a) {
  const v1 = vel(p.x, p.y, a);
  if (!v1) return false;
  const v2 = vel(p.x + v1[0] * dt / 2, p.y + v1[1] * dt / 2, a);
  if (!v2) return false;
  p.px = p.x; p.py = p.y;
  p.x += v2[0] * dt; p.y += v2[1] * dt;
  p.v = Math.hypot(v2[0], v2[1]);
  return true;
}
function buildHeat() {
  const a = S.alpha * D;
  const hc = heatCv.getContext("2d"), img = hc.createImageData(heatCv.width, heatCv.height);
  for (let j = 0; j < heatCv.height; j++) for (let i = 0; i < heatCv.width; i++) {
    const x = DOM.x0 + (i + .5) / heatCv.width * (DOM.x1 - DOM.x0), y = DOM.y1 - (j + .5) / heatCv.height * (DOM.y1 - DOM.y0);
    const v = vel(x, y, a), k = (j * heatCv.width + i) * 4;
    if (!v) { img.data[k + 3] = 0; continue; }
    const cp = clamp(1 - (v[0] * v[0] + v[1] * v[1]), -2.2, 1);
    let c;
    // fade small departures from ambient so the strong suction and stagnation regions stand out
    const m = Math.max(0, Math.abs(cp) - .12);
    if (cp < 0) { const f = Math.pow(Math.min(1, m / 1.4), .8); c = [40 + 20 * f, 110 + 50 * f, 230, 235 * f]; }
    else { const f = Math.pow(Math.min(1, m / .88), .8); c = [235, 90 + 20 * f, 50, 215 * f]; }
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = c[3];
  }
  hc.putImageData(img, 0, 0);
  S.heatA = S.alpha;
}

/* ---------- scenes ---------- */
function drawTunnel(ctx) {
  const a = S.alpha * D, [, , k] = toPx(0, 0);
  if (S.field) {
    if (S.heatA === null || Math.abs(S.heatA - S.alpha) > .15) buildHeat();
    const [x0, y0] = toPx(DOM.x0, DOM.y1), [x1, y1] = toPx(DOM.x1, DOM.y0);
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .85;
    ctx.drawImage(heatCv, x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1;
  }
  // particles
  ctx.lineCap = "round"; ctx.lineWidth = W < 520 ? 1.4 : 1.8;
  for (const p of S.parts) {
    if (p.life < .05) continue;
    const s = clamp((p.v || 1) - .3, 0, 1.6) / 1.6;
    ctx.strokeStyle = S.field ? `rgba(230,240,245,${.55})` : `rgba(${Math.round(90 + 140 * s)},${Math.round(170 + 60 * s)},${Math.round(255 - 40 * s)},.85)`;
    const [ax, ay] = toPx(p.px, p.py), [bx, by] = toPx(p.x, p.y);
    if (Math.hypot(bx - ax, by - ay) > 40) continue;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx + (bx - ax) * 1.5, by + (by - ay) * 1.5); ctx.stroke();
  }
  // stall wake
  const stall = clamp((S.alpha - 13.5) / 4, 0, 1);
  if (stall > 0) {
    const sh = shapeDisp(a);
    let top = sh[Math.round(sh.length * .25)];
    const lead = sh.reduce((m, p) => p[0] < m[0] ? p : m, sh[0]);
    const sepX = lerp(.8, -.6, stall);
    ctx.save(); ctx.globalAlpha = .55 * stall;
    for (let i = 0; i < 26; i++) {
      const u = i / 26, ph = S.t * 1.7 + i * 1.3;
      const x = sepX + u * 4.6 + .25 * Math.sin(ph * 1.3);
      const yb = surfY(sh, x) ?? (top[1] - (x - top[0]) * .05);
      const y = yb + .15 + u * (.6 + stall * .9) * (.5 + .5 * Math.sin(ph)) ;
      const [px, py] = toPx(x, y);
      ctx.strokeStyle = "rgba(200,210,220,.7)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(px, py, (4 + 6 * u) * (k / 60), ph % 6.28, ph % 6.28 + 4.2); ctx.stroke();
    }
    ctx.restore();
  }
  // timeline markers
  ctx.fillStyle = "#ffffff";
  for (const m of S.marks) { const [px, py] = toPx(m.x, m.y); ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill(); }
  // airfoil
  const sh = shapeDisp(a);
  ctx.beginPath(); sh.forEach((p, i) => { const [x, y] = toPx(p[0], p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
  const g = ctx.createLinearGradient(0, toPx(0, .6)[1], 0, toPx(0, -.4)[1]);
  g.addColorStop(0, App.tokens["metal-hi"]); g.addColorStop(1, App.tokens["hub"]);
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 1; ctx.stroke();
  if (S.labels) drawLabels(ctx, sh);
  // free-stream arrow
  const [fx, fy] = toPx(DOM.x0 + .25, DOM.y1 - .3);
  App.arrow2d(ctx, fx, fy, fx + 46, fy, App.tokens["stage-muted"], 1.6);
  App.label(ctx, "airflow", fx, fy - 8, App.tokens["stage-muted"]);
  App.label(ctx, `α ${S.alpha.toFixed(1)}°`, W - 10, 18, App.tokens["stage-fg"], "right", 12);
  if (stall > .2) App.label(ctx, "SEPARATED FLOW", W - 10, 34, App.tokens["hi"], "right", 11);
  drawClChart(ctx);
}
function surfY(sh, x) {
  // upper surface y at x (display frame)
  let best = null;
  for (let i = 0; i < sh.length; i++) {
    const a = sh[i], b = sh[(i + 1) % sh.length];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) {
      const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      if (best === null || y > best) best = y;
    }
  }
  return best;
}
function drawLabels(ctx, sh) {
  const T = App.tokens, col = T["hi"];
  const le = sh.reduce((m, p) => p[0] < m[0] ? p : m, sh[0]), te = sh.reduce((m, p) => p[0] > m[0] ? p : m, sh[0]);
  const [lx, ly] = toPx(...le), [tx, ty] = toPx(...te);
  ctx.setLineDash([5, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
  // camber line: midpoints of upper/lower at sampled x
  ctx.strokeStyle = T["lp"]; ctx.beginPath();
  for (let i = 1; i < 30; i++) {
    const x = le[0] + (te[0] - le[0]) * i / 30;
    const ys = [];
    for (let j = 0; j < sh.length; j++) { const a = sh[j], b = sh[(j + 1) % sh.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) ys.push(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])); }
    if (ys.length >= 2) { const [px, py] = toPx(x, (Math.max(...ys) + Math.min(...ys)) / 2); i === 1 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
  }
  ctx.stroke();
  const fs = W < 520 ? 10 : 11;
  App.label(ctx, "leading edge", lx - 4, ly + 30, col, "right", fs);
  App.label(ctx, "trailing edge", tx + 4, ty + 22, col, "left", fs);
  const [cx, cy] = toPx((le[0] + te[0]) / 2, (le[1] + te[1]) / 2 - .55);
  App.label(ctx, "chord line (dashed)", cx, cy, col, "center", fs);
  const [mx, my] = toPx((le[0] + te[0]) / 2, (le[1] + te[1]) / 2 + .95);
  App.label(ctx, "camber line (green)", mx, my, T["lp"], "center", fs);
}
function drawClChart(ctx) {
  const T = App.tokens, w = Math.min(190, W * .34), h = w * .62, x0 = W - w - 10, y0 = H - h - 10;
  ctx.fillStyle = "rgba(12,19,23,.82)"; ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = T["stage-rule"]; ctx.strokeRect(x0 + .5, y0 + .5, w, h);
  const pad = 22, ax = a => x0 + pad + (a + 4) / 24 * (w - pad - 8), ay = c => y0 + h - 16 - (c + .2) / 2.4 * (h - 26);
  ctx.strokeStyle = T["stage-rule"]; ctx.beginPath(); ctx.moveTo(ax(-4), ay(0)); ctx.lineTo(ax(20), ay(0)); ctx.moveTo(ax(0), ay(-.2)); ctx.lineTo(ax(0), ay(2.2)); ctx.stroke();
  ctx.setLineDash([3, 3]); ctx.strokeStyle = T["stage-muted"]; ctx.beginPath();
  for (let a = -4; a <= 20; a += .5) a === -4 ? ctx.moveTo(ax(a), ay(clPot(a))) : ctx.lineTo(ax(a), ay(clPot(a)));
  ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = T["hi"]; ctx.lineWidth = 2; ctx.beginPath();
  for (let a = -4; a <= 20; a += .25) a === -4 ? ctx.moveTo(ax(a), ay(clReal(a))) : ctx.lineTo(ax(a), ay(clReal(a)));
  ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ax(S.alpha), ay(clReal(S.alpha)), 4, 0, 7); ctx.fill();
  App.label(ctx, "CL", x0 + 4, y0 + 13, T["stage-muted"], "left", 10);
  App.label(ctx, "α 0°", ax(0), y0 + h - 4, T["stage-muted"], "center", 10);
  App.label(ctx, "20°", ax(20), y0 + h - 4, T["stage-muted"], "right", 10);
  App.label(ctx, "theory", ax(20), ay(clPot(19.5)) + 12, T["stage-muted"], "right", 9);
}

function drawForces(ctx) {
  const T = App.tokens;
  const cam = R3.cam({ az: -2.05, el: .2, dist: 74, zoom: .92 }, W, H);
  const faces = App.geo.build({ gear: false, winglet: true });
  const base = App.hex(T["airframe"]);
  R3.faces(ctx, cam, faces, () => base);
  const s = 9 * (H / 300);
  const k = .62 + .03 * Math.sin(S.t * 1.4);
  R3.arrow(ctx, cam, [0, 0, 1], [0, 0, 1 + 15 * k], T["lp"], "LIFT", 3);
  R3.arrow(ctx, cam, [0, 0, -1], [0, 0, -1 - 15 * k], "#ff8a65", "WEIGHT", 3);
  R3.arrow(ctx, cam, [5, -5.75, -2], [5 + 13 * k * .9, -5.75, -2], T["hi"], "THRUST", 3);
  R3.arrow(ctx, cam, [-17, 0, 0], [-17 - 13 * k * .9, 0, 0], "#c792ea", "DRAG", 3);
  App.label(ctx, "Steady level flight: lift = weight, thrust = drag", 12, H - 12, T["stage-muted"], "left", 11);
}

function drawDrag(ctx) {
  const T = App.tokens, L = 54, R = 18, Tp = 20, B = 40;
  const vx = v => L + (v - 100) / 250 * (W - L - R), dy = d => H - B - d / 100 * (H - Tp - B);
  ctx.strokeStyle = T["stage-rule"]; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = 0; d <= 100; d += 20) { ctx.moveTo(L, dy(d)); ctx.lineTo(W - R, dy(d)); }
  ctx.stroke();
  for (let d = 0; d <= 100; d += 20) App.label(ctx, `${d}`, L - 6, dy(d) + 4, T["stage-muted"], "right", 10);
  for (let v = 100; v <= 350; v += 50) App.label(ctx, `${v}`, vx(v), H - B + 16, T["stage-muted"], "center", 10);
  App.label(ctx, "Drag (kN)", L - 6, Tp - 6, T["stage-muted"], "left", 10);
  App.label(ctx, "Airspeed (kt), sea level, 64 t", W - R, H - 8, T["stage-muted"], "right", 10);
  const curve = (f, col, w, dash) => {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (let v = 100; v <= 350; v += 2) { const d = Math.min(100, f(v)); v === 100 ? ctx.moveTo(vx(v), dy(d)) : ctx.lineTo(vx(v), dy(d)); }
    ctx.stroke(); ctx.setLineDash([]);
  };
  curve(v => dragParts(v)[0] / 1000, T["lp"], 1.6, [5, 4]);
  curve(v => dragParts(v)[1] / 1000, "#c792ea", 1.6, [5, 4]);
  curve(v => (dragParts(v)[0] + dragParts(v)[1]) / 1000, T["hi"], 2.6);
  App.label(ctx, "parasite", vx(330), dy(dragParts(330)[0] / 1000) - 8, T["lp"], "right", 11);
  App.label(ctx, "induced", vx(118), dy(Math.min(100, dragParts(118)[1] / 1000)) - 2, "#c792ea", "left", 11);
  // minimum drag
  const vmd = Math.sqrt(AC.W / Math.sqrt(AC.CD0 * Math.PI * AC.AR * AC.e) / (.5 * AC.rho * AC.S)) / KT;
  const dmd = (dragParts(vmd)[0] + dragParts(vmd)[1]) / 1000;
  ctx.setLineDash([2, 3]); ctx.strokeStyle = T["stage-muted"]; ctx.beginPath(); ctx.moveTo(vx(vmd), dy(dmd)); ctx.lineTo(vx(vmd), H - B); ctx.stroke(); ctx.setLineDash([]);
  App.label(ctx, `minimum drag ${Math.round(vmd)} kt`, vx(vmd), dy(dmd) + 22, T["stage-fg"], "center", 11);
  const v = S.vkt, d = (dragParts(v)[0] + dragParts(v)[1]) / 1000;
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(vx(v), dy(Math.min(100, d)), 5, 0, 7); ctx.fill();
}

function drawVortex(ctx) {
  const T = App.tokens, cx = W / 2, cy = H * .42, span = Math.min(W * .78, H * 1.6), half = span / 2;
  // wing seen from behind
  ctx.strokeStyle = T["metal-hi"]; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - half, cy - half * .06); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx + half, cy - half * .06); ctx.stroke();
  ctx.fillStyle = T["metal"]; ctx.beginPath(); ctx.arc(cx, cy - 4, half * .1, 0, 7); ctx.fill();
  for (const s of [-1, 1]) { ctx.fillStyle = T["metal"]; ctx.beginPath(); ctx.ellipse(cx + s * half * .33, cy + half * .08, half * .045, half * .045, 0, 0, 7); ctx.fill(); }
  // vortex particles
  for (const s of [-1, 1]) {
    const vx = cx + s * half * .96, vy = cy - half * .06;
    for (let i = 0; i < 70; i++) {
      const r = 4 + (i % 14) * half * .018, ph = S.t * (4.2 - r / half * 6) * -s + i * 2.39;
      const x = vx + Math.cos(ph) * r, y = vy + Math.sin(ph) * r * .9;
      ctx.fillStyle = `rgba(150,210,255,${.9 - (i % 14) / 16})`;
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
    }
  }
  // downwash between tips, upwash outboard
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * half * .26, y = cy + half * .2 + ((S.t * 30) % 20);
    App.arrow2d(ctx, x, y, x, y + 20, "rgba(255,207,90,.7)", 1.6);
  }
  for (const s of [-1, 1]) { const x = cx + s * half * 1.1, y = cy + half * .25 - ((S.t * 30) % 20); if (x > 10 && x < W - 10) App.arrow2d(ctx, x, y, x, y - 18, "rgba(92,194,174,.7)", 1.6); }
  App.label(ctx, "view from behind", 12, 20, T["stage-muted"], "left", 11);
  App.label(ctx, "downwash", cx, cy + half * .2 + 50, T["hi"], "center", 11);
  App.label(ctx, "tip vortex", cx + half * .96, cy - half * .06 - half * .32, "rgb(150,210,255)", "center", 11);
}

function drawSweep(ctx) {
  const T = App.tokens, G = App.geo;
  // top view, nose up the screen
  const k = Math.min(W / 40, H / 30), cx = W / 2, cy = H * .38;
  const P = (x, y) => [cx + y * k, cy - x * k];
  ctx.fillStyle = T["metal"];
  ctx.beginPath();
  const ys = []; for (let y = G.y0; y <= G.y1; y += .5) ys.push(y);
  for (const s of [1, -1]) {
    ctx.beginPath();
    ys.forEach((y, i) => { const [a, b] = P(G.wLE(y), y * s); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
    ys.slice().reverse().forEach(y => { const [a, b] = P(G.wTE(y), y * s); ctx.lineTo(a, b); });
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = T["metal-hi"];
  ctx.beginPath(); ctx.ellipse(cx, cy + 1.5 * k, 2 * k, 15 * k, 0, 0, 7); ctx.fill();
  // streaming free-stream lines
  ctx.strokeStyle = "rgba(150,200,240,.35)"; ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    const x = cx + i * W / 13, off = (S.t * 60 + i * 13) % 40;
    for (let y = -40 + off; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); }
  }
  // decomposition at mid-span right wing
  const y = 12.5, [px, py] = P(G.wLE(y) - .4 * (G.wLE(y) - G.wTE(y)), y);
  const L = 80 * Math.min(1, W / 600) + 30, sw = 27 * D;
  App.arrow2d(ctx, px, py - L, px, py, "#ffffff", 2.4);
  // component perpendicular to the leading edge (aft and inboard on the right wing)
  const ex = px - Math.sin(sw) * Math.cos(sw) * L, ey = py - L + Math.cos(sw) * Math.cos(sw) * L;
  App.arrow2d(ctx, px, py - L, ex, ey, T["hi"], 2.4);
  App.arrow2d(ctx, ex, ey, px, py, T["lp"], 2.0);
  App.label(ctx, "M 0.78", px - 8, py - L + 14, "#fff", "right", 12);
  App.label(ctx, "felt by airfoil: M 0.71", ex - 8, ey + 4, T["hi"], "right", 12);
  App.label(ctx, "along span", (ex + px) / 2 + 4, (ey + py) / 2 + 16, T["lp"], "left", 11);
  App.label(ctx, "top view, 25° sweep at quarter chord", 12, H - 12, T["stage-muted"], "left", 11);
}

/* ---------- chapter ---------- */
function onStep(i, st) {
  S.step = i; S.scene = st.scene;
  if (st.scene === "tunnel") {
    S.alphaT = st.alpha; S.manual = false;
    S.field = !!st.field; S.labels = !!st.labels; S.timeline = !!st.timeline;
    ui.q("#flField").setAttribute("aria-pressed", String(S.field));
    if (!S.timeline) S.marks = [];
    S.nextMark = 0;
  }
  ui.q("#flTunnelCtl").hidden = st.scene !== "tunnel";
  ui.q("#flSpeedCtl").hidden = !(st.speed || st.scene === "drag");
  stage.title.textContent = { forces: "Forces in flight", tunnel: "Wind tunnel", drag: "Drag curve", vortex: "Wingtip vortices", sweep: "Swept wing" }[st.scene];
  stage.cond.textContent = { forces: "Single-aisle airliner, steady cruise", tunnel: "Wind tunnel: exact potential flow around a cambered airfoil", drag: "Drag versus airspeed for a 64-tonne airliner", vortex: "Trailing vortices behind a lifting wing", sweep: "Swept wing at Mach 0.78" }[st.scene];
  updateReadouts();
}
function updateReadouts() {
  const st = STEPS[S.step];
  if (S.scene === "tunnel") {
    const cl = clReal(S.alpha);
    const rows = [["Angle of attack", `${S.alpha.toFixed(1)}<small>deg</small>`], ["Lift coeff.", `${cl.toFixed(2)}<small>C<sub>L</sub></small>`]];
    if (st.speed) rows.push(["Lift ÷ weight", `${fmt(lift(S.vkt, cl) / AC.W * 100)}<small>% at ${S.vkt} kt</small>`]);
    else rows.push(["Pressure top/bottom", `${cl > 0 ? "lower" : "higher"}<small>${S.alpha > 14 ? "stalled" : "attached"}</small>`]);
    stage.setReadouts(rows);
  } else if (S.scene === "drag") {
    const [p, ind] = dragParts(S.vkt);
    stage.setReadouts([["Airspeed", `${S.vkt}<small>kt</small>`], ["Total drag", `${fmt((p + ind) / 1000)}<small>kN</small>`], ["Lift ÷ drag", `${(AC.W / (p + ind)).toFixed(1)}<small>: 1</small>`]]);
  } else if (S.scene === "vortex") {
    stage.setReadouts([["Wingspan", `35.8<small>m</small>`], ["Aspect ratio", `9.5<small>span²/area</small>`], ["Induced drag", `~40<small>% of cruise drag</small>`]]);
  } else if (S.scene === "sweep") {
    stage.setReadouts([["Flight Mach", `0.78`], ["Sweep", `25<small>deg</small>`], ["Mach ⟂ leading edge", `0.71`]]);
  } else {
    stage.setReadouts([["Lift = weight", `630<small>kN</small>`], ["Thrust = drag", `37<small>kN</small>`], ["Lift ÷ drag", `17<small>: 1</small>`]]);
  }
}

App.register({
  id: "flight", nav: "How planes fly",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, {
      title: "Wind tunnel", aspect: "2 / 1",
      controls: `<span class="ctl-row" id="flTunnelCtl"><label class="rng" for="flAlpha">Angle <input type="range" id="flAlpha" min="-4" max="20" step="0.5" value="4"><output id="flAlphaOut">4°</output></label>
        <button class="ctrl-btn" type="button" id="flField" aria-pressed="false">Pressure field</button>
        <button class="ctrl-btn" type="button" id="flTime">Release markers</button></span>
        <span class="ctl-row" id="flSpeedCtl" hidden><label class="rng" for="flSpeed">Speed <input type="range" id="flSpeed" min="100" max="350" step="5" value="140"><output id="flSpeedOut">140 kt</output></label></span>`
    });
    ui.q = s => stage.root.querySelector(s);
    cv = stage.cv;
    ui.q("#flAlpha").addEventListener("input", e => { S.alphaT = +e.target.value; S.manual = true; });
    ui.q("#flField").addEventListener("click", () => { S.field = !S.field; ui.q("#flField").setAttribute("aria-pressed", String(S.field)); });
    ui.q("#flTime").addEventListener("click", () => releaseMarks());
    ui.q("#flSpeed").addEventListener("input", e => { S.vkt = +e.target.value; ui.q("#flSpeedOut").textContent = `${S.vkt} kt`; updateReadouts(); });
    scrolly = this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    ui.extras.innerHTML = `<span class="label">Reference</span><h2>Numbers that keep it flying</h2>
      <p class="lede">Typical values for a 180-seat single-aisle airliner. These are the inputs behind the readouts in this chapter.</p>
      <div class="scroll-x"><table><thead><tr><th>Quantity</th><th class="num">Value</th><th>What it means</th></tr></thead><tbody>
      <tr><td>Wing area</td><td class="num">122.6 m²</td><td>The S in the lift equation. Roughly two tennis courts.</td></tr>
      <tr><td>Wingspan</td><td class="num">35.8 m</td><td>Limited by airport gate sizes as much as by aerodynamics.</td></tr>
      <tr><td>Wing loading</td><td class="num">~600 kg/m²</td><td>Weight per area of wing. A light aircraft is about 70 kg/m².</td></tr>
      <tr><td>Max lift coeff., clean</td><td class="num">~1.5</td><td>Whole aircraft without flaps or slats. A 2-D wing section, as in the tunnel, reaches more.</td></tr>
      <tr><td>Max lift coeff., landing</td><td class="num">~2.8</td><td>With full flaps and slats extended.</td></tr>
      <tr><td>Stall angle</td><td class="num">~15°</td><td>Critical angle of attack, roughly the same at any speed.</td></tr>
      <tr><td>Cruise lift-to-drag</td><td class="num">~17</td><td>Glide ratio too: from 35,000 ft with no engines, about 100 nm.</td></tr>
      <tr><td>Approach speed</td><td class="num">~135 kt</td><td>About 1.23 times the stall speed in landing configuration.</td></tr>
      </tbody></table></div>`;
  },
  activate() { this.resize(); },
  resize() { cv.fit(); W = cv.w; H = cv.h; if (!S.parts.length || this._w !== W) { resetParticles(); this._w = W; } },
  frame(dt) {
    if (!W) return;
    const ctx = cv.begin();
    S.t += dt;
    ctx.fillStyle = App.tokens["stage-bg"]; ctx.fillRect(0, 0, W, H);
    if (S.scene === "tunnel") {
      const prev = S.alpha;
      S.alpha += (S.alphaT - S.alpha) * Math.min(1, dt * 3);
      if (Math.abs(S.alpha - S.alphaT) < .01) S.alpha = S.alphaT;
      if (!S.manual) { const inp = ui.q("#flAlpha"); if (+inp.value !== S.alphaT) inp.value = S.alphaT; }
      ui.q("#flAlphaOut").textContent = `${S.alpha.toFixed(1)}°`;
      if (Math.abs(prev - S.alpha) > .001 || !this._ro) { updateReadouts(); this._ro = true; }
      const a = S.alpha * D, h = .045;
      for (const p of S.parts) {
        p.life += dt;
        let ok = advect(p, h * (App.reduceMotion ? .4 : 1), a);
        if (ok && S.alpha > 13.5 && p.x > -.6 && p.y > -.2) { const st = (S.alpha - 13.5) / 4; p.y += (Math.random() - .3) * .03 * st; }
        if (!ok || p.x > DOM.x1 + .2 || p.y < DOM.y0 - .5 || p.y > DOM.y1 + .5 || p.life > 14) spawn(p, false);
      }
      if (S.timeline && S.t > (S.nextMark || 0)) releaseMarks();
      S.marks = S.marks.filter(m => { const ok = advect(m, h, a); return ok && m.x < DOM.x1; });
      drawTunnel(ctx);
    } else if (S.scene === "forces") drawForces(ctx);
    else if (S.scene === "drag") drawDrag(ctx);
    else if (S.scene === "vortex") drawVortex(ctx);
    else if (S.scene === "sweep") drawSweep(ctx);
  }
});
function releaseMarks() {
  S.nextMark = S.t + 6;
  for (let i = 0; i <= 26; i++) S.marks.push({ x: -3.6, y: -1.3 + i * .1, px: -3.6, py: 0 });
}
})();
