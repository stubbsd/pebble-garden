// Pebble Garden: rendering, input, screens. Depends on Engine, LEVELS, Sfx.
(function () {
  'use strict';
  var COLOURS = ['#ff6b5b', '#ffc93c', '#3fa7f5', '#4cc67a', '#a47bea'];
  var DARK = ['#d9473a', '#e0a417', '#1f84d4', '#2f9f58', '#7f57c9'];
  var LIGHT = ['#ff9a8e', '#ffe07f', '#86c9ff', '#86e0a6', '#c7a8f5'];
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
    // glow + cream frame: draw every floor cell inflated, then floor on top
    k.save(); k.shadowColor = 'rgba(110,190,255,0.55)'; k.shadowBlur = C * 0.5; k.fillStyle = '#fff3d6';
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) { rr(k, ox + x * C - wall, oy + y * C - wall, C + wall * 2, C + wall * 2, wall * 1.6); k.fill(); }
    k.restore();
    k.fillStyle = '#fff3d6';
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) { rr(k, ox + x * C - wall, oy + y * C - wall, C + wall * 2, C + wall * 2, wall * 1.6); k.fill(); }
    k.fillStyle = '#d9c9a3'; // inner bevel line
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) { k.fillRect(ox + x * C - wall * 0.35, oy + y * C - wall * 0.35, C + wall * 0.7, C + wall * 0.7); }
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) if (Engine.isFloor(P, x, y)) {
      k.fillStyle = (x + y) % 2 ? '#1a2b5c' : '#1d3064'; k.fillRect(ox + x * C, oy + y * C, C + 0.5, C + 0.5);
      k.fillStyle = 'rgba(255,255,255,0.05)'; rr(k, ox + x * C + C * 0.1, oy + y * C + C * 0.1, C * 0.8, C * 0.8, C * 0.18); k.fill();
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
    var r = exitRect(e), open = Engine.exitOpen(P, state, i), cx = r.x + r.w / 2, cy = r.y + r.h / 2, s = C;
    g.save();
    if (open) { g.shadowColor = COLOURS[e.c]; g.shadowBlur = C * (0.35 + 0.12 * Math.sin(t * 3 + i)); }
    var grd = g.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    grd.addColorStop(0, open ? LIGHT[e.c] : '#b9bccb'); grd.addColorStop(1, open ? COLOURS[e.c] : '#8e93a6');
    g.fillStyle = grd; rr(g, r.x, r.y, r.w, r.h, C * 0.2); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = open ? DARK[e.c] : COLOURS[e.c]; g.lineWidth = open ? Math.max(2, C * 0.04) : Math.max(3, C * 0.07); g.stroke();
    if (open) { // outward chevrons
      var d = DIRS[e.side], px = -d[1], py = d[0], a = s * 0.11, wob = Math.sin(t * 4 + i) * C * 0.03;
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(3, C * 0.065); g.lineCap = 'round'; g.lineJoin = 'round';
      for (var n = -1; n <= 1; n += 2) {
        var bx = cx + d[0] * (n * a * 0.8 + wob), by = cy + d[1] * (n * a * 0.8 + wob);
        g.beginPath(); g.moveTo(bx - d[0] * a + px * a * 1.2, by - d[1] * a + py * a * 1.2); g.lineTo(bx, by); g.lineTo(bx - d[0] * a - px * a * 1.2, by - d[1] * a - py * a * 1.2); g.stroke();
      }
      // tiny colour-matched symbol beside the chevrons for colour-blind play
    } else { // smiling padlock + dots
      var L2 = Math.min(r.w, r.h) * 0.8, lx = cx, ly = cy + L2 * 0.12;
      g.strokeStyle = '#eef0f6'; g.lineWidth = Math.max(2.5, L2 * 0.13);
      g.beginPath(); g.arc(lx, ly - L2 * 0.28, L2 * 0.24, Math.PI, 0); g.stroke();
      g.fillStyle = '#eef0f6'; rr(g, lx - L2 * 0.38, ly - L2 * 0.3, L2 * 0.76, L2 * 0.6, L2 * 0.14); g.fill();
      g.fillStyle = '#3c4258'; g.beginPath(); g.arc(lx - L2 * 0.13, ly - L2 * 0.06, L2 * 0.05, 0, 7); g.arc(lx + L2 * 0.13, ly - L2 * 0.06, L2 * 0.05, 0, 7); g.fill();
      g.strokeStyle = '#3c4258'; g.lineWidth = Math.max(1.5, L2 * 0.05); g.beginPath(); g.arc(lx, ly + L2 * 0.04, L2 * 0.1, 0.2, Math.PI - 0.2); g.stroke();
      // progress dots, placed further out from the wall
      var need = e.need, have = Engine.clearedCount(state), dd = DIRS[e.side], dr = C * 0.1;
      var bx2 = cx + dd[0] * (C * 0.5), by2 = cy + dd[1] * (C * 0.5), qx = -dd[1], qy = dd[0], spacing = dr * 2.6;
      for (var k = 0; k < need; k++) {
        var off = (k - (need - 1) / 2) * spacing;
        g.beginPath(); g.arc(bx2 + qx * off, by2 + qy * off, dr, 0, 7);
        g.fillStyle = k < have ? COLOURS[e.c] : 'rgba(255,255,255,0.18)'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.stroke();
      }
    }
    // colour symbol chip so the gate's colour is also a shape
    if (open) {
      var d2 = DIRS[e.side], sx = cx + d2[0] * C * 0.5, sy = cy + d2[1] * C * 0.5;
      if (sx > 0 && sy > 0 && sx < W && sy < H) { g.fillStyle = COLOURS[e.c]; g.beginPath(); g.arc(sx, sy, C * 0.15, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); symbol(e.c, sx, sy, C * 0.17, '#fff'); }
    }
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
    var r = C * 0.3;
    g.fillStyle = 'rgba(0,0,0,0.35)'; rr(g, px, py + C * 0.06, w, h, r); g.fill();
    var grd = g.createLinearGradient(px, py, px, py + h); grd.addColorStop(0, LIGHT[b.c]); grd.addColorStop(0.55, COLOURS[b.c]); grd.addColorStop(1, DARK[b.c]);
    g.fillStyle = grd; rr(g, px, py, w, h, r); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; rr(g, px + w * 0.14, py + C * 0.07, w * 0.5, C * 0.1, C * 0.05); g.fill();
    var cx = px + w / 2, cy = py + h / 2;
    symbol(b.c, cx, cy + C * 0.12, C * 0.32, 'rgba(255,255,255,0.95)');
    // eyes
    var blink = (t + blinkT[i]) % 4.2 < 0.12, ey = cy - C * 0.17, ex = C * 0.12, lx = look[0] * C * 0.035, ly = look[1] * C * 0.035;
    for (var s = -1; s <= 1; s += 2) {
      if (blink) { g.strokeStyle = '#1b1f33'; g.lineWidth = C * 0.03; g.beginPath(); g.moveTo(cx + s * ex - C * 0.04, ey); g.lineTo(cx + s * ex + C * 0.04, ey); g.stroke(); continue; }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * ex, ey, C * 0.07, 0, 7); g.fill();
      g.fillStyle = '#1b1f33'; g.beginPath(); g.arc(cx + s * ex + lx, ey + ly, C * 0.04, 0, 7); g.fill();
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
      if (drag && drag.i === i && drag.axis !== null) { tx += drag.axis === 0 ? drag.off : 0; ty += drag.axis === 1 ? drag.off : 0; v.x = tx; v.y = ty; look = drag.axis === 0 ? [Math.sign(drag.off), 0] : [0, Math.sign(drag.off)]; }
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
      if (sp.petal) { g.beginPath(); g.ellipse(0, 0, sp.s, sp.s * 0.55, 0, 0, 7); g.fill(); } else { g.fillRect(-sp.s / 2, -sp.s / 2, sp.s, sp.s); }
      g.restore(); }
  }
  function burst(r, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 60 + Math.random() * 120;
    sparks.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gy: 60, t: 0, life: 0.6 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#fff6c8' : col, s: 3 + Math.random() * 4, rot: 0, vr: 6 }); } }
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
  function limits(i) {
    var o = Engine.occ(P, state, i), r = {};
    [0, 1, 2, 3].forEach(function (d) { r[d] = { max: Engine.maxSlide(P, state, i, d, o), exit: Engine.exitFor(P, state, i, d, o) >= 0 }; });
    return r;
  }
  cv.addEventListener('pointerdown', function (ev) {
    Sfx.init();
    if (!playing || won || drag) return;
    var c = cellAt(ev.clientX, ev.clientY), i = blockAt(c[0], c[1]); if (i < 0) return;
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    drag = { id: ev.pointerId, i: i, sx: ev.clientX, sy: ev.clientY, axis: null, off: 0, lim: limits(i), hist: [[performance.now(), 0]] };
  });
  cv.addEventListener('pointermove', function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var dx = (ev.clientX - drag.sx) / C, dy = (ev.clientY - drag.sy) / C;
    if (drag.axis === null) { if (Math.max(Math.abs(dx), Math.abs(dy)) < 0.12) return; drag.axis = Math.abs(dx) > Math.abs(dy) ? 0 : 1; }
    var raw = drag.axis === 0 ? dx : dy, pos = drag.lim[drag.axis === 0 ? 1 : 2], neg = drag.lim[drag.axis === 0 ? 3 : 0];
    var hiL = pos.max + (pos.exit ? 1.4 : 0), loL = -(neg.max + (neg.exit ? 1.4 : 0)), off = raw;
    if (off > hiL) off = hiL + Math.min(0.15, (off - hiL) * 0.2); if (off < loL) off = loL - Math.min(0.15, (loL - off) * 0.2);
    drag.off = off; drag.hist.push([performance.now(), off]); if (drag.hist.length > 6) drag.hist.shift();
  });
  function endDrag(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag; drag = null; if (d.axis === null) return;
    var h0 = d.hist[0], h1 = d.hist[d.hist.length - 1], vel = (h1[1] - h0[1]) / Math.max(0.016, (h1[0] - h0[0]) / 1000);
    var sgn = d.off >= 0 ? 1 : -1, dir = d.axis === 0 ? (sgn > 0 ? 1 : 3) : (sgn > 0 ? 2 : 0), lim = d.lim[dir];
    var flick = !window.__noFlick && Math.abs(vel) > 7 && Math.sign(vel) === sgn;
    var i = d.i, dist = Math.abs(d.off);
    if (lim.exit && (dist > lim.max + 0.35 || (flick && dist > lim.max - 0.6))) {
      pushUndo(); moves++;
      var D = DIRS[dir]; state = state.slice();
      var fx = state[i][0] + D[0] * lim.max, fy = state[i][1] + D[1] * lim.max;
      flyers.push({ i: i, x: fx + D[0] * Math.max(0, dist - lim.max), y: fy + D[1] * Math.max(0, dist - lim.max), d: D, t: 0 });
      state[i] = null; Sfx.whoosh(); checkWin(); return;
    }
    var k = flick ? lim.max : Math.min(lim.max, Math.round(dist));
    if (k > 0) {
      pushUndo(); moves++; state = state.slice(); state[i] = [state[i][0] + DIRS[dir][0] * k, state[i][1] + DIRS[dir][1] * k];
      vis[i] = { x: vis[i].x, y: vis[i].y }; Sfx.snap();
    } else if (dist > 0.2) Sfx.bump();
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', function (ev) { if (drag && ev.pointerId === drag.id) drag = null; });
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
