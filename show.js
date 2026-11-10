/* Блок 8 «Баннеры, наружка, соцсети» (Figma «п-р10(5)», «п-р10(6)»).
   По мотивам «сканера карточек» (codepen blacklead-studio/xbwaqxE, по мотивам evervault.com):
   работы плывут лентой справа налево. Подходя к медной полосе, фото становится ярким; полоса «сканирует» его —
   справа от полосы видна сама работа, слева та же карточка уже показывает её описание тонким текстом.
   Уходя влево, описание постепенно сходит на нет и растворяется плавной пылью. От полосы летят искры.
   Ленту можно тянуть мышью или пальцем. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-show]');
  if (!sec) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  var stream = sec.querySelector('.show__stream');
  var track = sec.querySelector('.show__track');
  var sparks = sec.querySelector('.show__sparks');
  var scan = sec.querySelector('.show__scan');
  var tpl = Array.prototype.slice.call(track.children);   // четыре работы из разметки
  var total = tpl.length;

  /* описание — по буквам: каждая буква сама превращается в пылинку */
  tpl.forEach(function (n) {
    var d = n.querySelector('.show__desc');
    d.setAttribute('aria-label', d.textContent.replace(/\s+/g, ' ').trim());   // для экранного диктора — целым текстом
    d.querySelector('.show__dwrap').setAttribute('aria-hidden', 'true');
    d.querySelectorAll('.show__d-type, .show__d-name, .show__d-list li').forEach(function (el) {
      el.innerHTML = Array.prototype.map.call(el.textContent, function (ch) { return '<span class="dc">' + ch + '</span>'; }).join('');
    });
  });

  /* лента повторяется, чтобы шла без конца */
  for (var c = 1; c < 3; c++) tpl.forEach(function (n) {
    var k = n.cloneNode(true); k.setAttribute('aria-hidden', 'true');
    k.querySelectorAll('img').forEach(function (im) { im.alt = ''; });
    k.querySelector('.show__desc').removeAttribute('aria-label');
    track.appendChild(k);
  });
  var cards = Array.prototype.slice.call(track.querySelectorAll('.show__card'));
  cards.forEach(function (cd) {
    cd._photo = cd.querySelector('.show__photo');
    cd._veil = cd.querySelector('.show__veil');
    cd._desc = cd.querySelector('.show__desc');
    cd._chars = Array.prototype.slice.call(cd.querySelectorAll('.dc'));
    cd._chars.forEach(function (ch) {                 // у каждой буквы — своя пылинка и своя очередь
      ch._dx = -(10 + Math.random() * 60); ch._dy = -(6 + Math.random() * 40); ch._j = Math.random(); ch._p = -1; ch._puff = false;
    });
  });

  /* ---------- размеры ---------- */
  var u = 1, setW = 0, scanX = 0, x = 0, vel = 0, base = 0, dragging = false, running = false, W = 0, DS = 0, DE = 0, trackTop = 0;
  var measure = function () {
    u = narrow ? 0.62 : Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    base = reduce ? 0 : (narrow ? -45 : -100 * Math.max(u, 0.5));   // px в секунду, справа налево
    setW = cards[total].offsetLeft - cards[0].offsetLeft;            // ширина одного набора из четырёх работ
    W = stream.clientWidth; scanX = W / 2;
    var cw = cards[0].offsetWidth;
    DS = narrow ? W * 0.32 : Math.max(W * 0.18, scanX - cw * 1.15);   // отсюда описание начинает таять…
    DE = W * 0.03;                                                     // …и к краю экрана растворяется совсем
    trackTop = track.offsetTop;
    sparks.width = W; sparks.height = stream.clientHeight;
    cards.forEach(function (cd) {                    // где каждая буква стоит в ленте (без сдвигов анимации)
      cd._chars.forEach(function (ch) {
        var ox = 0, oy = 0, el = ch;
        while (el && el !== track) { ox += el.offsetLeft; oy += el.offsetTop; el = el.offsetParent; }
        ch._x = ox + ch.offsetWidth / 2; ch._y = oy + ch.offsetHeight / 2;
      });
    });
  };
  var wrap = function () { if (!setW) return; while (x <= -setW) x += setW; while (x > 0) x -= setW; };

  /* ---------- пыль ---------- */
  var sctx = sparks.getContext('2d'), parts = [];
  var puff = function (px, py) {                     // буква рассыпалась — от неё несколько тонких пылинок
    for (var k = 0; k < 3; k++) parts.push({ x: px + (Math.random() - 0.5) * 6, y: py + (Math.random() - 0.5) * 6,
      vx: -(8 + Math.random() * 30), vy: -(4 + Math.random() * 18), life: 0, max: 1.2 + Math.random() * 1.4, r: 0.4 + Math.random() * 0.9, hot: true, dust: true });
  };
  var dustChars = function (cd, cardLeft) {
    var span = DS - DE, k = narrow ? 0.6 : Math.max(0.5, u);
    for (var n = 0; n < cd._chars.length; n++) {
      var ch = cd._chars[n], sx = x + ch._x;
      if (sx > scanX) { if (ch._p !== 0) { ch._p = 0; ch.style.opacity = ''; ch.style.transform = ''; ch.style.filter = ''; ch._puff = false; } continue; }
      var p = (DS - sx) / span;                       // 0 — буква целая, 1 — растворилась у края
      p = p * 1.3 - ch._j * 0.3;                      // буквы тают вразнобой
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      if (Math.abs(p - ch._p) < 0.006) continue;
      ch._p = p;
      if (p === 0) { ch.style.opacity = ''; ch.style.transform = ''; ch.style.filter = ''; ch._puff = false; continue; }
      var e = p * p;
      ch.style.opacity = Math.max(0, 1 - p * 1.15).toFixed(3);
      ch.style.transform = 'translate(' + (ch._dx * k * e).toFixed(1) + 'px,' + (ch._dy * k * e).toFixed(1) + 'px)';
      ch.style.filter = 'blur(' + (p * 2.2 * k).toFixed(2) + 'px)';
      if (!ch._puff && p > 0.45 && !reduce) { ch._puff = true; puff(sx - cardLeft + cardLeft, trackTop + ch._y); }
    }
  };

  /* ---------- раскладка кадра ---------- */
  var crossing = false;
  var layout = function () {
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    crossing = false;
    for (var i = 0; i < cards.length; i++) {
      var cd = cards[i], left = x + cd.offsetLeft, w = cd.offsetWidth;
      if (left > W + 50 || left + w < -50) continue;
      var s = Math.max(0, Math.min(w, scanX - left));          // сколько карточки уже прошло полосу
      cd._photo.style.clipPath = 'inset(0 0 0 ' + s.toFixed(1) + 'px)';    // справа от полосы — фото
      cd._desc.style.clipPath = 'inset(0 ' + (w - s).toFixed(1) + 'px 0 0)'; // слева — описание
      /* фото в полутонах вдали и ярче по мере приближения к полосе */
      var d = (left - scanX) / Math.max(1, w);                   // 0 — карточка у полосы
      cd._veil.style.opacity = (0.6 * Math.max(0, Math.min(1, (d - 0.15) / 0.9))).toFixed(3);   // вуаль не плотнее 60 %
      /* подложка описания тоже сходит на нет к краю экрана */
      var m = 'linear-gradient(90deg, transparent ' + (DE - left).toFixed(1) + 'px, #000 ' + (DS - left).toFixed(1) + 'px)';
      cd._desc.style.webkitMaskImage = m; cd._desc.style.maskImage = m;
      if (s > 0 && s < w) crossing = true;
      if (s > 0) dustChars(cd, left);
    }
    scan.classList.toggle('is-hot', crossing);
  };

  /* ---------- искры у полосы ---------- */
  var spawn = function (dt) {
    var rate = crossing ? 80 : 16, n = rate * dt + Math.random() * 0.5;   // на пересечении — гуще
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
      p.x += (p.vx + (p.dust ? vel * 0.2 : 0)) * dt; p.y += p.vy * dt; p.vx *= 0.985;
      var a = 1 - p.life / p.max;
      sctx.fillStyle = p.hot ? 'rgba(232, 220, 200, ' + (a * (p.dust ? 0.6 : 0.9)).toFixed(3) + ')' : 'rgba(201, 162, 122, ' + (a * 0.8).toFixed(3) + ')';
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

  /* ---------- запуск: первая работа подходит к полосе ---------- */
  var place = function () { measure(); wrap(); layout(); };
  measure(); x = -setW + scanX - cards[0].offsetWidth * 0.3;
  wrap(); layout();
  window.addEventListener('resize', place);
  window.addEventListener('load', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);   // буквы встают на места после загрузки шрифта

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
