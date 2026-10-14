/* Chapter: Systems. Animated schematics of how an airliner is run:
   displays, fly-by-wire, hydraulics, electrics, fuel, air and autoland. */
(() => {
"use strict";
const { clamp, lerp, fmt, deg: D } = App;

const HYD = { green: "#4cbf6a", blue: "#4f86e8", yellow: "#e6c84a" };
const STEPS = [
  { overview: true, kicker: "Chapter 6", title: "Systems", scene: "pfd",
    tagline: "Behind the cockpit: dozens of computers, three hydraulic systems, several electrical networks and a lot of plumbing.",
    body: "<p>The airframe and engines make an aircraft that can fly. Its systems make one that can be flown safely, for hours, with two pilots and in any weather. Almost every one of them is duplicated or triplicated, so that no single failure can bring the aircraft down.</p><p>The examples follow a typical fly-by-wire single-aisle airliner.</p>",
    facts: [["Flight control computers", "7 on a typical fly-by-wire single-aisle jet"], ["Hydraulic systems", "3 independent, at 3,000 psi (207 bar)"], ["Electrical", "115 V AC at 400 Hz, 28 V DC"]],
    ro: [["Redundancy", "×2–3<small>per system</small>"], ["Flight computers", "7"], ["Hydraulic systems", "3"]] },
  { title: "Primary flight display", tag: "Cockpit", scene: "pfd",
    body: "<p>The primary flight display gathers everything needed to fly into one screen. The artificial horizon in the middle shows pitch and bank. The tape on the left is airspeed, the one on the right altitude, with vertical speed beside it, and heading runs along the bottom.</p><p>Across the top, the flight mode annunciator says what the autopilot and autothrust are doing. Misreading modes is a classic cause of incidents, so pilots call out every change.</p>",
    ro: [["Speed", "250<small>kt</small>"], ["Altitude", "FL350"], ["Displays", "6<small>screens</small>"]] },
  { title: "Fly-by-wire", tag: "Signals not cables", scene: "fbw",
    body: "<p>In older aircraft, the control column pulled steel cables and pushrods to the surfaces. In a fly-by-wire aircraft the sidestick is a sensor: it sends an electrical signal to the flight control computers, which decide how far to move each surface and command hydraulic actuators.</p><p>The pilot asks for a rate of roll or a load factor, not a surface angle. The computers work out the deflection needed at this speed and weight, and keep the aircraft where it was left when the stick is released.</p>",
    ro: [["Computers", "7<small>ELAC, SEC, FAC</small>"], ["Data sources", "3<small>ADIRU</small>"], ["Actuators", "2–3<small>per surface</small>"]] },
  { title: "Envelope protection", tag: "Hard limits", scene: "protect",
    body: "<p>Because every command passes through the computers, they can refuse dangerous ones. In normal operation the aircraft will not exceed set limits on pitch, bank, load factor, angle of attack and speed, however hard the stick is pushed. A pilot can pull fully back in an emergency and get the maximum safe performance, without stalling or overstressing the airframe.</p><p>If sensors disagree or computers fail, the system steps down to simpler laws with fewer protections, and the crew is told.</p>",
    ro: [["Max bank", "67<small>°</small>"], ["Max pitch", "+30 / −15<small>°</small>"], ["Load factor", "+2.5 / −1<small>g</small>"]] },
  { title: "Hydraulics", tag: "Muscle", scene: "hyd",
    body: "<p>Moving a control surface against hundreds of knots of airflow needs serious force. Three separate hydraulic systems, called green, blue and yellow, each pump fluid at 3,000 psi to actuators around the aircraft. Engine-driven pumps power green and yellow; an electric pump powers blue.</p><p>Every flight control is fed by at least two systems. A power transfer unit lets green and yellow help each other, and a ram air turbine can drop into the airflow to power the blue system if both engines fail.</p>",
    ro: [["Pressure", "3,000<small>psi</small>"], ["Systems", "3<small>independent</small>"], ["Backup", "RAT<small>ram air turbine</small>"]] },
  { title: "Electrical power", tag: "115 V · 400 Hz", scene: "elec",
    body: "<p>Each engine drives a generator through a constant-speed drive, producing 115 V AC at 400 Hz. The higher frequency than mains power lets transformers and motors be smaller and lighter. Transformer-rectifiers make 28 V DC for avionics, and batteries keep the essentials alive.</p><p>Power can come from either engine, the auxiliary power unit (APU) in the tail, ground power at the gate, or in an emergency the ram air turbine. Either engine's generator alone can power the whole aircraft.</p>",
    ro: [["Generators", "90<small>kVA each</small>"], ["AC", "115<small>V, 400 Hz</small>"], ["DC", "28<small>V</small>"]] },
  { title: "Fuel", tag: "Wing tanks", scene: "fuel",
    body: "<p>Fuel lives inside the wing boxes and the centre wing box: the wing structure is the tank. Pumps in each tank feed the engines, with a crossfeed valve to let either side supply either engine.</p><p>The order matters. The centre tank is emptied first, while fuel in the wings is kept as long as possible because its weight bends the wings down against the lift, relieving stress at the root. Outer tanks drain last for the same reason.</p>",
    ro: [["Capacity", "~19<small>t</small>"], ["Cruise burn", "~2.4<small>t per hour</small>"], ["Tanks", "5"]] },
  { title: "Air and pressurisation", tag: "Environmental control", scene: "ecs",
    body: "<p>Hot, compressed air is bled from the engines' compressors at around 200 °C. Air-conditioning packs cool it by expanding it through a turbine, a reverse jet engine in miniature, then a mixer blends it with filtered cabin air before it is blown into the cabin.</p><p>An outflow valve at the back controls how fast air leaves, which sets the cabin pressure. Cabin air is replaced every two to three minutes, and the recirculated half passes through hospital-grade HEPA filters. Some newer jets use electric compressors instead of engine bleed.</p>",
    ro: [["Bleed air", "~200<small>°C</small>"], ["Air change", "2–3<small>min</small>"], ["Recirculated", "~50<small>% HEPA filtered</small>"]] },
  { title: "Autopilot and ILS", tag: "Down to the runway", scene: "ils",
    body: "<p>The autopilot flies the paths the crew select: a heading, an altitude, a route from the flight management computer, or an approach. The instrument landing system (ILS) gives it two radio beams from the runway: a localizer for left and right, and a glideslope for up and down, usually 3°.</p><p>The aircraft centres itself in both beams and descends at about 300 ft per nautical mile. With the right equipment and crew training, it can land itself and steer down the runway in fog with 75 m of visibility.</p>",
    ro: [["Glideslope", "3<small>°</small>"], ["Descent", "~700<small>ft/min at 140 kt</small>"], ["Autoland", "CAT III<small>in fog</small>"]] }
];

const S = { step: 0, t: 0, scene: "pfd" };
let ui, stage, cv, W = 0, H = 0, ctx;

/* ---------- drawing helpers (normalized coordinates) ---------- */
const px = (x, y) => [x * W, y * H];
function box(x, y, title, sub, o = {}) {
  const T = App.tokens, w = o.w || Math.min(W * .19, 140), h = sub ? 36 : 26;
  const [cx, cy] = px(x, y), x0 = cx - w / 2, y0 = cy - h / 2;
  ctx.fillStyle = o.fill || T["stage-panel"];
  ctx.strokeStyle = o.hl ? T["hi"] : o.col || T["stage-rule"]; ctx.lineWidth = o.hl ? 1.6 : 1;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, w, h, 4) : ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke();
  const fs = W < 520 ? 10.5 : 12.5;
  ctx.font = `600 ${fs + 1}px 'Saira Condensed', sans-serif`; ctx.fillStyle = o.col || T["stage-fg"]; ctx.textAlign = "center";
  ctx.fillText(title.toUpperCase(), cx, sub ? cy - 2 : cy + 4.5);
  if (sub) { ctx.font = `${fs - 3}px 'IBM Plex Mono', monospace`; ctx.fillStyle = T["stage-muted"]; ctx.fillText(sub, cx, cy + 11); }
  return { x0, y0, w, h, cx, cy };
}
function wire(pts, col, speed = 1, width = 2, dashGap = 16) {
  const P = pts.map(([x, y]) => px(x, y));
  ctx.strokeStyle = col; ctx.globalAlpha = .35; ctx.lineWidth = width; ctx.lineJoin = "round";
  ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  ctx.globalAlpha = 1;
  if (!speed) return;
  // moving dots show the direction of flow
  let total = 0; const segs = [];
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segs.push(l); total += l; }
  ctx.fillStyle = col;
  const off = ((S.t * 45 * speed) % dashGap + dashGap) % dashGap;
  for (let d = off; d < total; d += dashGap) {
    let k = 0, acc = 0; while (k < segs.length - 1 && acc + segs[k] < d) { acc += segs[k]; k++; }
    const f = segs[k] ? (d - acc) / segs[k] : 0;
    const x = P[k][0] + (P[k + 1][0] - P[k][0]) * f, y = P[k][1] + (P[k + 1][1] - P[k][1]) * f;
    ctx.beginPath(); ctx.arc(x, y, width + .6, 0, 7); ctx.fill();
  }
}
const lab = (t, x, y, col, al = "left", size) => { const [a, b] = px(x, y); App.label(ctx, t, a, b, col || App.tokens["stage-muted"], al, size || (W < 520 ? 9.5 : 11)); };

