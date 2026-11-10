/* Блок 8 «Баннеры, наружка, соцсети» — точно по макету Figma «Slide 4:3 - 1» (узел 1029:275).
   Справа от тонкой линии — фото работы, слева от линии — её описание.
   Смена работы: описание рассеивается частицами влево, в зону точек (по мотивам codrops «Texture Projection»), фото уходит влево под линию, следующее фото подъезжает справа
   к линии, и из-под линии с другой стороны выходит описание именно этого баннера. Идёт само, пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-show]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var photos = Array.prototype.slice.call(sec.querySelectorAll('.show__photo'));
  var descs = Array.prototype.slice.call(sec.querySelectorAll('.show__desc'));
  var stage = sec.querySelector('.show__right');
  var left = sec.querySelector('.show__left');
  var dust = sec.querySelector('.show__dust');
  var total = photos.length, cur = 0, HOLD = 4.6;

  /* описание — по буквам (слова не рвутся): при смене буквы рассыпаются пылью */
  descs.forEach(function (d) {
    d.querySelectorAll('.show__t1, .show__t2, .show__name, .show__list li').forEach(function (el) {
      el.innerHTML = el.textContent.split(' ').map(function (w) {
        return '<span class="dw">' + Array.prototype.map.call(w, function (ch) { return '<span class="dc">' + ch + '</span>'; }).join('') + '</span>';
      }).join(' ');
    });
    d._chars = Array.prototype.slice.call(d.querySelectorAll('.dc'));
    d._rows = Array.prototype.slice.call(d.querySelectorAll('.show__type, .show__name, .show__list li'));
  });

  /* ---------- рассеивание текста (по мотивам codrops «Texture Projection», Marco Fugaro):
     текст описания переводится в облако мелких частиц — каждая частица берёт пиксель букв —
     и частицы с разбросом и лёгким завихрением уносятся влево, в зону точек-пылинок, и гаснут ---------- */
  var ctx = dust.getContext('2d'), parts = [], dpr = Math.min(2, window.devicePixelRatio || 1), dustRaf = 0, t0 = 0;
  var sizeDust = function () { dust.width = sec.clientWidth * dpr; dust.height = sec.clientHeight * dpr; };
  var easeIO = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var tickDust = function () {
    dustRaf = 0;
    var now = (performance.now() - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, sec.clientWidth, sec.clientHeight);
    ctx.fillStyle = '#E8DCC8';   // цвет текстов — как в шапке
    var alive = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], q = (now - p.delay) / p.dur;
      if (q >= 1) continue;
      alive++;
      if (q < 0) { ctx.globalAlpha = p.a; ctx.fillRect(p.x0, p.y0, p.sz, p.sz); continue; }   // ещё ждёт своей очереди — стоит буквой
      var e = easeIO(q);
      var x = p.x0 + (p.tx - p.x0) * e + Math.sin(p.ph + q * 5) * p.sw * q;
      var y = p.y0 + (p.ty - p.y0) * e + Math.cos(p.ph + q * 4) * p.sw * 0.6 * q;
      ctx.globalAlpha = p.a * (1 - Math.pow(q, 1.6));
      var s = p.sz * (1 - 0.45 * q);
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
    if (alive) dustRaf = requestAnimationFrame(tickDust); else { parts = []; ctx.clearRect(0, 0, sec.clientWidth, sec.clientHeight); }
  };
  /* снимок текста описания в частицы */
  var sample = function (d) {
    var box = sec.getBoundingClientRect(), db = d.getBoundingClientRect();
    var pad = 20, W = Math.ceil(db.width + 2 * pad), H = Math.ceil(db.height + 2 * pad);
    var ox = db.left - box.left - pad, oy = db.top - box.top - pad;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#fff'; cx.textBaseline = 'middle'; cx.textAlign = 'left';
    d._chars.forEach(function (ch) {
      var r = ch.getBoundingClientRect(), cs = getComputedStyle(ch);
      cx.globalAlpha = parseFloat(getComputedStyle(ch.parentNode.parentNode).color.split(',')[3]) || 1;
      cx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      cx.fillText(ch.textContent, r.left - db.left + pad, r.top + r.height / 2 - db.top + pad);
    });
    d.querySelectorAll('.show__list li').forEach(function (li) {   // точки списка
      var r = li.getBoundingClientRect(), fs = parseFloat(getComputedStyle(li).fontSize);
      cx.globalAlpha = 0.7; cx.beginPath(); cx.arc(r.left - db.left + pad - fs * 0.85, r.top - db.top + pad + fs * 0.62, fs * 0.13, 0, 6.2832); cx.fill();
    });
    var data = cx.getImageData(0, 0, W, H).data, k = Math.max(0.55, Math.min(1, sec.clientWidth / 1920));
    var step = sec.clientWidth < 700 ? 1.5 : Math.max(1.5, 2 * k), pts = [];
    for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) {
      var a = data[((y | 0) * W + (x | 0)) * 4 + 3] / 255;
      if (a > 0.25) pts.push([x, y, a]);
    }
    /* куда уносит: в зону точек слева от описания */
    var zoneR = Math.max(40, db.left - box.left - 30 * k), spanY = 260 * k;
    var minX = 1e9, maxX = -1e9;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); });
    var dw = Math.max(1, maxX - minX);
    pts.forEach(function (p) {
      var xn = (p[0] - minX) / dw;                                       // левые частицы срываются первыми
      parts.push({ x0: ox + p[0], y0: oy + p[1], a: Math.min(1, p[2]) * 0.95, sz: step * (0.7 + Math.random() * 0.6),
        tx: Math.random() * zoneR * 0.95 - 20 * k, ty: oy + p[1] + (Math.random() - 0.5) * spanY,
        delay: xn * 0.4 + Math.random() * 0.25, dur: 1.05 + Math.random() * 0.8, ph: Math.random() * 6.28, sw: (10 + Math.random() * 40) * k });
    });
  };

  /* ---------- описание: выходит из-под линии / рассыпается пылью ---------- */
  var descIn = function (d, delay) {
    gsap.killTweensOf(d._chars); gsap.killTweensOf(d._rows);
    gsap.set(d, { autoAlpha: 1 });
    gsap.set(d._chars, { clearProps: 'all' });
    gsap.set(d._rows, { x: 0, autoAlpha: 1 });
    if (reduce) return;
    var edge = left.getBoundingClientRect().right;                    // правый край левой части — линия
    gsap.fromTo(d._rows, { x: function (i, el) { return edge - el.getBoundingClientRect().left + 2; }, autoAlpha: 1 },   // строки выходят из-под линии влево
      { x: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: delay || 0 });
  };
  var descOut = function (d) {
    if (reduce) { gsap.set(d, { autoAlpha: 0 }); return; }
    sizeDust();
    if (!parts.length) t0 = performance.now();
    var base = (performance.now() - t0) / 1000, n0 = parts.length;
    sample(d);
    for (var i = n0; i < parts.length; i++) parts[i].delay += base;   // новые частицы — от текущего момента
    gsap.set(d, { autoAlpha: 0 });                                     // текст целиком перешёл в частицы
    if (!dustRaf) dustRaf = requestAnimationFrame(tickDust);
  };

  /* ---------- фото: подъезжает к линии / уходит под линию ---------- */
  /* следующее фото: медленно и плавно скользит справа к линии и постепенно проявляется — из едва видного в яркое */
  var farX = function () { return Math.min(stage.clientWidth * 0.5, stage.clientWidth - 40); };
  var photoIn = function (p) {
    gsap.killTweensOf(p);
    gsap.set(p, { zIndex: 2 });
    if (reduce) { gsap.set(p, { x: 0, autoAlpha: 1, filter: 'brightness(1)' }); return; }
    gsap.fromTo(p, { x: farX(), autoAlpha: 0, filter: 'brightness(.35)' },
      { x: 0, autoAlpha: 1, filter: 'brightness(1)', duration: 2.3, ease: 'power2.out' });
  };
  /* прежнее фото спокойно уходит влево под линию — раньше, чем подъедет следующее: без толкотни */
  var photoOut = function (p) {
    gsap.killTweensOf(p);
    gsap.set(p, { zIndex: 1 });
    if (reduce) { gsap.set(p, { autoAlpha: 0 }); return; }
    gsap.to(p, { x: function () { return -(p.offsetLeft + p.offsetWidth + 10); }, duration: 1.2, ease: 'sine.inOut',
      onComplete: function () { gsap.set(p, { autoAlpha: 0, x: 0 }); } });
  };

  /* ---------- круг работ ---------- */
  gsap.set(photos.slice(1), { autoAlpha: 0 });
  gsap.set(descs.slice(1), { autoAlpha: 0 });
  var timer = null, started = false;
  var next = function () {
    var from = cur; cur = (cur + 1) % total;
    descOut(descs[from]);
    gsap.delayedCall(reduce ? 0 : 0.3, function () { photoOut(photos[from]); });
    gsap.delayedCall(reduce ? 0 : 1.1, function () { photoIn(photos[cur]); });   // когда прежнее почти ушло
    gsap.delayedCall(reduce ? 0 : 2.45, function () {   // фото почти у линии — описание выходит из-под неё; прежнее к этому времени уже рассыпалось
      descs.forEach(function (d) { if (d !== descs[cur]) { gsap.killTweensOf(d._chars); gsap.set(d, { autoAlpha: 0 }); } });
      descIn(descs[cur]);
    });
    timer = gsap.delayedCall(HOLD + (reduce ? 0 : 2.5), next);
  };
  var begin = function () {
    started = true;
    photoIn(photos[0]);
    descIn(descs[0], reduce ? 0 : 1.9);
    timer = gsap.delayedCall(HOLD + 2.3, next);
  };
  window.addEventListener('resize', sizeDust);

  /* заход в блок: заголовок выезжает из-под строки; работы крутятся, только пока блок на экране */
  gsap.set(photos[0], { autoAlpha: 0 });
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) {
      if (!started) {
        if (!reduce) {
          gsap.from(sec.querySelector('.show__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
          gsap.from(sec.querySelectorAll('.show__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, delay: 0.1, ease: 'power3.out' });
          gsap.from(sec.querySelectorAll('.show__kicker, .show__tag'), { autoAlpha: 0, y: 14, duration: 0.7, delay: 0.35, stagger: 0.06, ease: 'power3.out' });
        }
        begin();
      } else if (timer) timer.resume();
    } else if (timer) timer.pause();
  }, { threshold: 0.3 }).observe(sec);

  /* ---------- лучи от линии влево (по мотивам «Star Burst», Originkit) ----------
     из точки на линии во все стороны расходятся тонкие лучи; по каждому бегут короткие светлые штрихи
     и тихо мерцают. Видна только левая половина — справа фото. Очень слабо: текст читается свободно, без подложек. */
  (function () {
    var cv = sec.querySelector('.show__burst'), line = sec.querySelector('.show__line');
    if (!cv || !line) return;
    var bx = cv.getContext('2d');
    var SPEED = 0.9, SIZE = 1.2, OPACITY = 0.13, TWINKLE = 0.2, SPOKES = 100, PER = 15;
    var seed = 0xbadf00d >>> 0;
    var rng = function () { seed = (seed + 0x6d2b79f5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    var cosA = new Float32Array(SPOKES), sinA = new Float32Array(SPOKES);
    for (var i = 0; i < SPOKES; i++) { var a = (i / SPOKES) * Math.PI * 2 + (rng() - 0.5) * 0.02; cosA[i] = Math.cos(a); sinA[i] = Math.sin(a); }
    var N = SPOKES * PER, pS = new Uint16Array(N), pT = new Float32Array(N), pV = new Float32Array(N), pZ = new Float32Array(N), pP = new Float32Array(N);
    for (i = 0; i < N; i++) { pS[i] = i % SPOKES; pT[i] = -0.05 + rng() * 1.1; pV[i] = (0.5 + rng()) * 0.25; pZ[i] = 0.7 + rng() * 0.8; pP[i] = rng() * Math.PI * 2; }
    /* штрих: от прозрачного хвоста к светлой голове — запекаем один раз */
    var spr = document.createElement('canvas'); spr.width = 64; spr.height = 2;
    var sg = spr.getContext('2d'), g = sg.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,250,250,0)'); g.addColorStop(0.7, 'rgba(255,250,250,.6)'); g.addColorStop(1, 'rgba(255,250,250,1)');
    sg.fillStyle = g; sg.fillRect(0, 0, 64, 2);
    var w = 0, h = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    var size = function () {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      var cr = cv.getBoundingClientRect(), lr = line.getBoundingClientRect();
      cx = lr.left - cr.left; cy = lr.top + lr.height / 2 - cr.top;           // центр — середина линии
      R = Math.sqrt(Math.max(cx, w - cx) * Math.max(cx, w - cx) + Math.max(cy, h - cy) * Math.max(cy, h - cy));
    };
    var time = 0;
    var draw = function (dt) {
      time += dt;
      bx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bx.globalCompositeOperation = 'source-over'; bx.globalAlpha = 1;
      bx.clearRect(0, 0, w, h);
      bx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < N; i++) {
        pT[i] += pV[i] * SPEED * dt;
        if (pT[i] > 1.1) { pT[i] = -0.05 - rng() * 0.05; pZ[i] = 0.7 + rng() * 0.8; pP[i] = rng() * Math.PI * 2; }
        var t = pT[i];
        if (t < 0 || t >= 1) continue;
        var s = pS[i];
        if (cosA[s] > 0.05) continue;                                              // вправо — там фото, не рисуем
        var tw = 0.7 + 0.3 * Math.sin(time * TWINKLE * 6 + pP[i]);
        var fade = t < 0.06 ? t / 0.06 : t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
        var al = Math.min(1, tw * fade * (1 + 0.5 * t) * OPACITY);
        if (al < 0.005) continue;
        var d = t * R, px = cx + cosA[s] * d, py = cy + sinA[s] * d;
        var len = (8 + 12 * (pV[i] / 0.25)) * (0.7 + 0.6 * pZ[i] * SIZE);
        bx.setTransform(dpr * cosA[s], dpr * sinA[s], -dpr * sinA[s], dpr * cosA[s], dpr * px, dpr * py);
        bx.globalAlpha = al;
        bx.drawImage(spr, -len, -0.5, len, 1);
      }
      bx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
    };
    var raf = 0, last = 0, on = false;
    var loop = function (t) { raf = requestAnimationFrame(loop); var dt = Math.min(0.05, Math.max(0.001, (t - (last || t)) / 1000)); last = t; draw(dt); };
    size(); for (var k = 0; k < 60; k++) draw(1 / 60);                         // сразу «в полёте», а не из центра
    window.addEventListener('resize', function () { size(); if (!on) draw(0); });
    if (reduce) return;
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !on) { on = true; last = 0; raf = requestAnimationFrame(loop); }
      else if (!en[0].isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
    }, { threshold: 0 }).observe(sec);
  })();
})();
