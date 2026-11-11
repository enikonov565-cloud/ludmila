/* Блок 10 «Делаю сайты: погружающие с первого экрана».
   3D-карусели экранов сайтов (по мотивам codrops «On-Scroll 3D Carousel»). Каждая карусель проявляется целиком
   и сразу главным экраном к зрителю; экран стоит, чтобы его рассмотреть, затем карусель спокойно поворачивается
   к следующему экрану сайта. Показав все экраны, карусель тает, и на её месте так же проявляется следующий сайт.
   Прозрачность меняется у самих экранов, а не у карусели: иначе браузер «сплющивает» 3D, и карусель
   появляется кусками и рывком. Идёт, только пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-sites]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cars = Array.prototype.slice.call(sec.querySelectorAll('.sites__carousel'));
  var label = sec.querySelector('.sites__label'), lName = sec.querySelector('.sites__name'), lType = sec.querySelector('.sites__type');
  var SHOW = 3.2, TURN = 1.4;                // сколько стоит каждый экран и сколько длится поворот к следующему
  var cur = 0, run = null, started = false;

  /* экраны по кругу: первый (главный экран сайта) — к зрителю */
  var place = function () {
    cars.forEach(function (car) {
      var cells = car.querySelectorAll('.sites__cell'), n = cells.length, r = car.offsetWidth * 0.86;
      Array.prototype.forEach.call(cells, function (c, i) { c.style.transform = 'rotateY(' + (360 / n) * i + 'deg) translateZ(' + r + 'px)'; });
    });
  };
  place();
  window.addEventListener('resize', place);
  cars.forEach(function (car) {
    gsap.set(car, { z: -420, rotationY: 0, rotationX: 5, visibility: 'hidden' });
    gsap.set(car.querySelectorAll('.sites__face'), { opacity: 0 });
  });

  var setLabel = function (i, instant) {
    var s = cars[i].closest('.sites__scene');
    var apply = function () { lName.textContent = s.getAttribute('data-name'); lType.textContent = s.getAttribute('data-type'); };
    if (instant || reduce) { apply(); return; }
    gsap.to(label, { autoAlpha: 0, y: -8, duration: 0.35, ease: 'power1.in', onComplete: function () { apply(); gsap.to(label, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }); } });
  };

  /* показ одного сайта: проявление целиком → главный экран стоит → поворот к каждому следующему экрану → тает */
  var showSite = function (i) {
    var car = cars[i], faces = car.querySelectorAll('.sites__face'), n = car.querySelectorAll('.sites__cell').length;
    gsap.killTweensOf(car); gsap.killTweensOf(faces);
    gsap.set(car, { visibility: 'visible', rotationY: 0, rotationX: 5, scale: 0.92 });
    var tl = gsap.timeline();
    tl.to(faces, { opacity: 1, duration: reduce ? 0.01 : 1.1, ease: 'power2.out' }, 0)
      .to(car, { scale: 1, duration: reduce ? 0.01 : 1.6, ease: 'power3.out' }, 0);
    for (var k = 1; k < n; k++) tl.to(car, { rotationY: -(360 / n) * k, duration: reduce ? 0.01 : TURN, ease: 'power2.inOut' }, '+=' + SHOW);
    tl.call(function () { setLabel((i + 1) % cars.length); }, null, '+=' + SHOW)   // название меняется вместе со сменой сайта
      .to(faces, { opacity: 0, duration: reduce ? 0.01 : 0.8, ease: 'power1.in' }, '<')
      .to(car, { scale: 0.94, duration: reduce ? 0.01 : 0.8, ease: 'power1.in' }, '<')
      .set(car, { visibility: 'hidden' })
      .call(function () { cur = (cur + 1) % cars.length; run = showSite(cur); }, null, '+=0.15');
    return tl;
  };

  var intro = function () {
    if (reduce) return;
    gsap.from(sec.querySelector('.sites__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, stagger: 0.12, delay: 0.1, ease: 'power3.out' });
    gsap.from(sec.querySelector('.sites__bg'), { autoAlpha: 0, duration: 1.6, ease: 'power2.out' });
    gsap.from(sec.querySelectorAll('.sites__label, .sites__review'), { autoAlpha: 0, y: 14, duration: 0.8, delay: 0.5, stagger: 0.1, ease: 'power3.out' });
  };

  /* идёт, только пока блок на экране */
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !started) { started = true; intro(); setLabel(0, true); run = showSite(0); return; }
    if (!started || !run) return;
    if (vis) run.resume(); else run.pause();
  }, { threshold: 0.2 }).observe(sec);
})();
