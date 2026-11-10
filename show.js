/* Блок 8 «Баннеры, наружка, соцсети» (Figma «п-р10(5)», «п-р10(6)»).
   Оформление — по мотивам «сканера карточек» (codepen blacklead-studio/xbwaqxE, по мотивам evervault.com):
   работы плывут лентой справа налево. Пока работа не дошла до медного луча — она в полутонах (приглушена);
   луч проявляет её в полную силу, а дальше, левее луча, фото тает. Когда афиша входит в луч, слева от неё
   выплывает описание этой работы; уходя влево, оно постепенно, буква за буквой, рассыпается пылью — до края экрана.
   От луча летят искры. Ленту можно тянуть мышью или пальцем. */
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
  var tpl = Array.prototype.slice.call(track.children);   // четыре работы из разметки
  var total = tpl.length;

  /* описание — по буквам: каждая буква потом сама превращается в пылинку */
  var splitText = function (root) {
    root.querySelectorAll('.show__d-type, .show__d-name, .show__d-list li').forEach(function (el) {
      el.innerHTML = Array.prototype.map.call(el.textContent, function (ch) { return '<span class="dc">' + ch + '</span>'; }).join('');
    });
  };
  tpl.forEach(function (n) {
    var d = n.querySelector('.show__desc');
    d.setAttribute('aria-label', d.textContent.replace(/\s+/g, ' ').trim());   // для экранного диктора — целым текстом
    d.querySelector('.show__dwrap').setAttribute('aria-hidden', 'true');
    splitText(d);
  });

  /* лента повторяется, чтобы шла без конца */
  var copies = 3;
  for (var c = 1; c < copies; c++) tpl.forEach(function (n) {
    var k = n.cloneNode(true); k.setAttribute('aria-hidden', 'true');
    k.querySelectorAll('img').forEach(function (im) { im.alt = ''; });
    k.querySelector('.show__desc').removeAttribute('aria-label');
    track.appendChild(k);
  });
  var items = Array.prototype.slice.call(track.querySelectorAll('.show__item'));
  items.forEach(function (it) {
    it._poster = it.querySelector('.show__card');
    it._ht = it.querySelector('.show__veil');
    it._desc = it.querySelector('.show__desc');
    it._wrap = it.querySelector('.show__dwrap');
    it._chars = Array.prototype.slice.call(it.querySelectorAll('.dc'));
    /* у каждой буквы — своя траектория пылинки и своя очередь */
    it._chars.forEach(function (ch) {
      ch._dx = -(30 + Math.random() * 150); ch._dy = (Math.random() - 0.5) * 130; ch._r = (Math.random() - 0.5) * 120;
      ch._j = Math.random(); ch._p = -1;
    });
    it._st = 0;   // 0 — описание спрятано за афишей, 1 — выплыло
  });

  /* описание: спрятано / выплыло */
  var kill = function (it) { if (gsap) gsap.killTweensOf([it._desc, it._wrap]); };
  var put = function (it, st) {          // мгновенно (при перескоке ленты и при возврате назад)
    kill(it); it._st = st;
    it._desc.style.clipPath = st ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)';
    it._wrap.style.transform = '';
  };
  var reveal = function (it) {           // выплывает из-за афиши влево
    kill(it); it._st = 1;
    if (!gsap || reduce) { put(it, 1); return; }
    gsap.fromTo(it._desc, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.out' });
    gsap.fromTo(it._wrap, { x: '30%' }, { x: '0%', duration: 1.2, ease: 'power3.out' });
  };
  items.forEach(function (it) { put(it, 0); });

  /* ---------- движение ленты ---------- */
  var narrow = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  var REVEAL = 0.08;   // афиша входит в луч — выплывает описание
  var u = 1, setW = 0, scanX = 0, x = 0, vel = 0, base = 0, dragging = false, running = false, W = 0, FADE = 260;
  var DS = 0, DE = 0;                   // пыль: начинается у DS и заканчивается у края экрана DE
  var measure = function () {
    u = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (narrow) u = 0.62;
    base = reduce ? 0 : (narrow ? -40 : -110 * Math.max(u, 0.5));   // px в секунду, справа налево; на телефоне медленнее
    setW = items[total].offsetLeft - items[0].offsetLeft;      // ширина одного набора из четырёх работ
    W = stream.clientWidth; scanX = W / 2;
    FADE = narrow ? 90 : 170 * u;                              // на сколько левее луча фото тает целиком
    DS = W * (narrow ? 0.3 : 0.15); DE = W * 0.03;
    sparks.width = W; sparks.height = stream.clientHeight;
    /* где каждая буква стоит в ленте (без сдвигов анимации) */
    items.forEach(function (it) {
      var base0 = it.offsetLeft + it._desc.offsetLeft;   // буквы отсчитываются от описания, описание — от своей пары
      it._chars.forEach(function (ch) { ch._x = base0 + ch.offsetLeft + ch.offsetWidth / 2; });
    });
  };
  /* лента перескочила на набор: копии стоят на тех же местах — переносим им состояния */
  var shift = function (dir) {
    var st = items.map(function (it) { return it._st; });
    items.forEach(function (it, i) { var j = i + dir * total; put(it, j >= 0 && j < items.length ? st[j] : 0); });
  };
  var wrap = function () {
    if (!setW) return;
    while (x <= -setW) { x += setW; shift(1); }
    while (x > 0) { x -= setW; shift(-1); }
  };

  /* буквы описания: чем левее, тем больше рассыпаны — до края экрана */
  var dustChars = function (it) {
    var k = narrow ? 0.6 : Math.max(0.5, u), span = DS - DE;
    for (var n = 0; n < it._chars.length; n++) {
      var ch = it._chars[n], sx = x + ch._x;
      var p = (DS - sx) / span;                          // 0 — целая буква, 1 — пыль у края
      p = p * 1.35 - ch._j * 0.35;                        // буквы рассыпаются вразнобой
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      if (Math.abs(p - ch._p) < 0.004) continue;
      ch._p = p;
      if (p === 0) { ch.style.transform = ''; ch.style.opacity = ''; continue; }
      var e = p * p;
      ch.style.transform = 'translate(' + (ch._dx * k * e).toFixed(1) + 'px,' + (ch._dy * k * e).toFixed(1) + 'px) rotate(' + (ch._r * e).toFixed(0) + 'deg) scale(' + (1 - 0.75 * p).toFixed(3) + ')';
      ch.style.opacity = (1 - p).toFixed(3);
    }
  };

  var crossing = false;
  var layout = function () {
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    crossing = false;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], left = x + it.offsetLeft, pw = it._poster.offsetWidth, dl = left + it._desc.offsetLeft;
      if (dl > W + 50 || left + pw < -50) continue;
      /* полутона (вуаль) справа от луча; левее луча фото тает */
      var b = scanX - left, s = Math.max(0, Math.min(pw, b));
      it._ht.style.clipPath = 'inset(0 0 0 ' + s.toFixed(1) + 'px)';
      var m = 'linear-gradient(90deg, transparent ' + (b - FADE).toFixed(1) + 'px, #000 ' + b.toFixed(1) + 'px)';
      it._poster.style.webkitMaskImage = m; it._poster.style.maskImage = m;
      if (s > 0 && s < pw) crossing = true;
      if (left > scanX + 2) { if (it._st !== 0) put(it, 0); continue; }            // вернули назад — снова ждёт
      if (it._st === 0 && left + pw * REVEAL < scanX) reveal(it);                     // афиша входит в луч — слева от неё выплывает описание
      if (it._st === 1) dustChars(it);
    }
    scan.classList.toggle('is-hot', crossing);
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

  /* ---------- запуск: первая работа подходит к лучу ---------- */
  measure(); x = -setW + scanX - items[0]._poster.offsetWidth * 0.3;
  wrap(); layout();
  window.addEventListener('resize', function () { measure(); wrap(); layout(); });
  window.addEventListener('load', function () { measure(); wrap(); layout(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); wrap(); layout(); });   // буквы встают на места после загрузки шрифта

  /* заголовок проявляется при заходе; лента крутится, только пока блок на экране */
  var introDone = false;
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) {
      start();
      if (!introDone && gsap && !reduce) {
        introDone = true;
        gsap.from(sec.querySelector('.show__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
        gsap.from(sec.querySelectorAll('.show__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, stagger: 0.12, delay: 0.1, ease: 'power3.out' });
        gsap.from(sec.querySelector('.show__kicker'), { autoAlpha: 0, y: 14, duration: 0.7, delay: 0.4, ease: 'power3.out' });
        gsap.from(stream, { autoAlpha: 0, duration: 1.2, delay: 0.2, ease: 'power2.out' });
      }
    } else stop();
  }, { threshold: 0.15 }).observe(sec);
})();
