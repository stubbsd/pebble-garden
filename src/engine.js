// Pebble Garden engine: shared by the browser game and the Node level tools.
(function (root) {
  'use strict';
  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W

  // Level: {w,h,rows:[str], blocks:[{c,x,y,w,h}], exits:[{c,x,y,side,len,need}]}
  function prepare(L) {
    var floor = [];
    for (var y = 0; y < L.h; y++) for (var x = 0; x < L.w; x++) floor.push(L.rows[y][x] === '.');
    var exitAt = {};
    L.exits.forEach(function (e, i) {
      for (var k = 0; k < e.len; k++) {
        var x = e.x + (e.side % 2 === 0 ? k : 0), y = e.y + (e.side % 2 === 1 ? k : 0);
        exitAt[x + ',' + y + ',' + e.side] = i;
      }
    });
    return { L: L, floor: floor, exitAt: exitAt, n: L.blocks.length };
  }
  function isFloor(P, x, y) { return x >= 0 && y >= 0 && x < P.L.w && y < P.L.h && P.floor[y * P.L.w + x]; }
  function initState(P) { return P.L.blocks.map(function (b) { return [b.x, b.y]; }); }
  function clearedCount(s) { var c = 0; for (var i = 0; i < s.length; i++) if (!s[i]) c++; return c; }
  function occ(P, s, skip) {
    var o = new Int16Array(P.L.w * P.L.h).fill(-1);
    for (var i = 0; i < s.length; i++) {
      if (!s[i] || i === skip) continue;
      var b = P.L.blocks[i];
      for (var dy = 0; dy < b.h; dy++) for (var dx = 0; dx < b.w; dx++) o[(s[i][1] + dy) * P.L.w + s[i][0] + dx] = i;
    }
    return o;
  }
  function fits(P, o, b, x, y) {
    for (var dy = 0; dy < b.h; dy++) for (var dx = 0; dx < b.w; dx++) {
      if (!isFloor(P, x + dx, y + dy) || o[(y + dy) * P.L.w + x + dx] >= 0) return false;
    }
    return true;
  }
  // How far block i can slide in dir (cells).
  function maxSlide(P, s, i, dir, o) {
    o = o || occ(P, s, i);
    var b = P.L.blocks[i], d = DIRS[dir], k = 0;
    while (fits(P, o, b, s[i][0] + d[0] * (k + 1), s[i][1] + d[1] * (k + 1))) k++;
    return k;
  }
  function exitOpen(P, s, e) { return clearedCount(s) >= P.L.exits[e].need; }
  // Exit index block i would leave through after sliding fully in dir, or -1.
  function exitFor(P, s, i, dir, o) {
    o = o || occ(P, s, i);
    var b = P.L.blocks[i], k = maxSlide(P, s, i, dir, o), d = DIRS[dir];
    var x = s[i][0] + d[0] * k, y = s[i][1] + d[1] * k, cells = [];
    if (dir === 0) for (var a = 0; a < b.w; a++) cells.push([x + a, y]);
    if (dir === 2) for (a = 0; a < b.w; a++) cells.push([x + a, y + b.h - 1]);
    if (dir === 1) for (a = 0; a < b.h; a++) cells.push([x + b.w - 1, y + a]);
    if (dir === 3) for (a = 0; a < b.h; a++) cells.push([x, y + a]);
    var ex = -1;
    for (var c = 0; c < cells.length; c++) {
      var cx = cells[c][0], cy = cells[c][1];
      if (isFloor(P, cx + d[0], cy + d[1])) return -1; // stopped by a block, not a wall
      var e = P.exitAt[cx + ',' + cy + ',' + dir];
      if (e === undefined || (ex >= 0 && e !== ex)) return -1;
      ex = e;
    }
    if (ex < 0 || P.L.exits[ex].c !== b.c || !exitOpen(P, s, ex)) return -1;
    return ex;
  }
  // Apply a solver move {i,dir}: slide fully; leave if an exit accepts it.
  function applyMove(P, s, i, dir) {
    var o = occ(P, s, i), n = s.slice();
    if (exitFor(P, s, i, dir, o) >= 0) { n[i] = null; return n; }
    var k = maxSlide(P, s, i, dir, o);
    if (!k) return null;
    n[i] = [s[i][0] + DIRS[dir][0] * k, s[i][1] + DIRS[dir][1] * k];
    return n;
  }
  function key(s) { var r = ''; for (var i = 0; i < s.length; i++) r += s[i] ? s[i][0] + '.' + s[i][1] + ';' : 'x;'; return r; }
  // BFS: returns shortest list of [i,dir] moves (full slides) or null.
  function solve(L, cap) {
    var P = prepare(L), start = initState(P), seen = new Map(), q = [start], head = 0;
    cap = cap || 300000;
    seen.set(key(start), null);
    while (head < q.length) {
      var s = q[head++];
      if (clearedCount(s) === s.length) {
        var path = [], k = key(s);
        while (seen.get(k)) { var m = seen.get(k); path.unshift([m[1], m[2]]); k = m[0]; }
        return path;
      }
      for (var i = 0; i < s.length; i++) {
        if (!s[i]) continue;
        for (var dir = 0; dir < 4; dir++) {
          var n = applyMove(P, s, i, dir);
          if (!n) continue;
          var nk = key(n);
          if (seen.has(nk)) continue;
          seen.set(nk, [key(s), i, dir]);
          if (seen.size > cap) return null;
          q.push(n);
        }
      }
    }
    return null;
  }
  function verify(L, sol) {
    var P = prepare(L), s = initState(P);
    for (var m = 0; m < sol.length; m++) { s = applyMove(P, s, sol[m][0], sol[m][1]); if (!s) return false; }
    return clearedCount(s) === s.length;
  }

  // ---- Step model (what the player can actually do: drag any distance) ----
  // A step moves block i one cell in dir, or out through a matching open exit.
  function canLeave(P, s, i, dir, o) {
    var b = P.L.blocks[i], d = DIRS[dir], x = s[i][0], y = s[i][1], cells = [], a;
    if (dir === 0) for (a = 0; a < b.w; a++) cells.push([x + a, y]);
    if (dir === 2) for (a = 0; a < b.w; a++) cells.push([x + a, y + b.h - 1]);
    if (dir === 1) for (a = 0; a < b.h; a++) cells.push([x + b.w - 1, y + a]);
    if (dir === 3) for (a = 0; a < b.h; a++) cells.push([x, y + a]);
    var ex = -1;
    for (var c = 0; c < cells.length; c++) {
      var e = P.exitAt[cells[c][0] + ',' + cells[c][1] + ',' + dir];
      if (e === undefined || (ex >= 0 && e !== ex)) return -1;
      ex = e;
    }
    if (ex < 0 || P.L.exits[ex].c !== b.c || !exitOpen(P, s, ex)) return -1;
    return ex;
  }
  function step(P, s, i, dir, o) {
    o = o || occ(P, s, i);
    var n = s.slice();
    if (canLeave(P, s, i, dir, o) >= 0) { n[i] = null; return n; }
    var x = s[i][0] + DIRS[dir][0], y = s[i][1] + DIRS[dir][1];
    if (!fits(P, o, P.L.blocks[i], x, y)) return null;
    n[i] = [x, y]; return n;
  }
  function distMaps(P) { // per colour: BFS distance from every floor cell to an exit of that colour
    var W = P.L.w, H = P.L.h, maps = {};
    P.L.exits.forEach(function (e) {
      var m = maps[e.c] || (maps[e.c] = new Array(W * H).fill(1e9)), q = [];
      for (var k = 0; k < e.len; k++) { var x = e.x + (e.side % 2 === 0 ? k : 0), y = e.y + (e.side % 2 === 1 ? k : 0); m[y * W + x] = 0; q.push([x, y]); }
      while (q.length) { var c = q.shift(); for (var d = 0; d < 4; d++) { var nx = c[0] + DIRS[d][0], ny = c[1] + DIRS[d][1];
        if (isFloor(P, nx, ny) && m[ny * W + nx] > m[c[1] * W + c[0]] + 1) { m[ny * W + nx] = m[c[1] * W + c[0]] + 1; q.push([nx, ny]); } } }
    });
    return maps;
  }
  // Best-first search over steps. Not guaranteed shortest, but any path found is a real proof.
  function solveSteps(L, cap) {
    var P = prepare(L), start = initState(P), dm = distMaps(P), W = L.w;
    cap = cap || 200000;
    function h(s) { var t = 0; for (var i = 0; i < s.length; i++) if (s[i]) { var m = dm[L.blocks[i].c]; t += (m ? m[s[i][1] * W + s[i][0]] : 99) + 1; } return t; }
    var heap = [], seen = new Map();
    function push(it) { heap.push(it); var c = heap.length - 1; while (c) { var p = (c - 1) >> 1; if (heap[p].f <= it.f) break; heap[c] = heap[p]; c = p; } heap[c] = it; }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { var c = 0; for (;;) { var l = 2 * c + 1, r = l + 1, m = c;
      if (l < heap.length && heap[l].f < (m === c ? last.f : heap[m].f)) m = l; if (r < heap.length && heap[r].f < (m === c ? last.f : heap[m].f)) m = r;
      if (m === c) break; heap[c] = heap[m]; c = m; } heap[c] = last; } return top; }
    var k0 = key(start); seen.set(k0, null); push({ s: start, g: 0, f: h(start), k: k0 });
    while (heap.length) {
      var it = pop(), s = it.s;
      if (clearedCount(s) === s.length) {
        var path = [], k = it.k;
        while (seen.get(k)) { var mv = seen.get(k); path.unshift([mv[1], mv[2]]); k = mv[0]; }
        return path;
      }
      for (var i = 0; i < s.length; i++) {
        if (!s[i]) continue;
        var o = occ(P, s, i);
        for (var dir = 0; dir < 4; dir++) {
          var n = step(P, s, i, dir, o); if (!n) continue;
          var nk = key(n); if (seen.has(nk)) continue;
          seen.set(nk, [it.k, i, dir]);
          if (seen.size > cap) return null;
          push({ s: n, g: it.g + 1, f: it.g + 1 + 2 * h(n), k: nk });
        }
      }
    }
    return null;
  }
  function verifySteps(L, sol) {
    var P = prepare(L), s = initState(P);
    for (var m = 0; m < sol.length; m++) { s = step(P, s, sol[m][0], sol[m][1]); if (!s) return false; }
    return clearedCount(s) === s.length;
  }
  function drags(sol) { var n = 0; for (var m = 0; m < sol.length; m++) if (!m || sol[m][0] !== sol[m - 1][0] || sol[m][1] !== sol[m - 1][1]) n++; return n; }
  var api = { canLeave: canLeave, step: step, solveSteps: solveSteps, verifySteps: verifySteps, drags: drags, DIRS: DIRS, prepare: prepare, isFloor: isFloor, initState: initState, clearedCount: clearedCount,
    occ: occ, fits: fits, maxSlide: maxSlide, exitFor: exitFor, exitOpen: exitOpen, applyMove: applyMove, solve: solve, verify: verify };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(this);
