/* Блок 7 «Я не жду ТЗ — я задаю правильные вопросы» (Figma «п-р 11»).
   Четыре принципа не стоят стеной текста: виден список коротких заголовков, а раскрыт один —
   с пояснением. Компьютер: блок закрепляется, прокрутка ведёт по принципам 01 → 04
   (на любой можно нажать). Телефон: принципы раскрыты и проявляются по мере прокрутки. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-talk]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var items = Array.prototype.slice.call(sec.querySelectorAll('.talk__item'));
  var num = sec.querySelector('.talk__num');
  var fill = sec.querySelector('.talk__fill');
  var total = items.length, cur = -1;
  var stacked = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* появление: фото с окна медленно приближается, заголовок выезжает строками, пункты — по очереди */
  var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  intro.from(sec.querySelector('.talk__window'), { scale: 1.12, autoAlpha: 0, duration: 1.8, ease: 'power2.out' }, 0)
    .from(sec.querySelector('.talk__person'), { xPercent: -6, autoAlpha: 0, duration: 1.4 }, 0.2)
    .from(sec.querySelectorAll('.talk__title .story__reveal'), { yPercent: 110, duration: 1, stagger: 0.12 }, 0.4)
    .fromTo(items, { y: 24, autoAlpha: 0, filter: 'blur(6px)' }, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.1, clearProps: 'opacity,visibility,filter,transform' }, 0.8)
    .from(sec.querySelectorAll('.talk__rail, .talk__num'), { autoAlpha: 0, duration: 0.8 }, 1);

  var setActive = function (n) {
    if (n === cur) return;
    cur = n;
    items.forEach(function (it, i) {
      var on = i === n, body = it.querySelector('.talk__body');
      it.classList.toggle('is-on', on);
      it.setAttribute('aria-expanded', on ? 'true' : 'false');
      gsap.to(body, { height: on ? 'auto' : 0, autoAlpha: on ? 1 : 0, duration: 0.6, ease: 'power3.inOut', overwrite: true });
      if (on) gsap.fromTo(it.querySelector('.talk__clip'), { rotate: -35, scale: 0.7 }, { rotate: 0, scale: 1, duration: 0.8, ease: 'back.out(2)' });
    });
    if (num) {   // большая цифра в полутоне меняется: старая уходит вверх, новая приходит снизу
      gsap.to(num, { yPercent: -30, autoAlpha: 0, duration: 0.25, ease: 'power2.in', onComplete: function () {
        num.textContent = '0' + (n + 1);
        gsap.fromTo(num, { yPercent: 30, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' });
      } });
    }
    if (fill) gsap.to(fill, { scaleY: (n + 1) / total, duration: 0.6, ease: 'power3.out' });
  };

  if (stacked || reduce) {
    items.forEach(function (it) { it.classList.add('is-on'); });
    if (reduce) return;
    var seen = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { seen.unobserve(e.target); intro.play(); } });
    }, { threshold: 0.15 });
    seen.observe(sec.querySelector('.talk__title'));
    return;
  }

  /* компьютер: все пояснения свёрнуты, кроме первого */
  items.forEach(function (it, i) { if (i) gsap.set(it.querySelector('.talk__body'), { height: 0, autoAlpha: 0 }); });
  items[0].classList.add('is-on'); cur = 0;
  if (fill) gsap.set(fill, { scaleY: 1 / total });
  var started = false;
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting && !started) { started = true; intro.play(); }
  }, { threshold: 0.5 }).observe(sec);

  var st = null;
  if (window.ScrollTrigger) {
    st = window.ScrollTrigger.create({
      trigger: sec, start: 'top top', end: '+=' + (total - 1) * 80 + '%', pin: true, pinSpacing: true, refreshPriority: -4,
      onUpdate: function (self) { setActive(Math.min(total - 1, Math.floor(self.progress * total * 0.999))); }
    });
    window.ScrollTrigger.sort();
  }
  /* нажатие на принцип — прокрутка к нему, чтобы прокрутка и показ не расходились */
  items.forEach(function (it, i) {
    it.addEventListener('click', function () {
      if (!st) { setActive(i); return; }
      var y = st.start + (st.end - st.start) * (i + 0.5) / total;
      if (window.lenis) window.lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
})();
