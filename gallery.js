/* Блок 9 «Галерея» — продолжение блока 8: оригиналы макетов крупным планом.
   Лента работ листается мышью (перетаскиванием), колёсиком с Shift, стрелками и пальцем;
   плашки сверху отбирают работы по виду; по клику работа открывается целиком на весь экран. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-gallery]');
  if (!sec) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var strip = sec.querySelector('.gal__strip');
  var items = Array.prototype.slice.call(sec.querySelectorAll('.gal__item'));
  var chips = Array.prototype.slice.call(sec.querySelectorAll('.gal__chip'));
  var box = document.querySelector('.gal-box');

  /* ---------- лента: перетаскивание мышью (палец листает сам) ---------- */
  var down = false, moved = 0, sx = 0, sl = 0;
  strip.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = 0; sx = e.clientX; sl = strip.scrollLeft;
    strip.classList.add('is-drag');
  });
  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
    strip.scrollLeft = sl - dx;
  });
  window.addEventListener('pointerup', function () { if (down) { down = false; strip.classList.remove('is-drag'); setTimeout(function () { moved = 0; }, 0); } });   // клик после перетаскивания не открывает работу
  strip.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* стрелки: на одну работу вперёд / назад */
  var step = function (dir) {
    var vis = items.filter(function (it) { return !it.hidden; });
    var x = strip.scrollLeft, target = null;
    for (var i = 0; i < vis.length; i++) {
      var l = vis[i].offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft);
      if (dir > 0 && l > x + 4) { target = l; break; }
      if (dir < 0 && l < x - 4) target = l;
    }
    if (target === null) target = dir > 0 ? strip.scrollWidth : 0;
    strip.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
  };
  sec.querySelector('.gal__prev').addEventListener('click', function () { step(-1); });
  sec.querySelector('.gal__next').addEventListener('click', function () { step(1); });
  var ends = function () {
    sec.querySelector('.gal__prev').disabled = strip.scrollLeft < 4;
    sec.querySelector('.gal__next').disabled = strip.scrollLeft > strip.scrollWidth - strip.clientWidth - 4;
  };
  strip.addEventListener('scroll', ends, { passive: true });
  window.addEventListener('resize', ends);

  /* ---------- плашки-фильтры ---------- */
  chips.forEach(function (ch) {
    ch.addEventListener('click', function () {
      var f = ch.getAttribute('data-filter');
      chips.forEach(function (c) { c.classList.toggle('is-on', c === ch); c.setAttribute('aria-pressed', c === ch ? 'true' : 'false'); });
      var show = items.filter(function (it) { return f === 'all' || it.getAttribute('data-kind') === f; });
      var apply = function () {
        items.forEach(function (it) { it.hidden = show.indexOf(it) < 0; });
        strip.scrollLeft = 0; ends();
        if (gsap && !reduce) gsap.fromTo(show, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 });
      };
      if (gsap && !reduce) gsap.to(items.filter(function (it) { return !it.hidden; }), { autoAlpha: 0, y: -12, duration: 0.25, ease: 'power2.in', onComplete: apply });
      else apply();
    });
  });

  /* ---------- работа целиком на весь экран ---------- */
  var boxImg = box.querySelector('.gal-box__img'), boxName = box.querySelector('.gal-box__name'), boxKind = box.querySelector('.gal-box__kind');
  var cur = -1, lastFocus = null;
  var fill = function (i) {
    var it = items[i], im = it.querySelector('img');
    boxImg.src = im.currentSrc || im.src; boxImg.alt = im.alt;
    boxName.textContent = it.querySelector('.gal__name').textContent;
    boxKind.textContent = it.querySelector('.gal__kind').textContent;
  };
  var visIdx = function () { return items.map(function (it, i) { return it.hidden ? -1 : i; }).filter(function (i) { return i > -1; }); };
  var open = function (i) {
    cur = i; fill(i); lastFocus = document.activeElement;
    box.hidden = false; document.documentElement.classList.add('gal-open');
    if (window.lenis) window.lenis.stop();
    if (gsap && !reduce) { gsap.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }); gsap.fromTo(boxImg, { scale: 0.94, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'power3.out' }); }
    box.querySelector('.gal-box__close').focus();
  };
  var close = function () {
    var done = function () { box.hidden = true; document.documentElement.classList.remove('gal-open'); if (window.lenis) window.lenis.start(); if (lastFocus) lastFocus.focus(); };
    if (gsap && !reduce) gsap.to(box, { autoAlpha: 0, duration: 0.25, onComplete: done }); else done();
  };
  var go = function (dir) {
    var v = visIdx(), k = v.indexOf(cur); if (k < 0) return;
    cur = v[(k + dir + v.length) % v.length];
    if (gsap && !reduce) gsap.to(boxImg, { autoAlpha: 0, x: -30 * dir, duration: 0.2, onComplete: function () { fill(cur); gsap.fromTo(boxImg, { autoAlpha: 0, x: 30 * dir }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out' }); } });
    else fill(cur);
  };
  items.forEach(function (it, i) {
    var btn = it.querySelector('.gal__open');
    btn.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); return; } open(i); });   // это было перетаскивание, а не клик
  });
  box.querySelector('.gal-box__close').addEventListener('click', close);
  box.querySelector('.gal-box__prev').addEventListener('click', function () { go(-1); });
  box.querySelector('.gal-box__next').addEventListener('click', function () { go(1); });
  box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('gal-box__stage')) close(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  });

  /* ---------- появление: заголовок выезжает, работы открываются шторкой снизу по очереди ---------- */
  ends();
  if (!gsap || reduce) return;
  gsap.set(items, { clipPath: 'inset(100% 0% 0% 0%)' });
  var seen = false;
  new IntersectionObserver(function (en) {
    if (!en[0].isIntersecting || seen) return;
    seen = true;
    gsap.from(sec.querySelector('.gal__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.gal__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, delay: 0.1, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.gal__kicker, .gal__chip'), { autoAlpha: 0, y: 14, duration: 0.7, delay: 0.35, stagger: 0.06, ease: 'power3.out' });
    gsap.to(items, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.inOut', stagger: 0.1, delay: 0.3 });
  }, { threshold: 0.25 }).observe(sec);
})();
