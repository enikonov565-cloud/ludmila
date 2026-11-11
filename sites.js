/* Блок 10 «Делаю сайты: погружающие с первого экрана».
   Кольцо из 12 экранов трёх сайтов (Флорис → Nikonovphoto → Театр кукол) — в стиле присланного примера:
   ближние экраны крупно и ниже, дальние мельче, выше и темнее; каждый экран в своих пропорциях, скруглённый,
   стоит лицом к зрителю, без кувырков и наклонов кольца. Кольцо поворачивается целиком: экран спереди стоит,
   чтобы его рассмотреть, затем кольцо плавно подводит следующий. При первом показе кольцо поднимается из-под отзыва.
   Идёт, только пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-sites]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = sec.querySelector('.sites__stage'), ring = sec.querySelector('.sites__ring');
  var cards = Array.prototype.slice.call(ring.querySelectorAll('.sites__card'));
  var N = cards.length, STEP = 360 / N;
  var HOLD = 2.6, TURN = 1.3;                  // сколько экран стоит впереди и сколько длится поворот к следующему
  var st = { a: 0 };                           // угол поворота кольца
  var geo = {}, run = null, started = false;

  /* размеры кольца — от размеров сцены */
  var measure = function () {
    var w = stage.clientWidth, h = stage.clientHeight;
    geo = { cx: w * 0.5, cy: h * 0.47, rx: w * 0.44, ry: h * 0.3, H: h * 0.42, P: h * 2.4 };
    cards.forEach(function (c) {
      var ar = (c.naturalWidth || +c.getAttribute('width')) / (c.naturalHeight || +c.getAttribute('height'));
      c.style.height = geo.H + 'px'; c.style.width = geo.H * ar + 'px';
      c._w = geo.H * ar;
    });
  };

  var render = function () {
    cards.forEach(function (c, i) {
      var t = (i * STEP - st.a) * Math.PI / 180;
      var sn = Math.sin(t), d = Math.cos(t), k = (d + 1) / 2;   // d = 1 — впереди, −1 — сзади
      var s = 0.5 + 0.5 * Math.pow(k, 1.3);
      var x = geo.cx + geo.rx * sn - c._w / 2, y = geo.cy + geo.ry * d - geo.H / 2;
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ') perspective(' + geo.P.toFixed(0) + 'px) rotateY(' + (-sn * 38).toFixed(2) + 'deg)';
      c.style.zIndex = Math.round(k * 100);
      c.style.filter = 'brightness(' + (0.45 + 0.55 * k).toFixed(3) + ')';
    });
  };

  var refit = function () { measure(); render(); };
  refit();
  window.addEventListener('resize', refit);
  cards.forEach(function (c) { if (!c.complete) c.addEventListener('load', refit, { once: true }); });

  /* кольцо идёт по кругу: экран стоит впереди → плавный поворот к следующему */
  var spin = function () {
    var tl = gsap.timeline({ repeat: -1 });
    for (var k = 1; k <= N; k++) tl.to(st, { a: STEP * k, duration: reduce ? 0.01 : TURN, ease: 'power2.inOut', onUpdate: render }, '+=' + HOLD);
    tl.eventCallback('onRepeat', function () { st.a = 0; render(); });
    return tl;
  };

  var intro = function () {
    if (reduce) { gsap.set(ring, { opacity: 1 }); return; }
    gsap.from(sec.querySelector('.sites__bg'), { autoAlpha: 0, duration: 1.6, ease: 'power2.out' });
    gsap.from(sec.querySelector('.sites__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__title .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, delay: 0.1, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__tags .show__tag'), { autoAlpha: 0, y: 12, duration: 0.7, delay: 0.3, stagger: 0.08, ease: 'power3.out' });
    gsap.from(sec.querySelector('.sites__review'), { autoAlpha: 0, y: 14, duration: 0.8, delay: 0.6, ease: 'power3.out' });
    /* кольцо целиком поднимается из-под отзыва */
    gsap.fromTo(ring, { y: stage.clientHeight * 0.8, opacity: 0 }, { y: 0, opacity: 1, duration: 2, ease: 'power3.out' });
  };

  /* идёт, только пока блок на экране */
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !started) { started = true; refit(); intro(); run = spin(); return; }
    if (!started || !run) return;
    if (vis) run.resume(); else run.pause();
  }, { threshold: 0.2 }).observe(sec);
})();
