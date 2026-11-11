/* Последняя страница — «Spiral Images» (Originkit), переписано без React, на чистом Canvas 2D.
   Работы Людмилы (карточки, баннеры, главные экраны сайтов) плывут по архимедовой спирали от края экрана к центру,
   поворачиваясь вдоль спирали, и тают у центра — за портретом. Настройки — как в присланном пресете:
   витков 3,5, скорость 2, шаг 3, размах 6, без уменьшения к центру, проявление 1, угасание 8, скругление 8.
   Размер карточек пересчитан от размера экрана (в образце — 75 px на поле 600 px). Кадры считаются, только пока страница на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-final]');
  if (!sec) return;
  var canvas = sec.querySelector('.final__spiral');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TWO_PI = Math.PI * 2;
  var turns = 3.5, speed = 2, spacing = 3, spread = 6, sizeAttenuation = 0, imageSize = 75, fadeIn = 1, fadeOut = 8, cornerRadius = 8;

  /* работы — вперемешку: широкие экраны и баннеры между вертикальными карточками */
  var ORDER = [1, 2, 14, 4, 19, 6, 3, 8, 23, 9, 5, 10, 24, 11, 7, 13, 25, 15, 12, 17, 26, 18, 16, 20, 27, 21, 22];
  var imgs = [], loaded = false;
  var load = function () {
    if (loaded) return;
    loaded = true;
    imgs = ORDER.map(function (n) { var el = new Image(); el.decoding = 'async'; el.src = 'img/final/s' + String(n).padStart(2, '0') + '.webp'; return el; });
  };

  var dpr = Math.min(1.5, window.devicePixelRatio || 1);
  var w = 0, h = 0, photoEl = sec.querySelector('.final__photo'), photo = { w: 1, h: 1 };
  var resize = function () {
    w = sec.clientWidth; h = sec.clientHeight;
    photo = { w: photoEl.offsetWidth || 1, h: photoEl.offsetHeight || 1 };
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
  };
  resize();
  window.addEventListener('resize', function () { resize(); if (!running) draw(performance.now()); });

  /* архимедова спираль: n от 0 (край) до 1 (центр) */
  var spiral = function (n, R) {
    var ang = n * turns * TWO_PI, rad = R * (1 - n);
    return { x: rad * Math.cos(ang), y: -rad * Math.sin(ang) };
  };
  /* перепараметризация по длине дуги — карточки идут с равным шагом, а не сбиваются к центру */
  var M = 2000, cum = new Float32Array(M + 1), prev = spiral(0, 1);
  for (var k = 1; k <= M; k++) { var pt = spiral(k / M, 1), dx = pt.x - prev.x, dy = pt.y - prev.y; cum[k] = cum[k - 1] + Math.sqrt(dx * dx + dy * dy); prev = pt; }
  var total = cum[M] || 1, K = 1024, nForArc = new Float32Array(K + 1), j = 0;
  for (var a = 0; a <= K; a++) {
    var target = (a / K) * total;
    while (j < M && cum[j + 1] < target) j++;
    var seg = cum[j + 1] - cum[j];
    nForArc[a] = (j + (seg > 0 ? (target - cum[j]) / seg : 0)) / M;
  }
  var arcToN = function (s) {
    var x = Math.max(0, Math.min(K, s * K)), i = Math.floor(x), p = nForArc[i], q = nForArc[Math.min(i + 1, K)];
    return p + (q - p) * (x - i);
  };
  var roundRect = function (x, y, rw, rh, r) {
    var rr = Math.min(r, rw / 2, rh / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, rr); ctx.arcTo(x + rw, y + rh, x, y + rh, rr);
    ctx.arcTo(x, y + rh, x, y, rr); ctx.arcTo(x, y, x + rw, y, rr); ctx.closePath();
  };

  var progress = 0, last = 0, raf = 0, running = false;
  var draw = function (now) {
    var dt = last ? (now - last) / 1000 : 0; last = now;
    if (!reduce) progress = (progress + speed * Math.min(dt, 0.1)) % 100;
    var L = progress;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var R = 0.48 * Math.min(w, h) * (1 + (spread - 1) * 0.18);
    var size = imageSize * Math.min(w, h) / 600;
    var nImgs = imgs.length || 1;
    var stepFrac = Math.max(0.005, (spacing * 0.5) / 100);
    var slots = Math.min(400, Math.ceil(1 / stepFrac) + 2), base = L / 100, cards = [];
    for (var i = 0; i < slots; i++) { var s = (((base + i * stepFrac) % 1) + 1) % 1; cards.push({ tt: s * 100, n: arcToN(s), img: i % nImgs }); }
    cards.sort(function (p, q) { return p.n - q.n; });
    for (var c = 0; c < cards.length; c++) {
      var cd = cards[c], p = spiral(cd.n, R), dist = Math.sqrt(p.x * p.x + p.y * p.y);
      var op = 1;
      if (cd.tt < fadeIn) op = cd.tt / fadeIn; else if (cd.tt > 100 - fadeOut) op = (100 - cd.tt) / fadeOut;
      if (op < 0.01) continue;
      var x = cx + p.x, y = cy + p.y;
      /* у портрета карточки тают — уходят «за» Людмилу, не ложатся на лицо и жакет */
      var ex = p.x / (photo.w * 0.5), ey = (p.y + photo.h * 0.04) / (photo.h * 0.5), e = Math.sqrt(ex * ex + ey * ey);
      op *= Math.max(0, Math.min(1, (e - 0.8) / 0.35));
      if (op < 0.01) continue;
      if (x < -size * 1.5 || x > w + size * 1.5 || y < -size * 1.5 || y > h + size * 1.5) continue;   // за краем экрана — не рисуем
      var scale = sizeAttenuation > 0 ? Math.pow(Math.min(dist / R, 1), sizeAttenuation * 0.5) : 1;
      var p2 = spiral(Math.min(cd.n + 0.001, 1), R), angle = Math.atan2(p2.y - p.y, p2.x - p.x);
      var el = imgs[cd.img], ready = el && el.complete && el.naturalWidth > 0;
      if (!ready) continue;
      var aspect = el.naturalWidth / el.naturalHeight, cw = size * scale, ch = cw / aspect;
      if (aspect < 1) { ch = size * scale; cw = ch * aspect; }
      var rad = (cornerRadius / 20) * (Math.min(cw, ch) / 2);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = op;
      roundRect(-cw / 2, -ch / 2, cw, ch, rad); ctx.clip();
      ctx.drawImage(el, -cw / 2, -ch / 2, cw, ch);
      ctx.restore();
    }
    if (running) raf = requestAnimationFrame(draw);
  };
  var start = function () { if (running) return; running = true; last = 0; raf = requestAnimationFrame(draw); };
  var stop = function () { running = false; cancelAnimationFrame(raf); };

  /* картинки грузятся заранее, за экран до страницы; крутится, только пока страница видна */
  new IntersectionObserver(function (en) { if (en[0].isIntersecting) load(); }, { rootMargin: '100% 0px' }).observe(sec);
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) { load(); if (reduce) { setTimeout(function () { draw(performance.now()); }, 600); } else start(); }
    else stop();
  }, { threshold: 0.05 }).observe(sec);
})();