/* ---------- scenes ---------- */
function scenePFD() {
  const T = App.tokens;
  const s = Math.min(W * .9, H * 1.45), ox = (W - s) / 2, oy = (H - s * .66) / 2;
  const u = v => v * s / 100; // design grid: 100 wide, 66 tall
  const bank = 12 * Math.sin(S.t * .35), pitch = 2.5 + 1.8 * Math.sin(S.t * .27);
  const spd = 250 + 2 * Math.sin(S.t * .5), alt = 35000 + 60 * Math.sin(S.t * .22), vs = 60 * .22 * Math.cos(S.t * .22) * 60, hdg = (90 + 6 * Math.sin(S.t * .18) + 360) % 360;
  ctx.save(); ctx.translate(ox, oy);
  // FMA
  ctx.strokeStyle = T["stage-rule"]; ctx.lineWidth = 1;
  const fma = ["SPEED", "ALT CRZ", "NAV", "", "AP1 · A/THR"];
  fma.forEach((t, i) => { const x = u(14 + i * 15); ctx.strokeRect(x, u(1), u(15), u(6)); App.label(ctx, t, x + u(7.5), u(5.2), i === 4 ? "#fff" : "#4cbf6a", "center", Math.max(8, u(2.4))); });
  // attitude
  const ax = u(30), ay = u(10), aw = u(40), ah = u(40), cx = ax + aw / 2, cy = ay + ah / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(-bank * D); ctx.translate(0, pitch * u(1.3));
  ctx.fillStyle = "#2f7fd1"; ctx.fillRect(-u(60), -u(80), u(120), u(80));
  ctx.fillStyle = "#7a4a22"; ctx.fillRect(-u(60), 0, u(120), u(80));
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-u(60), 0); ctx.lineTo(u(60), 0); ctx.stroke();
  ctx.lineWidth = 1;
  for (let p = -20; p <= 20; p += 2.5) { if (!p) continue; const y = -p * u(1.3), w = p % 10 === 0 ? u(9) : p % 5 === 0 ? u(5) : u(2.5); ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke(); if (p % 10 === 0) App.label(ctx, String(Math.abs(p)), w + u(1), y + 4, "#fff", "left", Math.max(8, u(2.2))); }
  ctx.restore();
  // aircraft symbol
  ctx.strokeStyle = "#ffd166"; ctx.lineWidth = Math.max(2, u(.8));
  ctx.beginPath(); ctx.moveTo(cx - u(14), cy); ctx.lineTo(cx - u(5), cy); ctx.lineTo(cx - u(5), cy + u(2)); ctx.moveTo(cx + u(14), cy); ctx.lineTo(cx + u(5), cy); ctx.lineTo(cx + u(5), cy + u(2)); ctx.stroke();
  ctx.fillStyle = "#ffd166"; ctx.fillRect(cx - u(.8), cy - u(.8), u(1.6), u(1.6));
  // bank pointer
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-bank * D); ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.moveTo(0, -u(17)); ctx.lineTo(-u(1.5), -u(14.5)); ctx.lineTo(u(1.5), -u(14.5)); ctx.fill(); ctx.restore();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, u(17.5), -Math.PI / 2 - 45 * D, -Math.PI / 2 + 45 * D); ctx.stroke();
  // tapes
  const tape = (x, w, val, step, fmtF, label, right) => {
    ctx.fillStyle = "rgba(60,70,80,.55)"; ctx.fillRect(x, ay, w, ah);
    ctx.save(); ctx.beginPath(); ctx.rect(x, ay, w, ah); ctx.clip();
    const pxPer = ah / (step * 8);
    const base = Math.floor(val / step) * step;
    for (let v = base - step * 5; v <= base + step * 5; v += step) {
      const y = cy - (v - val) * pxPer;
      ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.moveTo(right ? x : x + w - u(2), y); ctx.lineTo(right ? x + u(2) : x + w, y); ctx.stroke();
      App.label(ctx, fmtF(v), right ? x + u(3) : x + w - u(3), y + 4, "#fff", right ? "left" : "right", Math.max(8, u(2.3)));
    }
    ctx.restore();
    ctx.fillStyle = "#000"; ctx.strokeStyle = "#ffd166"; ctx.fillRect(x, cy - u(2.6), w, u(5.2)); ctx.strokeRect(x, cy - u(2.6), w, u(5.2));
    App.label(ctx, label, x + w / 2, cy + u(1.2), "#4cbf6a", "center", Math.max(9, u(2.8)));
  };
  tape(u(14), u(12), spd, 10, v => String(v), String(Math.round(spd)));
  tape(u(74), u(14), alt, 100, v => v % 500 === 0 ? String(v / 100) : "", String(Math.round(alt / 20) * 20));
  // vertical speed
  ctx.strokeStyle = T["stage-muted"]; ctx.strokeRect(u(89), ay + u(6), u(4), ah - u(12));
  ctx.strokeStyle = "#4cbf6a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(u(93), cy); ctx.lineTo(u(89.5), cy - clamp(vs / 2000, -1, 1) * u(14)); ctx.stroke();
  // heading
  ctx.fillStyle = "rgba(60,70,80,.55)"; ctx.fillRect(ax, u(54), aw, u(7));
  ctx.save(); ctx.beginPath(); ctx.rect(ax, u(54), aw, u(7)); ctx.clip();
  for (let h = Math.floor(hdg / 5) * 5 - 30; h <= hdg + 30; h += 5) {
    const x = cx + (h - hdg) * u(1.3);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, u(54)); ctx.lineTo(x, u(54) + (h % 10 === 0 ? u(2) : u(1))); ctx.stroke();
    if (h % 10 === 0) App.label(ctx, String(((h % 360) + 360) % 360 / 10 | 0), x, u(59.5), "#fff", "center", Math.max(8, u(2.3)));
  }
  ctx.restore();
  ctx.fillStyle = "#ffd166"; ctx.fillRect(cx - 1, u(53), 2, u(4));
  App.label(ctx, "speed", u(20), ay - u(1), T["stage-muted"], "center", Math.max(8, u(2)));
  App.label(ctx, "altitude", u(81), ay - u(1), T["stage-muted"], "center", Math.max(8, u(2)));
  App.label(ctx, "V/S", u(91), ay + u(4.5), T["stage-muted"], "center", Math.max(8, u(2)));
  App.label(ctx, "heading", cx, u(64.5), T["stage-muted"], "center", Math.max(8, u(2)));
  ctx.restore();
}

