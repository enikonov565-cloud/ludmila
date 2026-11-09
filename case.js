/* Блок 6 «Дизайн продаёт» (Figma «п-р10(4)»): кейс разбит на три страницы — «До», «После», «Итог».
   Компьютер: блок закрепляется, прокрутка листает страницы, стрелки и счётчик — как в «Моём подходе».
   Телефон: страницы идут друг за другом, каждая проявляется при появлении на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-case]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var pages = Array.prototype.slice.call(sec.querySelectorAll('.case__page'));
  var total = pages.length, cur = 0;
  var curEl = sec.querySelector('.case__cur');
  var hint = sec.querySelector('.case__hint');
  var stacked = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* «После»: карточки-комплекты сменяются сами — «Грёзы» → «Тюльпан» → «Гжель» → снова «Грёзы» (все четыре карточки комплекта).
     Плавная смена с лёгким приближением; крутится, только пока блок на экране */
  var setSlots = sec.querySelectorAll('.case__sets');
  if (setSlots.length && !reduce) {
    var si = 0, setTimer = null, setTotal = setSlots[0].querySelectorAll('img').length;
    setSlots.forEach(function (slot) { var im = slot.querySelectorAll('img'); gsap.set(im, { autoAlpha: 0 }); gsap.set(im[0], { autoAlpha: 1 }); });
    var nextSet = function () {
      var prevI = si; si = (si + 1) % setTotal;
      setSlots.forEach(function (slot, k) {          // окна меняются по очереди, слева направо
        var im = slot.querySelectorAll('img'), prev = im[prevI], cur = im[si];
        gsap.set(prev, { zIndex: 1 });
        gsap.set(cur, { zIndex: 2, autoAlpha: 1 });
        gsap.timeline({ delay: k * 0.14 })
          .fromTo(cur, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.18 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.15, ease: 'power4.inOut' }, 0)
          .to(prev, { scale: 0.94, duration: 1.15, ease: 'power4.inOut' }, 0)
          .set(prev, { autoAlpha: 0, scale: 1 });
      });
    };
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!setTimer) setTimer = setInterval(nextSet, 4000); }
      else { clearInterval(setTimer); setTimer = null; }
    }, { threshold: 0.2 }).observe(setSlots[0]);
  }

  /* «До» / «После» — по буквам, как «Тогда» */
  sec.querySelectorAll('.case__ghost').forEach(function (g) {
    g.innerHTML = Array.prototype.map.call(g.textContent, function (ch) { return '<span class="ch">' + ch + '</span>'; }).join('');
  });
  var bits = function (p) { return p.querySelectorAll('.case__item, .case__card, .case__tstat, .case__stat, .case__divider'); };
  var shot = function (p) { return p.querySelector('.case__shot'); };

  /* заход в блок: заголовок выезжает из-под строки, цифра «+20%» проявляется, первая страница собирается */
  var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  intro.from(sec.querySelectorAll('.case__head .story__reveal'), { yPercent: 110, duration: 1, stagger: 0.12 })
    .from(sec.querySelector('.case__kicker'), { autoAlpha: 0, y: 14, duration: 0.7 }, 0.3)
    .from(sec.querySelector('.case__num'), { autoAlpha: 0, y: 30, filter: 'blur(10px)', duration: 1 }, 0.3)
    .from(sec.querySelectorAll('.case__word, .case__niche'), { autoAlpha: 0, y: 18, duration: 0.8, stagger: 0.15 }, 0.55)
    .from(sec.querySelector('.case__nav'), { autoAlpha: 0, duration: 0.6 }, 0.8)
    .call(function () { if (hint) hint.classList.add('is-in'); }, null, 0.9);

  var pageIn = function (p, delay) {
    var tl = gsap.timeline({ delay: delay || 0 });
    var s = shot(p), g = p.querySelector('.case__ghost');
    if (g) {
      tl.set(g, { autoAlpha: 1 }, 0)
        .fromTo(g.children, { yPercent: 70, autoAlpha: 0, rotate: 6, filter: 'blur(14px)' },
          { yPercent: 0, autoAlpha: 1, rotate: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', stagger: 0.09 }, 0);
      if (!g._float) g._float = gsap.to(g, { y: -14, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });   // слово медленно парит
    }
    if (s) tl.fromTo(s, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power3.inOut' }, 0)
             .fromTo(s.querySelector('img'), { scale: 1.08 }, { scale: 1, duration: 1.4, ease: 'power2.out' }, 0);
    tl.fromTo(bits(p), { y: 24, autoAlpha: 0, filter: 'blur(6px)' },
      { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out', stagger: 0.12 }, s ? 0.35 : 0);
    return tl;
  };

  if (stacked || reduce) {
    /* телефон / без анимации: все страницы видны, проявляются по мере прокрутки */
    if (reduce) return;
    var seen = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        seen.unobserve(e.target);
        if (e.target === head) intro.play(); else pageIn(e.target);
      });
    }, { threshold: 0.25 });
    var head = sec.querySelector('.case__head');   // по заголовку, а не по всему блоку: блок на телефоне выше экрана
    seen.observe(head);
    pages.forEach(function (p) { gsap.set(bits(p), { autoAlpha: 0 }); seen.observe(p); });
    return;
  }

  /* компьютер: страницы лежат друг на друге, видна одна */
  gsap.set(sec.querySelectorAll('.case__ghost'), { xPercent: -50, yPercent: -50 });
  /* «После»: карточки растут на широком экране — до высоты кадра (k ≤ 1.1), не дальше ширины */
  var setK = function () {
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, u = Math.min(vw / 1920, vh / 1080);
    var k = Math.min(1.1, (vw - 246 * u) / (1674 * u));
    sec.style.setProperty('--k', Math.max(0.6, k).toFixed(4));
  };
  setK(); window.addEventListener('resize', setK);   // слово — центром в точке
  gsap.set(pages.slice(1), { autoAlpha: 0 });
  gsap.set(bits(pages[0]), { autoAlpha: 0 });
  gsap.set(pages[0].querySelector('.case__ghost'), { autoAlpha: 0 });
  if (shot(pages[0])) gsap.set(shot(pages[0]), { clipPath: 'inset(0 0 100% 0)' });
  var started = false;
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting && !started) { started = true; intro.play(); pageIn(pages[0], 0.4); }
  }, { threshold: 0.55 }).observe(sec);

  var show = function (n) {
    if (n === cur) return;
    var dir = n > cur ? 1 : -1, from = pages[cur], to = pages[n];
    cur = n;
    sec.setAttribute('data-page', n);   // «+20%» и счётчик встают по макету этой страницы
    curEl.textContent = (n + 1 < 10 ? '0' : '') + (n + 1);
    if (hint) hint.classList.toggle('is-done', n === total - 1);
    gsap.killTweensOf([from, to]);
    from.classList.remove('is-active'); to.classList.add('is-active');
    gsap.to(from, { autoAlpha: 0, x: -40 * dir, duration: 0.3, ease: 'power2.in' });   // сначала старая страница уходит целиком…
    gsap.fromTo(to, { autoAlpha: 0, x: 40 * dir }, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'power3.out', delay: 0.32 });   // …потом приходит новая — без наложения
    pageIn(to, 0.32);
  };

  var st = null;
  if (window.ScrollTrigger) {
    st = window.ScrollTrigger.create({
      trigger: sec, start: 'top top', end: '+=' + (total - 1) * 100 + '%', pin: true, pinSpacing: true, refreshPriority: -3,
      onUpdate: function (self) { show(Math.min(total - 1, Math.floor(self.progress * total * 0.999))); }
    });
    window.ScrollTrigger.sort();
  }
  /* стрелки прокручивают страницу к нужной странице кейса — прокрутка и показ не расходятся */
  var jump = function (d) {
    var n = Math.max(0, Math.min(total - 1, cur + d));
    if (!st) { show(n); return; }
    var y = st.start + (st.end - st.start) * (n + 0.5) / total;
    if (window.lenis) window.lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  };
  sec.querySelector('.case__arrow--prev').addEventListener('click', function () { jump(-1); });
  sec.querySelector('.case__arrow--next').addEventListener('click', function () { jump(1); });
  if (hint) hint.addEventListener('click', function () { jump(1); });
})();
