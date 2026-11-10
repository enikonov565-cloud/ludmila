/* Блок 8 «Что умею: баннеры, наружка, соцсети» (Figma «п-р10(5)», «п-р10(6)»).
   Оформление — по мотивам «сканера карточек» (codepen blacklead-studio/xbwaqxE, по мотивам evervault.com):
   работы плывут лентой справа налево и проходят сквозь медный луч. До луча видна сама работа,
   за лучом она превращается в карточку с описанием: название, формат, результат. От луча летят искры.
   Работа, которая сейчас проходит луч, подписана под лентой. Ленту можно тянуть мышью или пальцем. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-show]');
  if (!sec) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stream = sec.querySelector('.show__stream');
  var track = sec.querySelector('.show__track');
  var sparks = sec.querySelector('.show__sparks');
  var scan = sec.querySelector('.show__scan');
  var caps = Array.prototype.slice.call(sec.querySelectorAll('.show__cap'));
  var tpl = Array.prototype.slice.call(track.children);   // четыре работы из разметки
  var total = tpl.length;

  /* лента повторяется, чтобы шла без конца */
  var copies = 3;
  for (var c = 1; c < copies; c++) tpl.forEach(function (n) { var k = n.cloneNode(true); k.setAttribute('aria-hidden', 'true'); k.querySelector('img').alt = ''; track.appendChild(k); });
  var cards = Array.prototype.slice.call(track.querySelectorAll('.show__card'));
  cards.forEach(function (card) { card._img = card.querySelector('.show__img'); card._desc = card.querySelector('.show__desc'); });

  /* ---------- движение ленты ---------- */
  var u = 1, setW = 0, scanX = 0, x = 0, vel = 0, base = 0, dragging = false, running = false, active = -1;
  var measure = function () {
    u = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches) u = 0.62;
    base = reduce ? 0 : -110 * Math.max(u, 0.5);              // px в секунду, справа налево
    setW = cards[total].offsetLeft - cards[0].offsetLeft;      // ширина одного набора из четырёх работ
    scanX = stream.clientWidth / 2;
    sparks.width = stream.clientWidth; sparks.height = stream.clientHeight;
  };
  var wrap = function () { if (!setW) return; while (x <= -setW) x += setW; while (x > 0) x -= setW; };

  var setActive = function (i) {
    if (i === active) return;
    var prev = caps[active]; active = i;
    var next = caps[i];
    caps.forEach(function (c, k) { c.classList.toggle('is-on', k === i); c.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    if (!gsap || reduce) return;
    if (prev) gsap.to(prev.children, { y: -16, autoAlpha: 0, duration: 0.3, ease: 'power2.in', stagger: 0.03, overwrite: true });
    gsap.set(next.children, { y: 0, autoAlpha: 1 });
    gsap.fromTo(next.querySelectorAll('.show__name .story__reveal'), { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', delay: 0.15, overwrite: true });
    gsap.fromTo(next.querySelectorAll('.show__type, .show__list li'), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: 0.3, overwrite: true });
  };

  /* какая часть карточки уже прошла луч: справа от луча — работа, слева — её описание */
  var crossing = false;
  var layout = function () {
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    var best = -1, bestD = 1e9; crossing = false;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i], left = x + card.offsetLeft, w = card.offsetWidth;
      if (left > stream.clientWidth + 50 || left + w < -50) continue;
      var s = Math.max(0, Math.min(w, scanX - left));
      card._img.style.clipPath = 'inset(0 0 0 ' + s.toFixed(1) + 'px)';
      card._desc.style.clipPath = 'inset(0 ' + (w - s).toFixed(1) + 'px 0 0)';
      if (s > 0 && s < w) crossing = true;
      var d = Math.abs(left + w / 2 - scanX);
      if (d < bestD) { bestD = d; best = i % total; }
    }
    scan.classList.toggle('is-hot', crossing);
    if (best > -1) setActive(best);
  };

  /* ---------- искры у луча ---------- */
  var sctx = sparks.getContext('2d'), parts = [];
  var spawn = function (dt) {
    var rate = crossing ? 90 : 18, n = rate * dt + Math.random() * 0.5;   // на пересечении — гуще
    var h = sparks.height;
    for (var k = 0; k < n; k++) {
      parts.push({ x: scanX + (Math.random() - 0.5) * 4, y: h * 0.06 + Math.random() * h * 0.88,
        vx: -(30 + Math.random() * 140) * Math.max(u, 0.5) * (Math.random() < 0.8 ? 1 : -0.4), vy: (Math.random() - 0.5) * 40,
        life: 0, max: 0.6 + Math.random() * 1.2, r: 0.6 + Math.random() * 1.6, hot: Math.random() < 0.3 });
    }
  };
  var drawSparks = function (dt) {
    sctx.clearRect(0, 0, sparks.width, sparks.height);
    sctx.globalCompositeOperation = 'lighter';
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985;
      var a = 1 - p.life / p.max;
      sctx.fillStyle = p.hot ? 'rgba(232, 220, 200, ' + (a * 0.9).toFixed(3) + ')' : 'rgba(201, 162, 122, ' + (a * 0.8).toFixed(3) + ')';
      sctx.beginPath(); sctx.arc(p.x, p.y, p.r, 0, 6.2832); sctx.fill();
    }
    sctx.globalCompositeOperation = 'source-over';
  };

  /* ---------- кадр ---------- */
  var last = 0, raf = 0;
  var frame = function (t) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    if (!dragging) { vel += (base - vel) * Math.min(1, dt * 2.2); x += vel * dt; }   // после броска плавно возвращаемся к своей скорости
    wrap(); layout();
    if (!reduce) { spawn(dt); drawSparks(dt); }
  };
  var start = function () { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
  var stop = function () { running = false; cancelAnimationFrame(raf); };

  /* ---------- тянуть ленту ---------- */
  var px = 0, pt = 0;
  stream.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; px = e.clientX; pt = performance.now(); vel = 0;
    stream.classList.add('is-drag');
    stream.setPointerCapture(e.pointerId);
  });
  stream.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var now = performance.now(), dx = e.clientX - px;
    x += dx;
    vel = dx / Math.max(0.008, (now - pt) / 1000);
    px = e.clientX; pt = now;
    if (!running) { wrap(); layout(); }
  });
  var end = function () { if (!dragging) return; dragging = false; stream.classList.remove('is-drag'); vel = Math.max(-2600, Math.min(2600, vel)); };
  stream.addEventListener('pointerup', end);
  stream.addEventListener('pointercancel', end);
  stream.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* ---------- запуск ---------- */
  measure(); x = -setW + scanX - cards[0].offsetWidth * 0.5;   // первая работа — уже наполовину прошла луч
  wrap(); layout();
  window.addEventListener('resize', function () { measure(); wrap(); layout(); });
  window.addEventListener('load', function () { measure(); wrap(); layout(); });

  /* заголовок проявляется при заходе; лента крутится, только пока блок на экране */
  var introDone = false;
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) {
      start();
      if (!introDone && gsap && !reduce) {
        introDone = true;
        gsap.from(sec.querySelectorAll('.show__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, stagger: 0.12, ease: 'power3.out' });
        gsap.from(sec.querySelector('.show__kicker'), { autoAlpha: 0, y: 14, duration: 0.7, delay: 0.3, ease: 'power3.out' });
        gsap.from(stream, { autoAlpha: 0, duration: 1.2, delay: 0.2, ease: 'power2.out' });
      }
    } else stop();
  }, { threshold: 0.15 }).observe(sec);
})();