function sceneFBW(protect) {
  const T = App.tokens, sig = T["lp"];
  const comp = [[.38, .3, "ELAC ×2", "elevator, aileron"], [.38, .52, "SEC ×3", "spoilers, elevator"], [.38, .74, "FAC ×2", "rudder, yaw damper"]];
  const surf = [[.88, .16, "Elevators"], [.88, .34, "Ailerons"], [.88, .52, "Spoilers"], [.88, .7, "Rudder"], [.88, .88, "Stab trim"]];
  const links = [[0, 0], [0, 1], [0, 4], [1, 2], [1, 0], [1, 4], [2, 3]];
  // stick to computers
  comp.forEach(c => wire([[.1, .52], [.22, .52], [.22, c[1]], [c[0] - .09, c[1]]], sig, 1));
  // air data/inertial into computers
  wire([[.38, .1], [.38, .3 - .05]], "#82b1ff", .6);
  // computers to surfaces
  links.forEach(([ci, si], k) => { const c = comp[ci], s = surf[si], mx = .6 + k * .022; wire([[c[0] + .09, c[1] + (k % 2 ? .015 : -.015)], [mx, c[1] + (k % 2 ? .015 : -.015)], [mx, s[1]], [s[0] - .08, s[1]]], sig, 1.3, 1.6); });
  box(.1, .52, "Sidestick", "pilot input", { w: Math.min(W * .15, 110) });
  box(.38, .1, "ADIRU ×3", "air data + inertial");
  comp.forEach(c => box(c[0], c[1], c[2], c[3], { hl: protect }));
  surf.forEach(s => box(s[0], s[1], s[2], "hydraulic jacks", { w: Math.min(W * .17, 120) }));
  lab("electrical signals", .5, .97, sig, "center");
  if (protect) {
    const T2 = App.tokens, items = ["Bank ≤ 67°", "Pitch +30° / −15°", "Load factor +2.5 / −1 g", "Angle of attack ≤ α max", "Speed ≤ VMO + margin"];
    const [x0, y0] = px(.02, .7), w = Math.min(W * .27, 200), lh = W < 520 ? 13 : 16;
    ctx.fillStyle = "rgba(12,19,23,.92)"; ctx.strokeStyle = T2["hi"]; ctx.fillRect(x0, y0, w, lh * items.length + 22); ctx.strokeRect(x0, y0, w, lh * items.length + 22);
    App.label(ctx, "NORMAL LAW LIMITS", x0 + 8, y0 + 15, T2["hi"], "left", W < 520 ? 9 : 11);
    items.forEach((t, i) => App.label(ctx, t, x0 + 8, y0 + 32 + i * lh, T2["stage-fg"], "left", W < 520 ? 9 : 11));
  }
}

