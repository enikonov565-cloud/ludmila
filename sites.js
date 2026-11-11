/* Блок 10 «Делаю сайты: погружающие с первого экрана».
   Карусели — по мотивам codrops «On-Scroll 3D Carousel» (github.com/codrops/3DCarousel): экраны сайта стоят по кругу
   в 3D и вращаются; здесь — сами, без прокрутки. Каждые несколько секунд карусель одного сайта уходит вглубь,
   и на её место из-под низа въезжает карусель следующего (Флорис → Nikonovphoto → Театр кукол → снова Флорис).
   Подпись справа внизу — название сайта и его тема. Идёт, только пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-sites]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scenes = Array.prototype.slice.call(sec.querySelectorAll('.sites__carousel'));
  var label = sec.querySelector('.sites__label'), lName = sec.querySelector('.sites__name'), lType = sec.querySelector('.sites__type');
  var HOLD = 8, cur = 0, timer = null, started = false;

  /* экраны по кругу: каждый повёрнут на свой угол и вынесен на радиус */
  var place = function () {
    scenes.forEach(function (car) {
      var cells = car.querySelectorAll('.sites__cell'), n = cells.length;
      var r = car.offsetWidth * 0.86;   // радиус круга — от ширины экрана-карточки
      Array.prototype.forEach.call(cells, function (c, i) { c.style.transform = 'rotateY(' + (360 / n) * i + 'deg) translateZ(' + r + 'px)'; });
    });
  };
  place();
  window.addEventListener('resize', place);

  /* непрерывное вращение и лёгкое покачивание — как у оригинала при прокрутке, только само */
  var spins = scenes.map(function (car) {
    gsap.set(car, { z: -420, rotationY: 0, rotationX: 4, rotationZ: 2, autoAlpha: 0 });   // 0° — к зрителю повёрнут первый экран: главный экран сайта
    var t = gsap.timeline({ paused: true, repeat: -1 });
    t.to(car, { rotationY: '-=360', duration: reduce ? 120 : 34, ease: 'none' }, 0);
    var sway = gsap.timeline({ paused: true, repeat: -1, yoyo: true });
    sway.to(car, { rotationZ: -2, rotationX: -3, duration: 6, ease: 'sine.inOut' });
    return { t: t, sway: sway };
  });

  var setLabel = function (i) {
    var s = scenes[i].closest('.sites__scene');
    gsap.to(label, { autoAlpha: 0, y: 8, duration: 0.35, ease: 'power1.in', onComplete: function () {
      lName.textContent = s.getAttribute('data-name'); lType.textContent = s.getAttribute('data-type');
      gsap.to(label, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' });
    } });
  };

  /* карусель приходит: из-под низа, с разворотом — как возвращение карусели в оригинале */
  var bringIn = function (i, delay) {
    var car = scenes[i];
    gsap.set(car, { rotationY: 0 });                      // каждая карусель открывается с главного экрана сайта
    spins[i].t.invalidate().restart(); spins[i].sway.play();
    if (reduce) { gsap.set(car, { autoAlpha: 1, yPercent: 0, z: -420 }); return; }
    gsap.fromTo(car, { autoAlpha: 0, yPercent: 260, z: -900, rotationX: 24 },
      { autoAlpha: 1, yPercent: 0, z: -420, rotationX: 4, duration: 1.8, ease: 'expo.out', delay: delay || 0 });
    gsap.fromTo(car.querySelectorAll('.sites__card'), { filter: 'brightness(220%)' }, { filter: 'brightness(100%)', duration: 2.2, ease: 'power3.out', delay: delay || 0 });
  };
  /* карусель уходит: опрокидывается и улетает вглубь — как переход в оригинале */
  var sendOut = function (i) {
    var car = scenes[i];
    if (reduce) { gsap.set(car, { autoAlpha: 0 }); spins[i].t.pause(); spins[i].sway.pause(); return; }
    gsap.to(car, { rotationX: 80, z: -2200, autoAlpha: 0, duration: 1.4, ease: 'power2.inOut',
      onComplete: function () { spins[i].t.pause(); spins[i].sway.pause(); } });
  };
  var next = function () {
    var from = cur; cur = (cur + 1) % scenes.length;
    sendOut(from);
    bringIn(cur, reduce ? 0 : 0.7);
    setLabel(cur);
    timer = gsap.delayedCall(HOLD, next);
  };

  var intro = function () {
    if (reduce) return;
    gsap.from(sec.querySelector('.sites__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.sites__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, stagger: 0.12, delay: 0.1, ease: 'power3.out' });
    gsap.from(sec.querySelector('.sites__bg'), { autoAlpha: 0, scale: 1.06, duration: 1.8, ease: 'power2.out' });
    gsap.from(sec.querySelectorAll('.sites__label, .sites__review'), { autoAlpha: 0, y: 14, duration: 0.8, delay: 0.6, stagger: 0.1, ease: 'power3.out' });
  };

  /* идёт, только пока блок на экране */
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !started) { started = true; intro(); bringIn(0, 0.3); timer = gsap.delayedCall(HOLD, next); return; }
    if (!started) return;
    if (vis) { if (timer) timer.resume(); spins[cur].t.resume(); spins[cur].sway.resume(); }
    else { if (timer) timer.pause(); spins.forEach(function (s) { s.t.pause(); s.sway.pause(); }); }
  }, { threshold: 0.2 }).observe(sec);
})();
