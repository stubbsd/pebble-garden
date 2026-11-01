// Original hand-drawn (canvas) animal faces for special pebbles. No external art.
var Animals = (function () {
  var NAMES = ['capybara', 'unicorn', 'bunny', 'kitten', 'panda', 'frog', 'bear'];
  var INK = '#2a2135';
  function circle(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 7); g.fill(); }
  function eyes(g, cx, ey, u, sep, look, blink, big, sleepy) {
    for (var s = -1; s <= 1; s += 2) {
      var x = cx + s * sep;
      if (blink || sleepy) { g.strokeStyle = INK; g.lineWidth = u * 0.035; g.lineCap = 'round'; g.beginPath();
        if (sleepy && !blink) g.arc(x, ey - u * 0.01, u * 0.045, 0.15 * Math.PI, 0.85 * Math.PI); else { g.moveTo(x - u * 0.045, ey); g.lineTo(x + u * 0.045, ey); }
        g.stroke(); continue; }
      var r = big ? u * 0.075 : u * 0.055;
      circle(g, x + look[0] * u * 0.02, ey + look[1] * u * 0.02, r, INK);
      circle(g, x + look[0] * u * 0.02 - r * 0.35, ey + look[1] * u * 0.02 - r * 0.35, r * 0.38, '#fff');
    }
  }
  function cheeks(g, cx, y, u, sep) { g.globalAlpha *= 0.55; ell(g, cx - sep, y, u * 0.06, u * 0.035, '#ff7fa3'); ell(g, cx + sep, y, u * 0.06, u * 0.035, '#ff7fa3'); g.globalAlpha /= 0.55; }
  function smile(g, cx, y, u, w) { g.strokeStyle = INK; g.lineWidth = u * 0.03; g.lineCap = 'round'; g.beginPath(); g.arc(cx, y, w, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  function catMouth(g, cx, y, u) { g.strokeStyle = INK; g.lineWidth = u * 0.028; g.lineCap = 'round'; g.beginPath();
    g.arc(cx - u * 0.035, y, u * 0.035, 0, Math.PI); g.moveTo(cx + u * 0.07, y); g.arc(cx + u * 0.035, y, u * 0.035, 0, Math.PI); g.stroke(); }
  function whiskers(g, cx, y, u) { g.strokeStyle = 'rgba(42,33,53,0.55)'; g.lineWidth = u * 0.018; g.beginPath();
    for (var s = -1; s <= 1; s += 2) for (var k = -1; k <= 1; k += 2) { g.moveTo(cx + s * u * 0.12, y + k * u * 0.015); g.lineTo(cx + s * u * 0.3, y + k * u * 0.05); } g.stroke(); }

  function draw(g, a, cx, cy, u, look, blink, t) {
    var top = cy - u * 0.43;
    g.save();
    switch (a) {
      case 0: // capybara: wide calm snout, tiny ears, little orange on its head
        ell(g, cx - u * 0.27, top + u * 0.06, u * 0.07, u * 0.05, '#7a4e2d'); ell(g, cx + u * 0.27, top + u * 0.06, u * 0.07, u * 0.05, '#7a4e2d');
        ell(g, cx, cy + u * 0.1, u * 0.27, u * 0.18, '#a8754a');
        ell(g, cx, cy + u * 0.08, u * 0.23, u * 0.14, '#c69465');
        circle(g, cx - u * 0.07, cy + u * 0.05, u * 0.025, INK); circle(g, cx + u * 0.07, cy + u * 0.05, u * 0.025, INK);
        smile(g, cx, cy + u * 0.1, u, u * 0.05);
        eyes(g, cx, cy - u * 0.14, u, u * 0.16, look, blink, false, true);
        circle(g, cx + u * 0.02, top - u * 0.02 + Math.sin(t * 2) * u * 0.01, u * 0.1, '#ff9a2e');
        ell(g, cx + u * 0.07, top - u * 0.12, u * 0.05, u * 0.025, '#3fae5a', -0.5);
        break;
      case 1: // unicorn: golden striped horn, rainbow mane, big sparkly eyes
        g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(cx - u * 0.08, top + u * 0.06); g.lineTo(cx, top - u * 0.3); g.lineTo(cx + u * 0.08, top + u * 0.06); g.closePath(); g.fill();
        g.strokeStyle = '#e8a817'; g.lineWidth = u * 0.025; g.beginPath(); g.moveTo(cx - u * 0.06, top - u * 0.02); g.lineTo(cx + u * 0.05, top - u * 0.07); g.moveTo(cx - u * 0.04, top - u * 0.12); g.lineTo(cx + u * 0.035, top - u * 0.16); g.stroke();
        ['#ff8fb1', '#b48cff', '#7fd0ff', '#8fe3a8'].forEach(function (c, k) { circle(g, cx - u * 0.33 + k * u * 0.03, top + u * 0.08 + k * u * 0.12, u * 0.09, c); });
        ['#ff8fb1', '#b48cff'].forEach(function (c, k) { circle(g, cx - u * 0.17 + k * u * 0.12, top + u * 0.02, u * 0.08, c); });
        eyes(g, cx + u * 0.04, cy - u * 0.04, u, u * 0.13, look, blink, true);
        if (!blink) { g.strokeStyle = INK; g.lineWidth = u * 0.02; g.beginPath(); g.moveTo(cx + u * 0.24, cy - u * 0.1); g.lineTo(cx + u * 0.28, cy - u * 0.13); g.moveTo(cx - u * 0.16, cy - u * 0.1); g.lineTo(cx - u * 0.2, cy - u * 0.13); g.stroke(); }
        cheeks(g, cx + u * 0.04, cy + u * 0.09, u, u * 0.2); smile(g, cx + u * 0.04, cy + u * 0.08, u, u * 0.05);
        g.fillStyle = '#fff6b0'; g.globalAlpha *= 0.6 + 0.4 * Math.sin(t * 5); drawSpark(g, cx + u * 0.3, top + u * 0.02, u * 0.06); break;
      case 2: // bunny: long ears
        for (var s = -1; s <= 1; s += 2) { ell(g, cx + s * u * 0.13, top - u * 0.12, u * 0.08, u * 0.2, '#fdf6ff', s * 0.15); ell(g, cx + s * u * 0.13, top - u * 0.1, u * 0.04, u * 0.14, '#ffb3cb', s * 0.15); }
        ell(g, cx, cy + u * 0.1, u * 0.17, u * 0.12, 'rgba(255,255,255,0.85)');
        eyes(g, cx, cy - u * 0.08, u, u * 0.15, look, blink, true);
        g.fillStyle = '#ff7fa3'; g.beginPath(); g.moveTo(cx - u * 0.04, cy + u * 0.04); g.lineTo(cx + u * 0.04, cy + u * 0.04); g.lineTo(cx, cy + u * 0.08); g.closePath(); g.fill();
        catMouth(g, cx, cy + u * 0.09, u); cheeks(g, cx, cy + u * 0.05, u, u * 0.24); break;
      case 3: // kitten: pointy ears, whiskers
        for (s = -1; s <= 1; s += 2) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(cx + s * u * 0.33, top + u * 0.1); g.lineTo(cx + s * u * 0.28, top - u * 0.12); g.lineTo(cx + s * u * 0.1, top + u * 0.02); g.closePath(); g.fill();
          g.fillStyle = '#ffb3cb'; g.beginPath(); g.moveTo(cx + s * u * 0.29, top + u * 0.06); g.lineTo(cx + s * u * 0.27, top - u * 0.06); g.lineTo(cx + s * u * 0.17, top + u * 0.02); g.closePath(); g.fill(); }
        eyes(g, cx, cy - u * 0.07, u, u * 0.15, look, blink, true);
        circle(g, cx, cy + u * 0.05, u * 0.03, '#ff7fa3'); catMouth(g, cx, cy + u * 0.08, u); whiskers(g, cx, cy + u * 0.07, u); break;
      case 4: // panda
        circle(g, cx - u * 0.27, top + u * 0.05, u * 0.09, INK); circle(g, cx + u * 0.27, top + u * 0.05, u * 0.09, INK);
        ell(g, cx, cy, u * 0.3, u * 0.27, 'rgba(255,255,255,0.92)');
        ell(g, cx - u * 0.12, cy - u * 0.04, u * 0.08, u * 0.1, INK, 0.5); ell(g, cx + u * 0.12, cy - u * 0.04, u * 0.08, u * 0.1, INK, -0.5);
        for (s = -1; s <= 1; s += 2) { if (blink) { g.strokeStyle = '#fff'; g.lineWidth = u * 0.025; g.beginPath(); g.moveTo(cx + s * u * 0.12 - u * 0.03, cy - u * 0.04); g.lineTo(cx + s * u * 0.12 + u * 0.03, cy - u * 0.04); g.stroke(); }
          else { circle(g, cx + s * u * 0.12 + look[0] * u * 0.015, cy - u * 0.045 + look[1] * u * 0.015, u * 0.035, '#fff'); } }
        ell(g, cx, cy + u * 0.08, u * 0.045, u * 0.03, INK); smile(g, cx, cy + u * 0.11, u, u * 0.04); cheeks(g, cx, cy + u * 0.1, u, u * 0.2); break;
      case 5: // frog: eyes on top bumps, wide grin
        for (s = -1; s <= 1; s += 2) { circle(g, cx + s * u * 0.17, top + u * 0.02, u * 0.13, 'rgba(255,255,255,0.35)'); circle(g, cx + s * u * 0.17, top + u * 0.02, u * 0.1, '#fff'); }
        for (s = -1; s <= 1; s += 2) { if (blink) { g.strokeStyle = INK; g.lineWidth = u * 0.03; g.beginPath(); g.moveTo(cx + s * u * 0.17 - u * 0.05, top + u * 0.02); g.lineTo(cx + s * u * 0.17 + u * 0.05, top + u * 0.02); g.stroke(); }
          else circle(g, cx + s * u * 0.17 + look[0] * u * 0.03, top + u * 0.02 + look[1] * u * 0.03, u * 0.055, INK); }
        g.strokeStyle = INK; g.lineWidth = u * 0.032; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy - u * 0.02, u * 0.2, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
        cheeks(g, cx, cy + u * 0.08, u, u * 0.26); circle(g, cx - u * 0.04, cy - u * 0.04, u * 0.015, INK); circle(g, cx + u * 0.04, cy - u * 0.04, u * 0.015, INK); break;
      default: // bear cub
        for (s = -1; s <= 1; s += 2) { circle(g, cx + s * u * 0.27, top + u * 0.04, u * 0.1, 'rgba(255,255,255,0.35)'); circle(g, cx + s * u * 0.27, top + u * 0.04, u * 0.055, 'rgba(255,255,255,0.6)'); }
        ell(g, cx, cy + u * 0.1, u * 0.15, u * 0.11, 'rgba(255,240,220,0.9)');
        eyes(g, cx, cy - u * 0.09, u, u * 0.14, look, blink, false);
        ell(g, cx, cy + u * 0.05, u * 0.05, u * 0.035, INK); smile(g, cx, cy + u * 0.09, u, u * 0.035); cheeks(g, cx, cy + u * 0.04, u, u * 0.24);
    }
    g.restore();
  }
  function drawSpark(g, x, y, r) { g.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  return { draw: draw, NAMES: NAMES, count: NAMES.length };
})();