function sceneHyd() {
  const rails = [["green", .2, "Engine 1 pump"], ["blue", .5, "Electric pump"], ["yellow", .8, "Engine 2 pump"]];
  rails.forEach(([c, y, src]) => { wire([[.17, y], [.74, y]], HYD[c], 1, 3); box(.09, y, src, c === "blue" ? "+ RAT backup" : c === "yellow" ? "+ electric pump" : "3,000 psi", { col: HYD[c], w: Math.min(W * .16, 118) }); });
  // PTU between green and yellow
  wire([[.3, .2], [.3, .8]], "#9aa5ad", Math.sin(S.t * .5) > 0 ? .5 : -.5, 1.5);
  box(.3, .5, "PTU", "", { w: Math.min(W * .08, 50) });
  const cons = [[.88, .1, "Landing gear", ["green"]], [.88, .26, "Normal brakes", ["green"]], [.88, .42, "Slats", ["green", "blue"]], [.88, .58, "Flaps", ["green", "yellow"]], [.88, .74, "Cargo doors", ["yellow"]], [.88, .9, "Alternate brakes", ["yellow"]]];
  cons.forEach(([x, y, n, sys]) => sys.forEach((s, k) => { const ry = rails.find(r => r[0] === s)[1], mx = .76 + k * .015; wire([[mx - .02, ry], [mx, ry], [mx, y + (k ? .012 : -.012)], [x - .08, y + (k ? .012 : -.012)]], HYD[s], 1, 1.8); }));
  // flight controls take from all three
  ["green", "blue", "yellow"].forEach((s, k) => { const ry = rails.find(r => r[0] === s)[1]; wire([[.55 + k * .02, ry], [.55 + k * .02, .35 + k * .015]], HYD[s], 1, 1.6); });
  box(.58, .35, "Flight controls", "2–3 systems each", { w: Math.min(W * .2, 140) });
  cons.forEach(([x, y, n]) => box(x, y, n, "", { w: Math.min(W * .18, 128) }));
}

