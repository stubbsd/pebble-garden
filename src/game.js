// Pebble Garden: rendering, input, screens. Depends on Engine, LEVELS, Sfx.
(function () {
  'use strict';
  var COLOURS = ['#f2443a', '#ffc81f', '#2e8cf0', '#36c25a', '#a05ce8'];
  var DARK = ['#b52a22', '#c98f00', '#1a5fb3', '#1f8a3c', '#6d36b0'];
  var LIGHT = ['#ff8a7f', '#ffe27a', '#7cc0ff', '#7fe39a', '#c9a0ff'];
  var SAVE = 'pebbleGarden.v1';
  var DIRS = Engine.DIRS;

  var cv = document.getElementById('board'), g = cv.getContext('2d');
  var $ = function (id) { return document.getElementById(id); };
  var save = load();
  var W = 0, H = 0, DPR = 1, C = 60, ox = 0, oy = 0, boardCache = null;
  var lvlIdx = 0, L = null, P = null, state = null, undoStack = [], moves = 0, vis = [], flyers = [], sparks = [], won = false;
  var drag = null, playing = false, lastT = 0, blinkT = [], openPrev = [];
  var flies = []; for (var f = 0; f < 34; f++) flies.push({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28, s: 0.3 + Math.random() * 0.7 });

  function load() { try { return JSON.parse(localStorage.getItem(SAVE)) || { stars: {} }; } catch (e) { return { stars: {} }; } }
  function store() { try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch (e) {} }
  function unlockedUpTo() { var n = 0; while (save.stars[n]) n++; return Math.min(n, LEVELS.length - 1); }

  // ---------- layout ----------
  function safe() { var s = getComputedStyle($('safe')); return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 }; }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 3); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (L) layout();
  }
  function layout() {
    var s = safe(), hudH = (H < 500 ? 76 : 96) + s.t, top = hudH, bottom = H - s.b - 12, left = s.l + 10, right = W - s.r - 10;
    var aw = right - left, ah = bottom - top, pad = 2.3;
    C = Math.floor(Math.min(aw / (L.w + pad), ah / (L.h + pad), 120));
    ox = Math.round(left + (aw - L.w * C) / 2); oy = Math.round(top + (ah - L.h * C) / 2);
    buildBoardCache();
  }

  // ---------- board drawing ----------
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function buildBoardCache() {
    var c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    var k = c.getContext('2d'); k.scale(DPR, DPR);
    var x, y, wall = Math.max(5, C * 0.11);
    // chunky steel-blue tray, dark navy floor, faint grid lines
    k.save(); k.shadowColor = 'rgba(0,10,40,0.6)'; k.shadowBlur = C * 0.4; k.shadowOffsetY = C * 0.08; k.fillStyle = '#5f86c9';
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) { rr(k, ox + x * C - wall, oy + y * C - wall, C + wall * 2, C + wall * 2, wall * 1.2); k.fill(); }
    k.restore();
    k.fillStyle = '#9db8e6';
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) { rr(k, ox + x * C - wall, oy + y * C - wall, C + wall * 2, C + wall * 1.4, wall * 1.2); k.fill(); }
    k.fillStyle = '#4a6fb3';
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) { k.fillRect(ox + x * C - wall * 0.3, oy + y * C - wall * 0.3, C + wall * 0.6, C + wall * 0.6); }
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) {
      k.fillStyle = '#122450'; k.fillRect(ox + x * C, oy + y * C, C + 0.5, C + 0.5);
      k.strokeStyle = 'rgba(140,180,255,0.13)'; k.lineWidth = 1; k.strokeRect(ox + x * C + 0.5, oy + y * C + 0.5, C - 1, C - 1);
      k.fillStyle = 'rgba(140,180,255,0.10)'; k.beginPath(); k.arc(ox + x * C + C / 2, oy + y * C + C / 2, C * 0.06, 0, 7); k.fill();
    }
    boardCache = c;
  }
  function exitRect(e) {
    var T = C * 0.56, gap = Math.max(5, C * 0.11) + 1, inset = C * 0.08, x = e.x, y = e.y;
    if (e.side === 0) return { x: ox + x * C + inset, y: oy + y * C - gap - T, w: e.len * C - inset * 2, h: T };
    if (e.side === 2) return { x: ox + x * C + inset, y: oy + (y + 1) * C + gap, w: e.len * C - inset * 2, h: T };
    if (e.side === 1) return { x: ox + (x + 1) * C + gap, y: oy + y * C + inset, w: T, h: e.len * C - inset * 2 };
    return { x: ox + x * C - gap - T, y: oy + y * C + inset, w: T, h: e.len * C - inset * 2 };
  }
  function drawExit(e, i, t) {
    var r = exitRect(e), open = Engine.exitOpen(P, state, i), cx = r.x + r.w / 2, cy = r.y + r.h / 2, d = DIRS[e.side], px = -d[1], py = d[0];
    g.save();
    if (open) { g.shadowColor = COLOURS[e.c]; g.shadowBlur = C * (0.3 + 0.12 * Math.sin(t * 3 + i)); }
    g.fillStyle = open ? DARK[e.c] : '#3b4a6e'; rr(g, r.x, r.y + C * 0.05, r.w, r.h, C * 0.14); g.fill(); g.shadowBlur = 0;
    g.fillStyle = open ? COLOURS[e.c] : '#6d7c9e'; rr(g, r.x, r.y, r.w, r.h - C * 0.03, C * 0.14); g.fill();
    if (open) { // row of chunky arrows pointing out, marching gently
      var along = e.side % 2 === 0 ? r.w : r.h, n = Math.max(1, Math.round(along / C)), a = C * 0.14, wob = ((t * 0.8 + i * 0.3) % 1) * C * 0.06;
      g.fillStyle = '#fff';
      for (var k = 0; k < n; k++) {
        var off = (k - (n - 1) / 2) * C, bx = cx + px * off + d[0] * (wob - C * 0.03), by = cy + py * off + d[1] * (wob - C * 0.03);
        g.beginPath(); g.moveTo(bx + d[0] * a, by + d[1] * a); g.lineTo(bx - d[0] * a * 0.4 + px * a * 1.25, by - d[1] * a * 0.4 + py * a * 1.25);
        g.lineTo(bx - d[0] * a * 0.4 - px * a * 1.25, by - d[1] * a * 0.4 - py * a * 1.25); g.closePath(); g.fill();
      }
    } else { // gate: colour stripes + big countdown number
      g.save(); rr(g, r.x, r.y, r.w, r.h - C * 0.03, C * 0.14); g.clip();
      g.strokeStyle = COLOURS[e.c]; g.lineWidth = C * 0.09;
      for (var q = -r.w - r.h; q < r.w + r.h; q += C * 0.26) { g.beginPath(); g.moveTo(r.x + q, r.y); g.lineTo(r.x + q + r.h, r.y + r.h); g.stroke(); }
      g.restore();
      var left = Math.max(0, e.need - Engine.clearedCount(state)), rad = Math.min(r.w, r.h) * 0.42;
      g.fillStyle = '#1b2547'; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.fill(); g.strokeStyle = COLOURS[e.c]; g.lineWidth = Math.max(2, C * 0.05); g.stroke();
      g.fillStyle = '#fff'; g.font = '900 ' + Math.round(rad * 1.3) + 'px ui-rounded, Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(left), cx, cy + rad * 0.06);
      // meter pips further out
      var need = e.need, have = Engine.clearedCount(state), dr = C * 0.085, bx2 = cx + d[0] * C * 0.48, by2 = cy + d[1] * C * 0.48;
      for (var m = 0; m < need; m++) { var o2 = (m - (need - 1) / 2) * dr * 2.6;
        g.fillStyle = m < have ? COLOURS[e.c] : 'rgba(255,255,255,0.2)'; rr(g, bx2 + px * o2 - dr, by2 + py * o2 - dr, dr * 2, dr * 2, dr * 0.4); g.fill(); }
    }
    if (open) { var sx = cx + d[0] * C * 0.5, sy = cy + d[1] * C * 0.5;
      if (sx > 0 && sy > 0 && sx < W && sy < H) { g.fillStyle = COLOURS[e.c]; g.beginPath(); g.arc(sx, sy, C * 0.15, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); symbol(e.c, sx, sy, C * 0.17, '#fff'); } }
    g.restore();
  }
  function symbol(c, x, y, s, col) {
    g.fillStyle = col; g.beginPath();
    if (c === 0) { g.arc(x, y, s * 0.5, 0, 7); g.moveTo(x + s * 0.22, y); g.arc(x, y, s * 0.22, 0, 7, true); }
    else if (c === 1) { for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? s * 0.24 : s * 0.56; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } }
    else if (c === 2) { g.moveTo(x, y - s * 0.5); g.lineTo(x + s * 0.52, y + s * 0.4); g.lineTo(x - s * 0.52, y + s * 0.4); }
    else if (c === 3) { rr(g, x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8, s * 0.12); }
    else { g.moveTo(x, y + s * 0.45); g.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.35, y - s * 0.6, x, y - s * 0.22); g.bezierCurveTo(x + s * 0.35, y - s * 0.6, x + s * 0.75, y - s * 0.05, x, y + s * 0.45); }
    g.closePath(); g.fill('evenodd');
  }
  function drawBlock(i, x, y, alpha, scale, look, t) {
    var b = L.blocks[i], m = C * 0.07, w = b.w * C - m * 2, h = b.h * C - m * 2, px = ox + x * C + m, py = oy + y * C + m;
    g.save(); g.globalAlpha = alpha;
    if (scale !== 1) { g.translate(px + w / 2, py + h / 2); g.scale(scale, scale); g.translate(-(px + w / 2), -(py + h / 2)); }
    var r = C * 0.16, side = C * 0.09;
    g.fillStyle = 'rgba(0,0,0,0.4)'; rr(g, px + C * 0.03, py + C * 0.08, w, h, r); g.fill();
    g.fillStyle = DARK[b.c]; rr(g, px, py, w, h, r); g.fill();                      // brick side
    var grd = g.createLinearGradient(px, py, px, py + h); grd.addColorStop(0, LIGHT[b.c]); grd.addColorStop(0.35, COLOURS[b.c]); grd.addColorStop(1, COLOURS[b.c]);
    g.fillStyle = grd; rr(g, px, py, w, h - side, r); g.fill();                     // top face
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, C * 0.025); rr(g, px + 1, py + 1, w - 2, h - side - 2, r); g.stroke();
    var cx = px + w / 2, cy = py + (h - side) / 2, blink = (t + blinkT[i]) % 4.2 < 0.12, sz = Math.min(b.w, b.h);
    if (b.a !== undefined) { Animals.draw(g, b.a, cx, cy, C * sz, look, blink, t + blinkT[i]); symbol(b.c, px + w - C * 0.17, py + h - side - C * 0.15, C * 0.2, 'rgba(255,255,255,0.95)'); g.restore(); return; }
    // rounded pebble studs, one per cell; the first carries the colour symbol
    for (var sy2 = 0; sy2 < b.h; sy2++) for (var sx2 = 0; sx2 < b.w; sx2++) {
      var qx = ox + (x + sx2 + 0.5) * C, qy = oy + (y + sy2 + 0.5) * C - side * 0.5, sr = C * 0.24;
      g.fillStyle = DARK[b.c]; g.beginPath(); g.ellipse(qx, qy + C * 0.05, sr, sr * 0.9, 0, 0, 7); g.fill();
      var sg = g.createRadialGradient(qx - sr * 0.35, qy - sr * 0.4, sr * 0.1, qx, qy, sr); sg.addColorStop(0, LIGHT[b.c]); sg.addColorStop(1, COLOURS[b.c]);
      g.fillStyle = sg; g.beginPath(); g.ellipse(qx, qy, sr, sr * 0.9, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(qx - sr * 0.35, qy - sr * 0.4, sr * 0.28, sr * 0.16, -0.5, 0, 7); g.fill();
      if (!sx2 && !sy2) symbol(b.c, qx, qy + sr * 0.05, sr * 0.9, 'rgba(255,255,255,0.9)');
    }
    g.restore();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var t = now / 1000, dt = Math.min(0.05, t - (lastT || t)); lastT = t;
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    for (var i = 0; i < flies.length; i++) { var fl = flies[i]; fl.p += dt * fl.s; fl.y -= dt * 0.006 * fl.s; if (fl.y < -0.02) fl.y = 1.02;
      var a = 0.25 + 0.35 * Math.sin(fl.p * 2); g.fillStyle = 'rgba(255,236,150,' + a.toFixed(3) + ')'; g.beginPath(); g.arc((fl.x + Math.sin(fl.p) * 0.02) * W, fl.y * H, 1.2 + fl.s * 1.6, 0, 7); g.fill(); }
    if (!playing || !L) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(boardCache, 0, 0); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    L.exits.forEach(function (e, k) { drawExit(e, k, t); });
    // unlock sparkle check
    L.exits.forEach(function (e, k) { var o = Engine.exitOpen(P, state, k); if (o && !openPrev[k]) { burst(exitRect(e), COLOURS[e.c], 14); Sfx.unlock(); } openPrev[k] = o; });
    for (i = 0; i < L.blocks.length; i++) {
      if (!state[i]) continue;
      var v = vis[i], tx = state[i][0], ty = state[i][1], look = [0, 0];
      if (drag && drag.i === i) { var kd = Math.min(1, dt * 35); v.x += (tx + drag.ox - v.x) * kd; v.y += (ty + drag.oy - v.y) * kd; look = [Math.sign(drag.ox), Math.sign(drag.oy)]; }
      else { var kk = Math.min(1, dt * 20); v.x += (tx - v.x) * kk; v.y += (ty - v.y) * kk; }
      var sc = drag && drag.i === i ? 1.05 : 1;
      drawBlock(i, v.x, v.y, 1, sc, look, t);
    }
    for (i = flyers.length - 1; i >= 0; i--) { var fy = flyers[i]; fy.t += dt; var p = fy.t / 0.38;
      if (p >= 1) { flyers.splice(i, 1); continue; }
      var ease = p * p; drawBlock(fy.i, fy.x + fy.d[0] * ease * 2.2, fy.y + fy.d[1] * ease * 2.2, 1 - p, 1 - p * 0.5, fy.d, t); }
    for (i = sparks.length - 1; i >= 0; i--) { var sp = sparks[i]; sp.t += dt; if (sp.t > sp.life) { sparks.splice(i, 1); continue; }
      sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += sp.gy * dt; sp.rot += dt * sp.vr;
      g.save(); g.globalAlpha = 1 - sp.t / sp.life; g.translate(sp.x, sp.y); g.rotate(sp.rot); g.fillStyle = sp.c;
      if (sp.heart) { symbol(4, 0, 0, sp.s * 2, sp.c); } else if (sp.petal) { g.beginPath(); g.ellipse(0, 0, sp.s, sp.s * 0.55, 0, 0, 7); g.fill(); } else { g.fillRect(-sp.s / 2, -sp.s / 2, sp.s, sp.s); }
      g.restore(); }
  }
  function burst(r, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 60 + Math.random() * 120;
    sparks.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gy: 60, t: 0, life: 0.6 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#fff6c8' : col, s: 3 + Math.random() * 4, rot: 0, vr: 6 }); } }
  function crumble(i, from, D) { var b = L.blocks[i], n = 10 + 6 * b.w * b.h;
    for (var k = 0; k < n; k++) { var fx = from[0] + Math.random() * b.w, fy = from[1] + Math.random() * b.h, v = 40 + Math.random() * 140;
      sparks.push({ x: ox + fx * C, y: oy + fy * C, vx: D[0] * v + (Math.random() - 0.5) * 80, vy: D[1] * v - 60 * Math.random(), gy: 520, t: 0, life: 0.6 + Math.random() * 0.4,
        c: [COLOURS[b.c], DARK[b.c], LIGHT[b.c]][k % 3], s: C * (0.06 + Math.random() * 0.1), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 }); } }
  function hearts(x, y) { for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 90 + Math.random() * 90;
    sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gy: 40, t: 0, life: 0.9 + Math.random() * 0.4, c: ['#ff8fb1', '#ffd84a', '#fff'][i % 3], s: 6 + Math.random() * 4, rot: 0, vr: 0, heart: true }); } }
  function petals() { for (var i = 0; i < 70; i++) sparks.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, gy: 10,
    t: 0, life: 3 + Math.random() * 1.5, c: COLOURS[i % 5], s: 6 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, petal: true }); }

  // ---------- game state ----------
  function start(idx) {
    lvlIdx = idx; L = LEVELS[idx]; P = Engine.prepare(L); state = Engine.initState(P); undoStack = []; moves = 0; won = false; drag = null; flyers = []; sparks = [];
    vis = state.map(function (s) { return { x: s[0], y: s[1] }; }); blinkT = L.blocks.map(function () { return Math.random() * 4; });
    openPrev = L.exits.map(function (e, k) { return Engine.exitOpen(P, state, k); });
    $('levelNum').textContent = idx + 1; show('play'); layout();
  }
  function show(which) {
    playing = which === 'play';
    $('hud').classList.toggle('hidden', !playing); $('map').classList.toggle('hidden', which !== 'map'); $('win').classList.add('hidden');
    if (which === 'map') buildMap();
  }
  function pushUndo() { undoStack.push({ s: state.slice(), m: moves }); if (undoStack.length > 300) undoStack.shift(); }
  function undo() { if (!undoStack.length || won) return; var u = undoStack.pop(); state = u.s; moves = u.m; drag = null; Sfx.tap();
    openPrev = L.exits.map(function (e, k) { return Engine.exitOpen(P, state, k); }); }
  function restart() { if (!L) return; Sfx.tap(); start(lvlIdx); }
  function checkWin() {
    if (Engine.clearedCount(state) !== state.length || won) return;
    won = true;
    var stars = moves <= L.par ? 3 : moves <= Math.ceil(L.par * 1.5) + 2 ? 2 : 1;
    save.stars[lvlIdx] = Math.max(save.stars[lvlIdx] || 0, stars); store();
    setTimeout(function () {
      if (!won) return; petals(); Sfx.win(); $('win').classList.remove('hidden');
      var sp = $('winStars').children; for (var i = 0; i < 3; i++) { sp[i].className = ''; }
      for (i = 0; i < stars; i++) (function (i) { setTimeout(function () { sp[i].className = 'on'; Sfx.star(i); }, 350 + i * 300); })(i);
      $('winNext').classList.toggle('hidden', lvlIdx >= LEVELS.length - 1);
    }, 450);
  }

  // ---------- input ----------
  function cellAt(px, py) { return [(px - ox) / C, (py - oy) / C]; }
  function blockAt(fx, fy) {
    var best = -1, bd = 0.35; // small forgiveness for chunky fingers
    for (var i = 0; i < L.blocks.length; i++) { if (!state[i]) continue; var b = L.blocks[i];
      var dx = Math.max(state[i][0] - fx, 0, fx - (state[i][0] + b.w)), dy = Math.max(state[i][1] - fy, 0, fy - (state[i][1] + b.h)), d = Math.max(dx, dy);
      if (d < bd || (d === 0 && bd > 0)) { bd = d; best = i; if (d === 0) break; } }
    return best;
  }
  // Free drag: while the finger is down the block follows it cell by cell along rows and columns,
  // turning corners whenever there is room. Each cell change is one engine step, so play matches the solver.
  function tryStep(i, dir) {
    var n = Engine.step(P, state, i, dir); if (!n) return null;
    if (!drag.changed) { pushUndo(); drag.changed = true; }
    state = n; return n[i] ? 'move' : 'leave';
  }
  function room(i, dir) { var n = Engine.step(P, state, i, dir); return !n ? 0.08 : n[i] ? 0.45 : 0.7; }
  cv.addEventListener('pointerdown', function (ev) {
    Sfx.init();
    if (!playing || won || drag) return;
    var c = cellAt(ev.clientX, ev.clientY), i = blockAt(c[0], c[1]); if (i < 0) return;
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    drag = { id: ev.pointerId, i: i, gx: c[0], gy: c[1], sx: state[i][0], sy: state[i][1], ox: 0, oy: 0, changed: false };
  });
  cv.addEventListener('pointermove', function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var i = drag.i, c = cellAt(ev.clientX, ev.clientY), wx = drag.sx + c[0] - drag.gx, wy = drag.sy + c[1] - drag.gy;
    for (var guard = 0; guard < 40; guard++) {
      var cur = state[i], dx = wx - cur[0], dy = wy - cur[1], stepped = false;
      var order = Math.abs(dx) >= Math.abs(dy) ? [[dx, 0], [dy, 1]] : [[dy, 1], [dx, 0]];
      for (var k = 0; k < 2 && !stepped; k++) {
        var d = order[k][0], ax = order[k][1]; if (Math.abs(d) < 0.5) continue;
        var dir = ax === 0 ? (d > 0 ? 1 : 3) : (d > 0 ? 2 : 0);
        if (Engine.canLeave(P, state, i, dir) >= 0 && Math.abs(d) < 0.65) continue; // leaving needs a firm push
        var from = state[i], r = tryStep(i, dir);
        if (r === 'leave') { leave(i, from, dir); return; }
        if (r) { stepped = true; Sfx.tick(); }
      }
      if (!stepped) break;
    }
    cur = state[i]; dx = wx - cur[0]; dy = wy - cur[1];
    if (Math.abs(dx) >= Math.abs(dy)) { drag.ox = Math.sign(dx) * Math.min(Math.abs(dx), room(i, dx > 0 ? 1 : 3)); drag.oy = 0; }
    else { drag.oy = Math.sign(dy) * Math.min(Math.abs(dy), room(i, dy > 0 ? 2 : 0)); drag.ox = 0; }
  });
  function leave(i, from, dir) {
    var D = DIRS[dir], b = L.blocks[i];
    moves++; drag = null;
    flyers.push({ i: i, x: vis[i].x, y: vis[i].y, d: D, t: 0 });
    crumble(i, from, D);
    Sfx.whoosh();
    if (b.a !== undefined) { Sfx.squeak(b.a); hearts(ox + (from[0] + b.w / 2) * C, oy + (from[1] + b.h / 2) * C); }
    checkWin();
  }
  function endDrag(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (d.changed) { moves++; Sfx.snap(); checkWin(); } else if (Math.abs(d.ox) + Math.abs(d.oy) > 0.05) Sfx.bump();
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  ['gesturestart', 'gesturechange', 'dblclick'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener('touchmove', function (e) { if (e.target === cv) e.preventDefault(); }, { passive: false });

  function guard(fn) { var busy = 0; return function (e) { e.preventDefault(); Sfx.init(); var n = performance.now(); if (n - busy < 250) return; busy = n; fn(); }; }
  $('btnUndo').addEventListener('click', guard(undo));
  $('btnRestart').addEventListener('click', guard(restart));
  $('btnMap').addEventListener('click', guard(function () { Sfx.tap(); show('map'); }));
  $('winMap').addEventListener('click', guard(function () { show('map'); }));
  $('winAgain').addEventListener('click', guard(function () { start(lvlIdx); }));
  $('winNext').addEventListener('click', guard(function () { start(Math.min(LEVELS.length - 1, lvlIdx + 1)); }));
  $('btnSound').addEventListener('click', guard(function () { document.body.classList.toggle('muted', Sfx.toggle()); Sfx.tap(); }));
  document.body.classList.toggle('muted', Sfx.isMuted());
  // Reset progress (parent control on the map). Mute setting is stored separately and kept.
  $('btnReset').addEventListener('click', guard(function () { Sfx.tap(); $('confirm').classList.remove('hidden'); }));
  $('resetNo').addEventListener('click', guard(function () { Sfx.tap(); $('confirm').classList.add('hidden'); }));
  $('resetYes').addEventListener('click', guard(function () {
    try { localStorage.removeItem(SAVE); } catch (e) {}
    save = { stars: {} }; L = null; $('confirm').classList.add('hidden'); Sfx.unlock(); show('map');
    $('mapScroll').scrollTop = 0;
  }));

  // ---------- level map ----------
  function buildMap() {
    var path = $('mapPath'), cur = unlockedUpTo(); path.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < LEVELS.length; i++) {
      var row = Math.floor(i / 4), col = i % 4; if (row % 2) col = 3 - col; // snake path
      var b = document.createElement('button'), st = save.stars[i] || 0, locked = i > cur;
      b.className = 'lvl' + (locked ? ' locked' : '') + (i === cur ? ' current' : '');
      b.style.gridRow = row + 1; b.style.gridColumn = col + 1;
      b.style.background = 'radial-gradient(circle at 35% 30%, ' + LIGHT[i % 5] + ', ' + COLOURS[i % 5] + ' 60%, ' + DARK[i % 5] + ')';
      b.textContent = i + 1; b.setAttribute('aria-label', 'Level ' + (i + 1));
      if (!locked) { var s = document.createElement('div'); s.className = 'stars'; for (var k = 0; k < 3; k++) { var x = document.createElement('b'); x.textContent = '★'; if (k >= st) x.className = 'off'; s.appendChild(x); } b.appendChild(s); }
      (function (i, locked, b) { b.addEventListener('click', function () { Sfx.init(); if (locked) { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); Sfx.bump(); return; } Sfx.tap(); start(i); }); })(i, locked, b);
      frag.appendChild(b);
    }
    path.appendChild(frag);
    var curEl = path.children[cur]; if (curEl) setTimeout(function () { curEl.scrollIntoView({ block: 'center' }); }, 30);
  }

  window.addEventListener('resize', resize); window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  resize(); var m = /^#L(\d+)$/.exec(location.hash); if (m) start(Math.max(0, Math.min(LEVELS.length - 1, m[1] - 1))); else show('map'); requestAnimationFrame(frame);
  window.__geom = function () { return { ox: ox, oy: oy, C: C }; };
  window.__pg = { start: start, get state() { return state; }, LEVELS: LEVELS, cur: function () { return lvlIdx; } }; // for self-tests
})();
