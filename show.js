/* Блок 8 «Баннеры, наружка, соцсети» — точно по макету Figma «Slide 4:3 - 1» (узел 1029:275).
   Справа от тонкой линии — фото работы, слева от линии — её описание.
   Смена работы — по мотивам Amber (ismamz, Codrops): всё на одной шкале времени, параллельно — название в медной плашке
   уходит буквами вниз и приходит снизу, мелкие строки печатаются по буквам, фото открывается шторкой. Идёт само, пока блок на экране. */
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
  var total = photos.length, cur = 0, HOLD = 4.6;

  /* описание — по буквам (слова не рвутся): при смене буквы рассыпаются пылью */
  descs.forEach(function (d) {
    d.querySelectorAll('.show__t1, .show__t2, .show__name, .show__list li').forEach(function (el) {
      var tmp = document.createElement('span');
      el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(function (part) {   // перенос <br> сохраняем: нижние строки — в две строки
        tmp.innerHTML = part;
        return tmp.textContent.split(' ').map(function (w) {
          return '<span class="dw">' + Array.prototype.map.call(w, function (ch) { return '<span class="dc">' + ch + '</span>'; }).join('') + '</span>';
        }).join(' ');
      }).join('<br>');
    });
    d._chars = Array.prototype.slice.call(d.querySelectorAll('.dc'));
    d._rows = Array.prototype.slice.call(d.querySelectorAll('.show__type, .show__name, .show__list li'));
  });

  /* ---------- переход по мотивам Amber (ismamz, Codrops «Parallel page transitions»): всё на одной шкале времени,
     уходящее и приходящее идут параллельно.
     • название работы — в медной плашке: буквы уходят вниз, плашка схлопывается; новая плашка вытягивается, буквы выезжают снизу;
     • мелкие строки (вид работы, пункты) стираются и печатаются по буквам, как на машинке;
     • фото: прежнее мягко гаснет, новое открывается шторкой слева направо ---------- */
  var QUINT = 'im-quint-inout', QUART = 'im-quart-inout';
  if (window.CustomEase) { gsap.registerPlugin(window.CustomEase); CustomEase.create(QUINT, '.76, 0, .2, 1'); CustomEase.create(QUART, '0.65, 0.01, 0.05, 0.99'); }
  else { QUINT = 'power4.inOut'; QUART = 'power3.inOut'; }
  descs.forEach(function (d) {
    var name = d.querySelector('.show__name');
    var block = document.createElement('span'); block.className = 'show__name-block'; block.setAttribute('aria-hidden', 'true');
    name.insertBefore(block, name.firstChild);
    d._block = block;
    d._nameChars = Array.prototype.slice.call(name.querySelectorAll('.dc'));
    d._typeChars = Array.prototype.slice.call(d.querySelectorAll('.show__type .dc, .show__list .dc'));
    d._bullets = Array.prototype.slice.call(d.querySelectorAll('.show__list li'));
  });
  var timing = function (entering) {
    var pace = reduce ? 0 : entering ? 1 : 0.6;
    return { duration: 0.85 * pace, offset: 0.3 * pace, spread: 0.22 * pace, ease: entering ? QUART : QUINT };
  };
  /* название: плашка + буквы (как animateMask в Amber) */
  var mask = function (tl, d, entering, at) {
    var t = timing(entering);
    if (entering) {
      tl.fromTo(d._block, { scaleX: 0 }, { scaleX: 1, duration: t.duration, ease: t.ease }, at);
      tl.fromTo(d._nameChars, { yPercent: 105 }, { yPercent: 0, duration: t.duration, ease: t.ease, stagger: { amount: t.spread } }, at + t.offset);
      return at + t.offset + t.spread + t.duration;
    }
    tl.to(d._nameChars, { yPercent: 105, duration: t.duration, ease: t.ease, stagger: { amount: t.spread, from: 'end' } }, at);
    tl.to(d._block, { scaleX: 0, duration: t.duration, ease: t.ease }, at + t.offset + t.spread);
    return at + t.offset + t.spread + t.duration;
  };
  /* мелкие строки — печатная машинка (как useTypewriter в Amber) */
  var type = function (tl, d, entering, at) {
    if (entering) {
      tl.set(d._bullets, { '--dot': 1 }, at);
      tl.fromTo(d._typeChars, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0, stagger: { each: reduce ? 0 : 0.022 } }, at);
    } else {
      tl.to(d._typeChars, { autoAlpha: 0, duration: 0, stagger: { each: reduce ? 0 : 0.009, from: 'end' } }, at);
      tl.set(d._bullets, { '--dot': 0 }, at + (reduce ? 0 : d._typeChars.length * 0.009));
    }
  };
  var descIn = function (tl, d, at) {
    tl.set(d, { autoAlpha: 1 }, at);
    var nameEnd = mask(tl, d, true, at);
    type(tl, d, true, at + (reduce ? 0 : 0.45));
    return nameEnd;
  };
  var descOut = function (tl, d, at) {
    type(tl, d, false, at);
    var end = mask(tl, d, false, at);
    tl.set(d, { autoAlpha: 0 }, end);
    return end;
  };
  /* фото: новое — шторкой слева направо, прежнее гаснет под ним */
  var photoIn = function (tl, p, at) {
    tl.set(p, { zIndex: 2, autoAlpha: 1, x: 0 }, at);
    tl.fromTo(p, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduce ? 0 : 1.05, ease: QUART }, at);
    tl.fromTo(p.querySelector('img'), { scale: 1.12 }, { scale: 1, duration: reduce ? 0 : 1.4, ease: QUART }, at);
  };
  var photoOut = function (tl, p, at) {
    tl.set(p, { zIndex: 1 }, at);
    tl.to(p, { autoAlpha: 0, duration: reduce ? 0 : 0.6, ease: QUINT }, at + (reduce ? 0 : 0.35));
  };

  /* ---------- круг работ ---------- */
  gsap.set(photos.slice(1), { autoAlpha: 0 });
  gsap.set(descs, { autoAlpha: 0 });
  var timer = null, started = false, run = null;
  /* точки внизу: сколько работ и какая сейчас; по клику — к нужной */
  var dots = Array.prototype.slice.call(sec.querySelectorAll('.show__dot'));
  var mark = function () { dots.forEach(function (b, i) { b.classList.toggle('is-on', i === cur); b.setAttribute('aria-current', i === cur ? 'true' : 'false'); }); };
  var next = function (to) {
    var from = cur, target = typeof to === 'number' ? to : (cur + 1) % total;
    if (target === from) return;
    if (run && run.isActive()) run.progress(1);                       // прошлая смена доигрывается мгновенно — без наложений
    cur = target;
    if (timer) timer.kill();
    mark();
    run = gsap.timeline();
    var outEnd = descOut(run, descs[from], 0);
    photoOut(run, photos[from], 0);
    photoIn(run, photos[cur], reduce ? 0 : 0.25);
    /* новое название ждёт, пока прежнее освободит место, — как заголовки в Amber */
    descIn(run, descs[cur], reduce ? 0 : Math.max(0.45, outEnd - 0.2));
    timer = gsap.delayedCall(HOLD + (reduce ? 0 : 1.8), function () { next(); });
  };
  dots.forEach(function (b, i) { b.addEventListener('click', function () { if (started) next(i); }); });
  var begin = function () {
    started = true;
    run = gsap.timeline();
    photoIn(run, photos[0], 0.2);
    descIn(run, descs[0], reduce ? 0 : 0.9);
    timer = gsap.delayedCall(HOLD + 2, function () { next(); });
    mark();
  };


  /* заход в блок: заголовок выезжает из-под строки; работы крутятся, только пока блок на экране */
  gsap.set(photos[0], { autoAlpha: 0 });
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) {
      if (!started) {
        if (!reduce) {
          gsap.from(sec.querySelector('.show__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
          var hb = sec.querySelector('.show__title-block');
          if (hb) gsap.fromTo(hb, { scaleX: 0 }, { scaleX: 1, duration: 0.85, ease: QUART, delay: 0.05 });
          gsap.from(sec.querySelectorAll('.show__head .story__reveal'), { yPercent: 110, duration: 0.85, delay: 0.35, ease: QUART });
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
    var SPEED = 0.9, SIZE = 1.2, OPACITY = 0.13, TWINKLE = 0.2, SPOKES = 80, PER = 10;   // штрихов меньше — легче для браузера, на вид то же
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
    /* лучи — не чаще 40 кадров в секунду: глазом не отличить, а работы вдвое-втрое меньше на быстрых экранах */
    var loop = function (t) { raf = requestAnimationFrame(loop); if (last && t - last < 24) return; var dt = Math.min(0.05, Math.max(0.001, (t - (last || t)) / 1000)); last = t; draw(dt); };
    size(); for (var k = 0; k < 60; k++) draw(1 / 60);                         // сразу «в полёте», а не из центра
    window.addEventListener('resize', function () { size(); if (!on) draw(0); });
    if (reduce) return;
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !on) { on = true; last = 0; raf = requestAnimationFrame(loop); }
      else if (!en[0].isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
    }, { threshold: 0, rootMargin: '-8% 0px' }).observe(sec);   // рисуем, только пока блок действительно на экране
  })();
})();