function sceneElec() {
  const T = App.tokens, e = T["hi"], dc = "#82b1ff";
  const ac1 = [.24, .36], ac2 = [.76, .36], ess = [.5, .58];
  wire([[.1, .14], [.1, .36], [ac1[0] - .08, .36]], e, 1); wire([[.9, .14], [.9, .36], [ac2[0] + .08, .36]], e, 1);
  wire([[.5, .14], [.5, .36]], e, .2, 1.5); wire([[ac1[0] + .08, .36], [ac2[0] - .08, .36]], e, 0, 1.5);
  wire([[ac1[0], .36 + .03], [ac1[0], .58 - .03]], e, 1); wire([[ac2[0], .36 + .03], [ac2[0], .58 - .03]], e, 1);
  wire([[ac1[0] + .06, .42], [.5, .42], [.5, .58 - .03]], e, 1);
  wire([[ac1[0], .58 + .03], [ac1[0], .8 - .03]], dc, 1); wire([[ac2[0], .58 + .03], [ac2[0], .8 - .03]], dc, 1);
  wire([[ac1[0] + .08, .8], [.5 - .08, .8]], dc, .7); wire([[ac2[0] - .08, .8], [.5 + .08, .8]], dc, .7);
  wire([[.4, .95], [.5, .95], [.5, .8 + .03]], dc, .5, 1.5); wire([[.6, .95], [.5, .95]], dc, .5, 1.5);
  wire([[.92, .66], [.92, .58], [.5 + .09, .58]], "#9aa5ad", 0, 1.5);
  box(.1, .14, "Generator 1", "engine 1, 90 kVA"); box(.9, .14, "Generator 2", "engine 2, 90 kVA"); box(.5, .14, "APU gen.", "or ground power");
  box(ac1[0], ac1[1], "AC bus 1", "115 V 400 Hz", { col: e }); box(ac2[0], ac2[1], "AC bus 2", "115 V 400 Hz", { col: e });
  box(.5, .58, "AC essential", "flight-critical"); box(ac1[0], .58, "TR 1", "AC → 28 V DC"); box(ac2[0], .58, "TR 2", "AC → 28 V DC");
  box(ac1[0], .8, "DC bus 1", "", { col: dc }); box(ac2[0], .8, "DC bus 2", "", { col: dc }); box(.5, .8, "DC battery bus", "", { col: dc });
  box(.4, .95, "Battery 1", "", { w: Math.min(W * .12, 84) }); box(.6, .95, "Battery 2", "", { w: Math.min(W * .12, 84) });
  box(.92, .72, "RAT", "emergency gen.", { w: Math.min(W * .13, 96) });
  lab("bus tie", .5, .33, T["stage-muted"], "center");
}

