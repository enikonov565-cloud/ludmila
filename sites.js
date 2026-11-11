/* Блок 10 «Делаю сайты: погружающие с первого экрана» — по макету Figma «Slide 4:3 - 2».
   Карусель экранов сайта справа вверху: ровная, без наклонов. Главный экран — к зрителю, соседние видны
   узкими краями по бокам. Экран стоит, чтобы его рассмотреть, затем карусель ровно поворачивается к следующему.
   Показав все экраны, карусель целиком опускается под отзыв, а следующий сайт целиком поднимается
   из-под отзыва — сразу главным экраном. Прозрачность меняется у самих экранов, а не у карусели: иначе браузер «сплющивает» 3D.
   Идёт, только пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-sites]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cars = Array.prototype.slice.call(sec.querySelectorAll('.sites__carousel'));
  var STEP = 60;                               // угол между экранами: соседние видны краями, как в макете
  var SHOW = 3.2, TURN = 1.4;                  // сколько стоит экран и сколько длится поворот
  var cur = 0, run = null, started = false;

  var radius = function (car) { return car.offsetWidth * 0.977; };
  var stage = sec.querySelector('.sites__stage'), review = sec.querySelector('.sites__review');
  /* на сколько опустить карусель, чтобы она целиком спряталась под отзыв (на телефоне — под нижний край сцены) */
  var drop = function (car) {
    var line = getComputedStyle(stage).position === 'absolute' ? review.offsetTop : stage.offsetHeight;
    return line - car.offsetTop + 12;
  };

  /* экраны по дуге; карусель отодвинута на радиус, чтобы главный экран стоял в своём размере */
  var place = function () {
    cars.forEach(function (car) {
      var r = radius(car);
      Array.prototype.forEach.call(car.querySelectorAll('.sites__cell'), function (c, i) {
        c.style.transform = 'rotateY(' + STEP * i + 'deg) translateZ(' + r + 'px)';
      });
      gsap.set(car, { z: -r });
    });
  };
  place();
  window.addEventListener('resize', place);
  cars.forEach(function (car) {
    gsap.set(car, { x: 0, rotationY: 0, rotationX: 0, rotationZ: 0, visibility: 'hidden' });
    gsap.set(car.querySelectorAll('.sites__face'), { opacity: 0 });
  });

  /* показ одного сайта: поднимается из-под отзыва → главный экран стоит → ровный поворот к каждому следующему → опускается под отзыв */
  var showSite = function (i) {
    var car = cars[i], faces = car.querySelectorAll('.sites__face'), n = faces.length;
    var d = function (s) { return reduce ? 0.01 : s; };
    gsap.killTweensOf(car); gsap.killTweensOf(faces);
    gsap.set(car, { visibility: 'visible', x: 0, y: reduce ? 0 : drop(car), rotationY: 0 });
    gsap.set(faces, { opacity: 0 });
    var tl = gsap.timeline();
    tl.to(car, { y: 0, duration: d(1.9), ease: 'power3.out' }, 0)
      .to(faces, { opacity: 1, duration: d(1.3), ease: 'power1.out' }, 0);
    for (var k = 1; k < n; k++) tl.to(car, { rotationY: -STEP * k, duration: d(TURN), ease: 'power2.inOut' }, '+=' + SHOW);
    tl.to(car, { y: function () { return reduce ? 0 : drop(car); }, duration: d(1.4), ease: 'power2.in' }, '+=' + SHOW)
      .to(faces, { opacity: 0, duration: d(1.1), ease: 'power1.in' }, '<0.2')
      .set(car, { visibility: 'hidden' })
      .call(function () { cur = (cur + 1) % cars.length; run = showSite(cur); });
    return tl;
  };

  var intro = function () {
    if (reduce) return;
    gsap.from(sec.querySelector('.sites__bg'), { autoAlpha: 0, duration: 1.6, ease: 'power2.out' });
    gsap.from(sec.querySelector('.sites__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__title .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, delay: 0.1, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__tags .show__tag'), { autoAlpha: 0, y: 12, duration: 0.7, delay: 0.3, stagger: 0.08, ease: 'power3.out' });
    gsap.from(sec.querySelector('.sites__review'), { autoAlpha: 0, y: 14, duration: 0.8, delay: 0.6, ease: 'power3.out' });
  };

  /* идёт, только пока блок на экране */
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !started) { started = true; intro(); run = showSite(0); return; }
    if (!started || !run) return;
    if (vis) run.resume(); else run.pause();
  }, { threshold: 0.2 }).observe(sec);
})();
