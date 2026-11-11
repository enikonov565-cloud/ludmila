/* Блок 10 «Делаю сайты: погружающие с первого экрана».
   Три кольца по 4 экрана — по одному сайту на кольцо (Флорис → Nikonovphoto → Театр кукол), в стиле кольца работ
   из блока «Дизайн, который продаёт»: настоящее 3D-кольцо, взгляд чуть сверху, плашки со скруглением,
   изнанка приглушённая. Кольцо поднимается из-под отзыва главным экраном вперёд, плавно делает полный оборот,
   опускается под отзыв — и на его месте так же поднимается кольцо следующего сайта.
   Прозрачность меняется у самих плашек, а не у колец: иначе браузер «сплющивает» 3D. Идёт, только пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-sites]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = sec.querySelector('.sites__stage'), review = sec.querySelector('.sites__review');
  var wheels = Array.prototype.slice.call(sec.querySelectorAll('.sites__wheel'));
  var GAP = 0.34;                              // зазор между плашками — доля высоты, как в кольце работ
  var TURN = 24, RISE = 1.8, SINK = 1.4;       // полный оборот, подъём, спуск (секунды)
  var cur = 0, run = null, started = false;

  var apply = function (wh) {
    wh.querySelector('.sites__ring').style.transform = 'translateZ(' + (-wh._R) + 'px) rotateY(' + (-(wh._a || 0)) + 'deg)';
  };
  /* плашки по кольцу: ширина — по пропорциям экрана, радиус — из общей длины плашек с зазорами */
  var layout = function () {
    wheels.forEach(function (wh) {
      var ring = wh.querySelector('.sites__ring'), items = ring.querySelectorAll('.sites__item');
      var h = ring.clientHeight, n = items.length;
      var widths = Array.prototype.map.call(items, function (el) { return h * (parseFloat(el.getAttribute('data-ratio')) || 1.95); });
      var R = widths.reduce(function (s, w) { return s + w + h * GAP; }, 0) / (2 * Math.PI);
      Array.prototype.forEach.call(items, function (el, i) {
        el.style.width = widths[i] + 'px';
        el.style.marginLeft = (-widths[i] / 2) + 'px';
        el.style.transform = 'rotateY(' + (360 / n) * i + 'deg) translateZ(' + R + 'px)';
      });
      wh._R = R; wh._h = h;
      apply(wh);
    });
    /* на телефоне точки — слева, на высоте центра кольца */
    dotsBox.style.top = getComputedStyle(stage).position === 'absolute' ? '' : (stage.offsetTop + stage.offsetHeight * 0.55) + 'px';
  };

  /* точки: какой сайт сейчас показан; по нажатию — переход к нему */
  var dotsBox = sec.querySelector('.sites__dots');
  var dots = Array.prototype.slice.call(sec.querySelectorAll('.sites__dot'));
  var setDot = function (i) {
    dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  };
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () {
      if (!started || i === cur) return;
      if (run) run.kill();
      var old = wheels[cur], oldSkin = old.querySelectorAll('.sites__face, .sites__back');
      gsap.killTweensOf(old); gsap.killTweensOf(oldSkin);
      gsap.to(oldSkin, { opacity: 0, duration: 0.4, ease: 'power1.in', onComplete: function () { gsap.set(old, { visibility: 'hidden' }); } });
      cur = i; run = showSite(i);
    });
  });
  /* на сколько опустить кольцо, чтобы оно целиком ушло под отзыв (на телефоне — под нижний край сцены) */
  var drop = function (wh) {
    var line = getComputedStyle(stage).position === 'absolute' ? review.offsetTop : stage.offsetHeight;
    return line - wh.offsetTop + wh._h * 0.9;
  };

  layout();
  window.addEventListener('resize', layout);

  var showSite = function (i) {
    var wh = wheels[i], skin = wh.querySelectorAll('.sites__face, .sites__back');
    var d = function (s) { return reduce ? 0.01 : s; };
    gsap.killTweensOf(wh); gsap.killTweensOf(skin);
    setDot(i);
    wh._a = 0; apply(wh);
    gsap.set(wh, { visibility: 'visible', y: reduce ? 0 : drop(wh) });
    gsap.set(skin, { opacity: 0 });
    var tl = gsap.timeline();
    tl.to(wh, { y: 0, duration: d(RISE), ease: 'power3.out' }, 0)
      .to(skin, { opacity: 1, duration: d(1.2), ease: 'power1.out' }, 0)
      /* полный оборот: начинает и заканчивает главным экраном к зрителю */
      .to(wh, { _a: 360, duration: d(TURN), ease: 'sine.inOut', onUpdate: function () { apply(wh); } }, '+=1.2')
      .to(wh, { y: function () { return reduce ? 0 : drop(wh); }, duration: d(SINK), ease: 'power2.in' }, '+=1')
      .to(skin, { opacity: 0, duration: d(1), ease: 'power1.in' }, '<0.3')
      .set(wh, { visibility: 'hidden' })
      .call(function () { cur = (cur + 1) % wheels.length; run = showSite(cur); });
    return tl;
  };

  var intro = function () {
    if (reduce) return;
    gsap.from(sec.querySelector('.sites__bg'), { autoAlpha: 0, duration: 1.6, ease: 'power2.out' });
    gsap.from(sec.querySelector('.sites__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__title .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, delay: 0.1, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__tags .show__tag'), { autoAlpha: 0, y: 12, duration: 0.7, delay: 0.3, stagger: 0.08, ease: 'power3.out' });
    gsap.from(review, { autoAlpha: 0, y: 14, duration: 0.8, delay: 0.6, ease: 'power3.out' });
  };

  /* идёт, только пока блок на экране */
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !started) { started = true; layout(); intro(); run = showSite(0); return; }
    if (!started || !run) return;
    if (vis) run.resume(); else run.pause();
  }, { threshold: 0.2 }).observe(sec);
})();