function sceneFuel() {
  const T = App.tokens, G = App.geo;
  const k = Math.min(W / 40, H / 27), cx = W / 2, cy = H * .42;
  const P = (x, y) => [cx + y * k, cy - x * k];
  // planform
  ctx.fillStyle = T["metal"];
  const ys = []; for (let y = G.y0; y <= G.y1; y += .5) ys.push(y);
  for (const s of [1, -1]) { ctx.beginPath(); ys.forEach((y, i) => { const [a, b] = P(G.wLE(y), y * s); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ys.slice().reverse().forEach(y => { const [a, b] = P(G.wTE(y), y * s); ctx.lineTo(a, b); }); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = T["metal-hi"]; ctx.beginPath(); ctx.ellipse(cx, cy - 1 * k, 2 * k, 18 * k, 0, 0, 7); ctx.fill();
  // fuel state: a repeating flight. Centre empties first, then inners; outers transfer last.
  const cyc = (S.t % 40) / 40;
  const cen = clamp(1 - cyc / .35, 0, 1), inner = cyc < .35 ? 1 : clamp(1 - (cyc - .35) / .6, .08, 1), outer = cyc < .8 ? 1 : clamp(1 - (cyc - .8) / .2, .1, 1);
  const cap = { outer: 690, inner: 5440, centre: 6480 };
  const tank = (y0, y1, lvl, name, kg) => {
    for (const s of y0 < 0 ? [1] : [1, -1]) {
      const a = Math.abs(y0) === 0 ? -G.y0 : y0, b = y0 === 0 ? G.y0 : y1;
      const pts = [];
      if (y0 === 0) { pts.push(P(G.wPt(G.y0, .15)[0], -G.y0), P(G.wPt(G.y0, .15)[0], G.y0), P(G.wPt(G.y0, .65)[0], G.y0), P(G.wPt(G.y0, .65)[0], -G.y0)); }
      else { for (let y = y0; y <= y1 + .01; y += .5) pts.push(P(G.wPt(y, .15)[0], y * s)); for (let y = y1; y >= y0 - .01; y -= .5) pts.push(P(G.wPt(y, .65)[0], y * s)); }
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fillStyle = `rgba(230,200,74,${.12 + .7 * lvl})`; ctx.fill(); ctx.strokeStyle = "#e6c84a"; ctx.lineWidth = 1.2; ctx.stroke();
      const c = pts.reduce((m, p) => [m[0] + p[0] / pts.length, m[1] + p[1] / pts.length], [0, 0]);
      if (y0 === 0 || s === 1 || W > 520) { App.label(ctx, `${fmt(kg * lvl)} kg`, c[0], c[1] + 4, "#0c1317", "center", W < 520 ? 9 : 11); }
      if (y0 === 0) break;
    }
  };
  tank(0, 0, cen, "centre", cap.centre);
  tank(G.y0, 11, inner, "inner", cap.inner);
  tank(11, 15.5, outer, "outer", cap.outer);
  // engines and feeds
  for (const s of [1, -1]) {
    const [ex, ey] = P(3.2, 5.75 * s);
    ctx.fillStyle = T["hub"]; ctx.fillRect(ex - k * 1, ey - k * 2.2, k * 2, k * 4.4);
    const from = cen > 0 ? [0.2, 1 * s] : [G.wPt(5.75, .4)[0], 5.75 * s];
    wire([[(cx + from[1] * k) / W, (cy - from[0] * k) / H], [(cx + 5.75 * s * k) / W, (cy - from[0] * k) / H], [ex / W, (ey + k * 2.2) / H]], "#e6c84a", 1, 2);
  }
  wire([[(cx - 4 * k) / W, (cy + 1.6 * k) / H], [(cx + 4 * k) / W, (cy + 1.6 * k) / H]], "#9aa5ad", 0, 1.5);
  lab("crossfeed (closed)", (cx) / W, (cy + 2.8 * k) / H + .03, T["stage-muted"], "center");
  lab(cen > 0 ? "feeding from centre tank" : outer < 1 ? "outer tanks transferring to inners" : "feeding from inner tanks", .02, .96, "#e6c84a");
  lab(`flight progress ${Math.round(cyc * 100)}%`, .98, .96, T["stage-muted"], "right");
}

function sceneECS() {
  const hot = "#ff8a65", cold = "#82b1ff", mix = "#5cc2ae";
  for (const [y, n] of [[.24, 1], [.76, 2]]) {
    wire([[.1, y], [.27, y]], hot, 1); wire([[.27, y], [.47, y]], hot, 1);
    wire([[.47, y], [.66, y], [.66, .5]], cold, 1);
    box(.1, y, `Engine ${n}`, "bleed ~200 °C, 3 bar", { w: Math.min(W * .17, 124) });
    box(.28, y, "Precooler", "fan air", { w: Math.min(W * .13, 92) });
    box(.47, y, `Pack ${n}`, "air cycle machine", { w: Math.min(W * .16, 116) });
  }
  wire([[.66, .5], [.86, .5]], mix, 1, 2.5);
  wire([[.86, .44], [.86, .1], [.66, .1], [.66, .44]], mix, .8, 1.6);
  wire([[.86, .56], [.86, .86]], "#9aa5ad", .8, 1.6);
  box(.66, .5, "Mixer", "", { w: Math.min(W * .11, 78) });
  box(.86, .5, "Cabin", "~22 °C", { w: Math.min(W * .14, 100), hl: true });
  box(.76, .1, "Recirculation", "HEPA filters", { w: Math.min(W * .16, 116) });
  box(.86, .88, "Outflow valve", "sets cabin pressure", { w: Math.min(W * .19, 136) });
  lab("hot", .19, .2, hot, "center"); lab("cold", .56, .2, cold, "center");
  lab("overboard ↓", .86, .99, App.tokens["stage-muted"], "center");
}

function sceneILS() {
  const T = App.tokens;
  const pad = 14, w = W - pad * 2, h1 = H * .5 - 18, h2 = H * .5 - 20;
  const prog = (S.t % 14) / 14; // fraction of approach flown
  // side view: runway at right, glideslope rising to the left (angle exaggerated)
  const ry = 14 + h1, rx = pad + w * .78, ang = 9 * D;
  ctx.fillStyle = T["metal"]; ctx.fillRect(rx, ry, w * .2, 4);
  const gsX = d => rx - d * w * .74, gsY = d => ry - d * w * .74 * Math.tan(ang);
  ctx.fillStyle = "rgba(76,191,106,.12)"; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(gsX(1), gsY(1) - 22); ctx.lineTo(gsX(1), gsY(1) + 22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#4cbf6a"; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(gsX(1), gsY(1)); ctx.stroke(); ctx.setLineDash([]);
  const d = 1 - prog, dev = 10 * Math.exp(-prog * 4) * Math.cos(prog * 10);
  App.drawPlaneSide(ctx, gsX(d) + 6, gsY(d) - dev - 3, Math.min(48, W * .08), ang * .3, T["stage-fg"]);
  App.label(ctx, "GLIDESLOPE · 3° (drawn steeper) · about 300 ft per nm", pad, 14, "#4cbf6a", "left", W < 520 ? 9 : 11);
  App.label(ctx, "side view", W - pad, 14, T["stage-muted"], "right", 10);
  ctx.strokeStyle = T["stage-rule"]; ctx.beginPath(); ctx.moveTo(pad, H * .5 + 2); ctx.lineTo(W - pad, H * .5 + 2); ctx.stroke();
  // top view: localizer beam from the far end of the runway
  const ty = H * .5 + 22 + h2 / 2;
  ctx.fillStyle = T["metal"]; ctx.fillRect(rx, ty - 5, w * .2, 10);
  ctx.fillStyle = "rgba(130,177,255,.12)"; ctx.beginPath(); ctx.moveTo(rx + w * .2, ty); ctx.lineTo(pad, ty - h2 * .42); ctx.lineTo(pad, ty + h2 * .42); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#82b1ff"; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(rx + w * .2, ty); ctx.lineTo(pad, ty); ctx.stroke(); ctx.setLineDash([]);
  const lat = 24 * Math.exp(-prog * 3.5) * Math.cos(prog * 7);
  const axp = gsX(d) + 6, ayp = ty + lat;
  ctx.save(); ctx.translate(axp, ayp); ctx.rotate(-Math.atan2(lat * 3.5, w) * .6);
  ctx.fillStyle = T["stage-fg"]; const s = Math.min(1, W / 700);
  ctx.beginPath(); ctx.moveTo(14 * s, 0); ctx.lineTo(-12 * s, -2 * s); ctx.lineTo(-12 * s, 2 * s); ctx.closePath(); ctx.fill();
  ctx.fillRect(-3 * s, -14 * s, 5 * s, 28 * s); ctx.fillRect(-12 * s, -5 * s, 3 * s, 10 * s); ctx.restore();
  App.label(ctx, "LOCALIZER · runway centreline", pad, H * .5 + 18, "#82b1ff", "left", W < 520 ? 9 : 11);
  App.label(ctx, "top view", W - pad, H * .5 + 18, T["stage-muted"], "right", 10);
}

/* ---------- chapter ---------- */
const TITLES = { pfd: "Primary flight display", fbw: "Fly-by-wire", protect: "Envelope protection", hyd: "Hydraulic systems", elec: "Electrical network", fuel: "Fuel system", ecs: "Air conditioning", ils: "Instrument landing" };
function onStep(i, st) { S.step = i; S.scene = st.scene; stage.title.textContent = TITLES[st.scene]; stage.setReadouts(st.ro); stage.cond.textContent = "Simplified schematic, typical single-aisle airliner"; }

App.register({
  id: "systems", nav: "Systems",
  build() {
    ui = this.ui = App.section(this);
    stage = App.stage(ui.stageHost, { title: "Systems", aspect: "16 / 10" });
    cv = stage.cv;
    this.scrolly = App.scrolly(ui.steps, STEPS, onStep);
    ui.extras.innerHTML = `<span class="label">Reference</span><h2>No single point of failure</h2>
      <p class="lede">How each system is backed up on a typical twin-engine airliner.</p>
      <div class="scroll-x"><table><thead><tr><th>System</th><th>Normal source</th><th>Backups</th><th>If everything else fails</th></tr></thead><tbody>
      <tr><td>Flight controls</td><td>Fly-by-wire, normal law</td><td>7 computers, any one can fly the aircraft</td><td>Mechanical rudder and stabiliser trim</td></tr>
      <tr><td>Hydraulics</td><td>Engine-driven pumps</td><td>Electric pumps, power transfer unit</td><td>Ram air turbine drives the blue system</td></tr>
      <tr><td>Electrical</td><td>Engine generators</td><td>APU generator, ground power, bus ties</td><td>Ram air turbine generator, then batteries</td></tr>
      <tr><td>Air data</td><td>3 air data and inertial units</td><td>Cross-comparison votes out a bad one</td><td>Standby instruments</td></tr>
      <tr><td>Fuel</td><td>Two pumps per tank</td><td>Crossfeed, gravity feed</td><td>Engines can suction-feed from wing tanks</td></tr>
      <tr><td>Pressurisation</td><td>Two packs, automatic controller</td><td>One pack alone is enough; second controller</td><td>Manual outflow valve; oxygen masks drop above ~14,000 ft cabin</td></tr>
      </tbody></table></div>`;
  },
  activate() { this.resize(); },
  resize() { cv.fit(); W = cv.w; H = cv.h; },
  frame(dt) {
    if (!W) return;
    S.t += dt;
    ctx = cv.begin();
    ctx.fillStyle = App.tokens["stage-bg"]; ctx.fillRect(0, 0, W, H);
    ({ pfd: scenePFD, fbw: () => sceneFBW(false), protect: () => sceneFBW(true), hyd: sceneHyd, elec: sceneElec, fuel: sceneFuel, ecs: sceneECS, ils: sceneILS })[S.scene]();
  }
});
})();
