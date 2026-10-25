/* Shared runtime: helpers, chapter router, scroll-driven steps, stage builder
   and small canvas plotting helpers. Same skeleton as Anatomy of Flight. */
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

const TOKEN_NAMES = ["bg","fg","muted","rule","accent","accent-soft","stage-bg","stage-panel","stage-fg","stage-muted","stage-rule","metal","metal-hi","c1","c2","c3","c4","c5","hi"];
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

/* ---------- plotting ---------- */
App.FONT_MONO = '10px "IBM Plex Mono", ui-monospace, monospace';
App.ticks = (a, b, n = 5) => {
  const span = b - a, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
};
// Axes in a box on the stage. Returns pixel mappers X(v), Y(v) and the box.
App.axes = (ctx, o) => {
  const T = App.tokens, { x, y, w, h, x0, x1, y0, y1 } = o;
  const X = v => x + (v - x0) / (x1 - x0) * w, Y = v => y + h - (v - y0) / (y1 - y0) * h;
  ctx.save();
  ctx.font = App.FONT_MONO; ctx.lineWidth = 1;
  ctx.strokeStyle = T["stage-rule"]; ctx.fillStyle = T["stage-muted"];
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  (o.yt || App.ticks(y0, y1, o.ny || 4)).forEach(v => {
    ctx.beginPath(); ctx.moveTo(x, Y(v) + .5); ctx.lineTo(x + w, Y(v) + .5); ctx.stroke();
    ctx.fillText((o.fy || String)(v), x - 6, Y(v));
  });
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  (o.xt || App.ticks(x0, x1, o.nx || 6)).forEach(v => {
    ctx.beginPath(); ctx.moveTo(X(v) + .5, y + h); ctx.lineTo(X(v) + .5, y + h + 4); ctx.stroke();
    ctx.fillText((o.fx || String)(v), X(v), y + h + 6);
  });
  ctx.strokeStyle = T["stage-muted"]; ctx.beginPath(); ctx.moveTo(x, y + h + .5); ctx.lineTo(x + w, y + h + .5); ctx.stroke();
  if (o.xl) { ctx.textAlign = "right"; ctx.fillText(o.xl, x + w, y + h + 20); }
  if (o.yl) { ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(o.yl, x, y - 6); }
  ctx.restore();
  return { X, Y, x, y, w, h };
};
App.line = (ctx, pts, color, width = 2, dash = null) => {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); let pen = false;
  for (const p of pts) {
    if (!p || !isFinite(p[1])) { pen = false; continue; }
    pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true;
  }
  ctx.stroke(); ctx.restore();
};
App.band = (ctx, lo, hi, color) => {
  if (!lo.length) return;
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  lo.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  for (let i = hi.length - 1; i >= 0; i--) ctx.lineTo(hi[i][0], hi[i][1]);
  ctx.closePath(); ctx.fill(); ctx.restore();
};
App.text = (ctx, s, x, y, color, align = "left", font = App.FONT_MONO, base = "middle") => {
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y); ctx.restore();
};
App.rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
// Range slider markup: <label class="rng">name <input> <output></label>
App.slider = (id, label, min, max, step, val, wide) => `<label class="rng${wide ? " wide" : ""}">${label}<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output for="${id}"></output></label>`;
App.seg = (id, opts, cur) => `<span class="seg" id="${id}" role="group">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${l}</button>`).join("")}</span>`;
App.bindSeg = (root, id, fn) => {
  const el = root.querySelector("#" + id);
  el.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    el.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    fn(b.dataset.v);
  });
  return v => el.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === String(v))));
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
  if (changed) document.title = `${ch.nav} · Anatomy of an EV`;
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
      try { localStorage.setItem("aev-theme", next); } catch (e) {}
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
