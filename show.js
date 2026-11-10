/* Блок 8 «Баннеры, наружка, соцсети» (Figma «п-р10(5)», «п-р10(6)»).
   По мотивам «сканера карточек» (codepen blacklead-studio/xbwaqxE, по мотивам evervault.com):
   работы плывут справа налево к медной полосе — фото видно целиком (вдали в полутонах, у полосы в полную силу).
   Фото уходит под полосу, а по другую сторону полосы из неё проявляется описание именно этой работы.
   Пока фото не ушло целиком — описание читается; затем оно растворяется плавной пылью,
   и к подходу следующей работы слева от полосы уже пусто. Ленту можно тянуть мышью или пальцем. */
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
  var caps = Array.prototype.slice.call(sec.querySelectorAll('.show__cap'));
  var tpl = Array.prototype.slice.call(track.children);   // четыре работы из разметки
  var total = tpl.length;

  /* описания — по буквам: буквы проявляются из полосы и потом рассыпаются пылью */
  caps.forEach(function (cp) {
    cp.querySelectorAll('.show__c-type, .show__c-name, .show__c-list li').forEach(function (el) {
      el.innerHTML = el.textContent.split(' ').map(function (w) {   // слова не рвутся при переносе
        return '<span class="dw">' + Array.prototype.map.call(w, function (ch) { return '<span class="dc">' + ch + '</span>'; }).join('') + '</span>';
      }).join(' ');
    });
    cp._chars = Array.prototype.slice.call(cp.querySelectorAll('.dc'));
    cp._chars.forEach(function (ch) { ch._dx = -(14 + Math.random() * 70); ch._dy = -(8 + Math.random() * 46); ch._r = Math.random(); ch._puff = false; ch._k = ''; });
  });

  /* лента повторяется, чтобы шла без конца */
  for (var c = 1; c < 3; c++) tpl.forEach(function (n) {
    var k = n.cloneNode(true); k.setAttribute('aria-hidden', 'true');
    k.querySelectorAll('img').forEach(function (im) { im.alt = ''; });
    track.appendChild(k);
  });
  var cards = Array.prototype.slice.call(track.querySelectorAll('.show__card'));
  cards.forEach(function (cd) { cd._photo = cd.querySelector('.show__photo'); cd._veil = cd.querySelector('.show__veil'); });

  /* ---------- размеры ---------- */
  var u = 1, setW = 0, scanX = 0, x = 0, vel = 0, base = 0, dragging = false, running = false, W = 0, gap = 0, capTop = 0;
  var measure = function () {
    u = narrow ? 0.62 : Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    base = reduce ? 0 : (narrow ? -42 : -95 * Math.max(u, 0.5));   // px в секунду, справа налево
    setW = cards[total].offsetLeft - cards[0].offsetLeft;            // ширина одного набора из четырёх работ
    gap = cards[1].offsetLeft - cards[0].offsetLeft - cards[0].offsetWidth;
    W = stream.clientWidth; scanX = scan.offsetLeft + scan.offsetWidth / 2;
    sparks.width = W; sparks.height = stream.clientHeight;
    caps.forEach(function (cp) {                     // где каждая буква стоит в своём описании
      cp._right = cp.offsetLeft + cp.offsetWidth;
      cp._chars.forEach(function (ch) {
        var ox = 0, oy = 0, el = ch;
        while (el && el !== cp) { ox += el.offsetLeft; oy += el.offsetTop; el = el.offsetParent; }
        ch._x = cp.offsetLeft + ox + ch.offsetWidth / 2;            // в координатах ленты-окна
        ch._y = cp.offsetTop + oy + ch.offsetHeight / 2;
        ch._d = scanX - ch._x;                                       // расстояние от полосы
      });
      cp._span = Math.max.apply(null, cp._chars.map(function (ch) { return ch._d; })) || 1;
    });
  };
  var wrap = function () { if (!setW) return; while (x <= -setW) x += setW; while (x > 0) x -= setW; };

  /* ---------- пылинки ---------- */
  var sctx = sparks.getContext('2d'), parts = [];
  var puff = function (px, py) {
    for (var k = 0; k < 4; k++) parts.push({ x: px + (Math.random() - 0.5) * 8, y: py + (Math.random() - 0.5) * 8,
      vx: -(10 + Math.random() * 40), vy: -(4 + Math.random() * 22), life: 0, max: 1.4 + Math.random() * 1.6, r: 0.4 + Math.random() * 0.9, dust: true });
  };

  /* описание работы, которая сейчас уходит под полосу: q — от 0 (фото коснулось полосы) до 1 (подходит следующее) */
  var setChar = function (ch, o, tx, ty, bl) {
    var key = o.toFixed(2) + tx.toFixed(0) + ty.toFixed(0) + bl.toFixed(1);
    if (key === ch._k) return; ch._k = key;
    ch.style.opacity = o.toFixed(3);
    ch.style.transform = (tx || ty) ? 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)' : '';
    ch.style.filter = bl > 0.05 ? 'blur(' + bl.toFixed(2) + 'px)' : '';
  };
  var drawCap = function (cp, q) {
    var k = narrow ? 0.6 : Math.max(0.5, u), band = 70 * k;
    var rev = Math.min(1, q / 0.2) * (cp._span + band);             // докуда описание уже вышло из полосы
    for (var n = 0; n < cp._chars.length; n++) {
      var ch = cp._chars[n];
      var a = Math.max(0, Math.min(1, (rev - ch._d) / band));       // проявление — от полосы влево
      var p = (q - 0.7) / 0.26;                                       // растворение: последняя четверть пути
      p = p * 1.5 - (ch._r * 0.6 + (ch._d / cp._span) * 0.4) * 0.5;  // дальние от полосы и случайные — раньше
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      if (reduce) { setChar(ch, q < 0.85 ? 1 : 0, 0, 0, 0); continue; }
      var e = p * p, o = a * (1 - p);
      setChar(ch, o, (1 - a) * 18 * k + ch._dx * k * e, ch._dy * k * e, (1 - a) * 3 + p * 2.6 * k);
      if (p > 0.35 && !ch._puff) { ch._puff = true; puff(ch._x, ch._y); }
      if (p === 0) ch._puff = false;
    }
  };
  var active = -1;
  var showCap = function (i, q) {
    if (i !== active) {
      caps.forEach(function (cp, k) { cp.classList.toggle('is-on', k === i); });
      active = i;
    }
    if (i > -1) drawCap(caps[i], q);
  };

  /* ---------- раскладка кадра ---------- */
  var crossing = false;
  var layout = function () {
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    crossing = false;
    var capI = -1, capQ = 0;
    for (var i = 0; i < cards.length; i++) {
      var cd = cards[i], left = x + cd.offsetLeft, w = cd.offsetWidth;
      if (left > W + 50 || left + w + gap < 0) continue;
      var s = Math.max(0, Math.min(w, scanX - left));               // сколько фото уже ушло под полосу
      cd._photo.style.clipPath = 'inset(0 0 0 ' + s.toFixed(1) + 'px)';
      var d = (left - scanX) / Math.max(1, w);                       // вдали — полутона, у полосы — в полную силу
      cd._veil.style.opacity = (0.6 * Math.max(0, Math.min(1, (d - 0.15) / 0.9))).toFixed(3);
      if (s > 0 && s < w) crossing = true;
      var q = (scanX - left) / (w + gap);
      if (q > 0 && q < 1) { capI = i % total; capQ = q; }
    }
    showCap(capI, capQ);
    scan.classList.toggle('is-hot', crossing);
  };

  /* ---------- искры у полосы ---------- */
  var spawn = function (dt) {
    var rate = crossing ? 80 : 16, n = rate * dt + Math.random() * 0.5;   // когда фото уходит под полосу — гуще
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
      sctx.fillStyle = p.dust ? 'rgba(232, 220, 200, ' + (a * 0.55).toFixed(3) + ')'
        : p.hot ? 'rgba(232, 220, 200, ' + (a * 0.9).toFixed(3) + ')' : 'rgba(201, 162, 122, ' + (a * 0.8).toFixed(3) + ')';
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
  measure(); x = -setW + scanX - cards[0].offsetWidth * 0.15;
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
