/* Блок 8 «Что умею: баннеры, наружка, соцсети» (Figma «п-р10(5)», «п-р10(6)»).
   Компьютер: блок закрепляется, прокрутка показывает работы по одной — афиша открывается шторкой снизу,
   за ней разгорается её свет, название выезжает из-под строки, справа — лента всех работ.
   Телефон: работы идут друг за другом и проявляются при появлении на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-show]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var works = Array.prototype.slice.call(sec.querySelectorAll('.show__work'));
  var glows = Array.prototype.slice.call(sec.querySelectorAll('.show__glow img'));
  var thumbs = Array.prototype.slice.call(sec.querySelectorAll('.show__thumb'));
  var total = works.length, cur = 0;
  var curEl = sec.querySelector('.show__cur');
  var hint = sec.querySelector('.show__hint');
  var stacked = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* слово-место («Остановка», «Кафе»…) — по буквам, как «До» / «После» */
  sec.querySelectorAll('.show__ghost').forEach(function (g) {
    g.innerHTML = Array.prototype.map.call(g.textContent, function (ch) { return '<span class="ch">' + ch + '</span>'; }).join('');
  });
  var poster = function (w) { return w.querySelector('.show__poster'); };
  var bits = function (w) { return w.querySelectorAll('.show__type, .show__list li'); };

  /* появление одной работы */
  var workIn = function (w, delay) {
    var tl = gsap.timeline({ delay: delay || 0 });
    var p = poster(w), g = w.querySelector('.show__ghost');
    tl.set(w, { autoAlpha: 1 }, 0)
      .fromTo(p, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power4.inOut' }, 0)
      .fromTo(p.querySelector('img'), { scale: 1.18 }, { scale: 1, duration: 1.5, ease: 'power3.out' }, 0)
      .fromTo(g.children, { yPercent: 70, autoAlpha: 0, rotate: 6, filter: 'blur(14px)' },
        { yPercent: 0, autoAlpha: 1, rotate: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', stagger: 0.06 }, 0.1)
      .fromTo(w.querySelector('.show__name .story__reveal'), { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, ease: 'power3.out' }, 0.3)
      .fromTo(bits(w), { y: 24, autoAlpha: 0, filter: 'blur(6px)' },
        { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out', stagger: 0.12 }, 0.5);
    if (reduce) tl.progress(1);
    return tl;
  };

  /* заход в блок: заголовок выезжает из-под строки, подпись проявляется */
  var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  intro.from(sec.querySelectorAll('.show__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, stagger: 0.12 })
    .from(sec.querySelector('.show__kicker'), { autoAlpha: 0, y: 14, duration: 0.7 }, 0.3);

  if (stacked) {
    if (reduce) { intro.progress(1); return; }
    var head = sec.querySelector('.show__head');
    works.forEach(function (w) { gsap.set(w.querySelectorAll('.show__poster, .show__ghost .ch, .show__name .story__reveal, .show__type, .show__list li'), { autoAlpha: 0 }); });
    var seen = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        seen.unobserve(e.target);
        if (e.target === head) intro.play();
        else { gsap.set(poster(e.target), { autoAlpha: 1 }); workIn(e.target); }
      });
    }, { threshold: 0.2 });
    seen.observe(head);
    works.forEach(function (w) { seen.observe(w); });
    return;
  }

  /* компьютер: работы лежат друг на друге, видна одна */
  gsap.set(works.slice(1), { autoAlpha: 0 });
  gsap.set(glows.slice(1), { autoAlpha: 0 });
  gsap.set(poster(works[0]), { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set(works[0].querySelectorAll('.show__ghost .ch, .show__name .story__reveal, .show__type, .show__list li'), { autoAlpha: 0 });
  gsap.set(glows[0], { autoAlpha: 0 });

  var started = false;
  new IntersectionObserver(function (en) {
    if (!en[0].isIntersecting || started) return;
    started = true;
    if (reduce) intro.progress(1); else intro.play();
    gsap.to(glows[0], { autoAlpha: 1, duration: reduce ? 0.01 : 1.6, ease: 'power2.out', delay: reduce ? 0 : 0.4 });
    workIn(works[0], reduce ? 0 : 0.4);
    if (hint) gsap.delayedCall(reduce ? 0 : 1, function () { hint.classList.add('is-in'); });
  }, { threshold: 0.55 }).observe(sec);

  var show = function (n) {
    if (n === cur) return;
    var from = works[cur], to = works[n];
    var fromGlow = glows[cur], toGlow = glows[n];
    cur = n;
    curEl.textContent = (n + 1 < 10 ? '0' : '') + (n + 1);
    thumbs.forEach(function (t, i) { t.classList.toggle('is-on', i === n); t.setAttribute('aria-current', i === n ? 'true' : 'false'); });
    if (hint) hint.classList.toggle('is-done', n === total - 1);
    works.forEach(function (w) { gsap.killTweensOf(w); gsap.killTweensOf(w.querySelectorAll('.show__poster, .show__poster img, .show__ghost, .show__ghost .ch, .show__name, .show__name .story__reveal, .show__type, .show__list, .show__list li')); });
    /* третья работа не может остаться видимой */
    works.forEach(function (w) { if (w !== from && w !== to) gsap.set(w, { autoAlpha: 0, zIndex: 0 }); });
    glows.forEach(function (g) { if (g !== fromGlow && g !== toGlow) { gsap.killTweensOf(g); gsap.set(g, { autoAlpha: 0 }); } });
    if (reduce) {
      gsap.set(from, { autoAlpha: 0 }); gsap.set(fromGlow, { autoAlpha: 0 }); gsap.set(toGlow, { autoAlpha: 1 });
      gsap.set(to, { zIndex: 2 }); workIn(to); return;
    }
    gsap.set(from, { zIndex: 1 }); gsap.set(to, { zIndex: 2 });
    /* старая работа: тексты уходят вверх, афиша отступает в глубину — новая открывается поверх неё */
    gsap.to(from.querySelectorAll('.show__ghost, .show__name, .show__type, .show__list'), { y: -24, autoAlpha: 0, duration: 0.35, ease: 'power2.in', stagger: 0.04 });
    gsap.to(poster(from), { scale: 0.94, autoAlpha: 0, duration: 1.15, ease: 'power4.inOut',
      onComplete: function () { gsap.set(from, { autoAlpha: 0 }); gsap.set(from.querySelectorAll('.show__ghost, .show__name, .show__type, .show__list'), { y: 0, autoAlpha: 1 }); gsap.set(poster(from), { scale: 1, autoAlpha: 1 }); } });
    gsap.to(fromGlow, { autoAlpha: 0, duration: 1.2, ease: 'power2.inOut' });
    gsap.to(toGlow, { autoAlpha: 1, duration: 1.2, ease: 'power2.inOut' });
    gsap.set(to.querySelectorAll('.show__ghost, .show__name, .show__type, .show__list'), { y: 0, autoAlpha: 1 });
    gsap.set(poster(to), { scale: 1, autoAlpha: 1 });
    workIn(to, 0.15);
  };

  var st = null;
  if (window.ScrollTrigger) {
    st = window.ScrollTrigger.create({
      trigger: sec, start: 'top top', end: '+=' + (total - 1) * 100 + '%', pin: true, pinSpacing: true, refreshPriority: -4,
      onUpdate: function (self) { show(Math.min(total - 1, Math.floor(self.progress * total * 0.999))); }
    });
    window.ScrollTrigger.sort();
  }
  /* стрелки и лента прокручивают страницу к нужной работе — прокрутка и показ не расходятся */
  var go = function (n) {
    n = Math.max(0, Math.min(total - 1, n));
    if (!st) { show(n); return; }
    var y = st.start + (st.end - st.start) * (n + 0.5) / total;
    if (window.lenis) window.lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  };
  sec.querySelector('.show__arrow--prev').addEventListener('click', function () { go(cur - 1); });
  sec.querySelector('.show__arrow--next').addEventListener('click', function () { go(cur + 1); });
  if (hint) hint.addEventListener('click', function () { go(cur + 1); });
  thumbs.forEach(function (t, i) { t.addEventListener('click', function () { go(i); }); });
})();
