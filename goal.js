/* «Мой подход», первая карточка → «Как решаю я»: вместо фото — светлый фон и слово «Цель» из частиц,
   той же анимацией, что крупное «МОЙ ПОДХОД»: частицы слетаются в буквы, оставляя тающие следы, и потом
   всё время кружат вокруг своих точек. Цвет — тёмный тон фона. Каждый раз, когда карточку открывают,
   частицы разлетаются и собираются заново. Рисуем, только пока карточка открыта и видна. */
(function () {
  'use strict';
  var host = document.querySelector('[data-goal]');
  if (!host || !host.getContext) return;
  var back = host.closest('.apx__back');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = host.getContext('2d');
  var COLOR = '#6A5F51';                                   // тёмный тон светлого фона
  var W = 0, H = 0, parts = [], built = false, raf = 0, inView = false, shown = false, tick = 0;
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  var build = function () {
    var r = host.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    if (!W || !H) return false;
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    host.width = Math.round(W * dpr); host.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var o = off.getContext('2d');
    /* «Цель»: рукописная «Ц» и «ЕЛЬ» прописными — как «МОЙ ПОДХОД» */
    var size = W * 0.3;
    var cap = function (s) { return '400 ' + (s * 1.3) + 'px "Good Vibes Pro", "Great Vibes", cursive'; };
    var rest = function (s) { return '500 ' + s + 'px Inter, system-ui, sans-serif'; };
    o.font = cap(size); var capW = o.measureText('Ц').width;
    o.font = rest(size); var restW = o.measureText('ЕЛЬ').width;
    var k = Math.min(1, W * 0.8 / (capW + size * 0.05 + restW));
    size *= k;
    o.font = cap(size); capW = o.measureText('Ц').width;
    o.font = rest(size); restW = o.measureText('ЕЛЬ').width;
    var total = capW + size * 0.05 + restW;
    var x = (W - total) / 2, y = H * 0.42 + size * 0.36;   // чуть выше середины: внизу — текст карточки
    o.fillStyle = '#000';
    o.font = cap(size); o.fillText('Ц', x, y);
    o.font = rest(size); o.fillText('ЕЛЬ', x + capW + size * 0.05, y);
    var step = Math.max(2, Math.round(size / 55));
    var data = o.getImageData(0, 0, W, H).data, pts = [];
    for (var yy = 0; yy < H; yy += step) for (var xx = 0; xx < W; xx += step) if (data[(yy * W + xx) * 4 + 3] > 140) pts.push([xx, yy]);
    for (var i = pts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    pts = pts.slice(0, 1500);                                 // плотнее — буквы читаются чётко
    var s = W / 700;
    parts = pts.map(function (t) {
      return { x: rand(0, W), y: rand(0, H), px: 0, py: 0, vx: 0, vy: 0, tx: t[0], ty: t[1], a: rand(0, 6.283), r: rand(1, 4) * s,
        sp: rand(0.02, 0.06) * (Math.random() < .5 ? -1 : 1), maxSpeed: rand(3, 9) * s, maxForce: rand(0.3, 0.8) * s, size: rand(1.1, 2.6) * s };
    });
    parts.forEach(function (p) { p.px = p.x; p.py = p.y; });
    built = true;
    return true;
  };

  /* разлёт — перед каждой новой сборкой */
  var scatter = function () {
    parts.forEach(function (p) { p.x = p.px = rand(0, W); p.y = p.py = rand(0, H); p.vx = rand(-6, 6); p.vy = rand(-6, 6); });
    ctx.clearRect(0, 0, W, H);
  };

  var frame = function () {
    raf = 0;
    if (!inView || !isOpen()) { shown = false; return; }
    raf = requestAnimationFrame(frame);
    if ((tick++ & 1) === 1) return;                          // ~30 кадров в секунду — глазу незаметно, процессору легче
    ctx.globalCompositeOperation = 'destination-out';         // следы тают
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = COLOR; ctx.fillStyle = COLOR; ctx.lineCap = 'round'; ctx.lineWidth = 1.2 * W / 700;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.a += p.sp * 2;                                        // точка-цель медленно кружит — частицы не замирают
      var gx = p.tx + Math.cos(p.a) * p.r, gy = p.ty + Math.sin(p.a) * p.r;
      var dx = gx - p.x, dy = gy - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var want = d < 40 ? p.maxSpeed * d / 40 : p.maxSpeed;
      var sx = dx / d * want - p.vx, sy = dy / d * want - p.vy;
      var sm = Math.sqrt(sx * sx + sy * sy);
      if (sm > p.maxForce) { sx = sx / sm * p.maxForce; sy = sy / sm * p.maxForce; }
      p.vx += sx; p.vy += sy;
      var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (v > p.maxSpeed) { p.vx = p.vx / v * p.maxSpeed; p.vy = p.vy / v * p.maxSpeed; }
      if (d < 40) { p.vx *= 0.9; p.vy *= 0.9; }
      p.x += p.vx * 2; p.y += p.vy * 2;
      ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y);
      p.px = p.x; p.py = p.y;
    }
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    for (var q = 0; q < parts.length; q++) { var pp = parts[q]; ctx.fillRect(pp.x - pp.size * 0.6, pp.y - pp.size * 0.6, pp.size * 1.2, pp.size * 1.2); }
    ctx.globalAlpha = 1;
  };

  var isOpen = function () { return back && back.style.visibility !== 'hidden' && (parseFloat(back.style.opacity) || 0) > 0.02; };
  var check = function () {
    if (!inView || raf || !isOpen()) return;
    if (!built && !build()) return;
    if (!shown) { shown = true; scatter(); }                   // карточку только что открыли — собираем слово заново
    raf = requestAnimationFrame(frame);
  };
  if (reduce) return;
  var poll = 0;
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    new IntersectionObserver(function (e) {
      inView = e[0].isIntersecting;
      clearInterval(poll);
      if (inView) poll = setInterval(check, 200);              // карточку открыли — заметим за пятую долю секунды
    }, { threshold: 0 }).observe(host);
  });
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (built) { build(); } }, 200); });
})();
