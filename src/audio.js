// Original synthesised sounds (Web Audio). No samples.
var Sfx = (function () {
  var ctx = null, master = null, noise = null;
  var muted = localStorage.getItem('pebbleGarden.muted') === '1';
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function tone(freq, t0, dur, vol, type, endFreq) {
    if (!ctx) return; var t = ctx.currentTime + (t0 || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    init: init,
    isMuted: function () { return muted; },
    toggle: function () { muted = !muted; localStorage.setItem('pebbleGarden.muted', muted ? '1' : '0'); if (master) master.gain.value = muted ? 0 : 0.7; return muted; },
    snap: function () { tone(330, 0, 0.09, 0.35, 'sine', 170); tone(900, 0, 0.03, 0.06, 'triangle'); },
    bump: function () { tone(180, 0, 0.07, 0.15, 'sine', 140); },
    whoosh: function () {
      if (!ctx) return; var t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.32);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.4);
      tone(1320, 0.22, 0.35, 0.08, 'sine'); tone(1980, 0.26, 0.3, 0.04, 'sine');
    },
    unlock: function () { tone(660, 0, 0.25, 0.18, 'triangle'); tone(990, 0.12, 0.4, 0.18, 'triangle'); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.13, 0.5, 0.16, 'triangle'); }); tone(1568, 0.6, 0.8, 0.06, 'sine'); },
    star: function (i) { tone(880 + i * 220, 0, 0.3, 0.12, 'sine'); },
    tap: function () { tone(520, 0, 0.06, 0.12, 'sine', 600); }
  };
})();
