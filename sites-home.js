/* Блок 10, вторая страница — главные экраны сайтов во весь экран (по присланному примеру «scroll or drag»).
   Экраны лежат лентой: её тянут мышью или пальцем, листают миниатюрами, точками, клавишами ← →
   и горизонтальной прокруткой тачпада (вертикальная прокрутка остаётся странице). Лента идёт плавно, с инерцией,
   картинка внутри экрана сдвигается медленнее самого экрана (параллакс); отпустили — лента доводится до ближайшего сайта.
   Миниатюры, точки и полоска внизу следуют за текущим сайтом. Кадры считаются, только пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-homes]');
  if (!sec) return;
  var slides = Array.prototype.slice.call(sec.querySelectorAll('.homes__slide'));
  var imgs = slides.map(function (s) { return s.querySelector('.homes__img'); });
  /* фон-подложка на телефоне — тот же экран, размытый (CSS) */
  slides.forEach(function (s, i) { s.style.setProperty('--bg', 'url(' + imgs[i].getAttribute('src') + ')'); });
  var thumbs = Array.prototype.slice.call(sec.querySelectorAll('.homes__thumb'));
  var dots = Array.prototype.slice.call(sec.querySelectorAll('.homes__dot'));
  var fill = sec.querySelector('.homes__bar-fill');
  var N = slides.length;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var target = 0, pos = 0, shown = -1, visible = false, raf = 0;
  fill.style.width = (100 / N) + '%';

  var mod = function (a, n) { return ((a % n) + n) % n; };
  var wrap = function (d) { d = mod(d + N / 2, N) - N / 2; return d; };   // ближайшее смещение по кругу

  /* текущий сайт: светлая миниатюра и вытянутая точка */
  var setActive = function (i) {
    if (i === shown) return;
    shown = i;
    thumbs.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    dots.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  };

  var render = function () {
    slides.forEach(function (s, i) {
      var off = wrap(i - pos);
      var far = Math.abs(off) > 1.2;
      s.style.visibility = far ? 'hidden' : 'visible';
      if (far) return;
      s.style.transform = 'translate3d(' + (off * 100).toFixed(3) + '%,0,0)';
      /* в покое экран виден целиком, без обрезки; в движении — чуть крупнее, чтобы параллакс не открывал края */
      imgs[i].style.transform = 'translate3d(' + (-off * 20).toFixed(3) + '%,0,0) scale(' + (1 + 0.42 * Math.abs(off)).toFixed(4) + ')';
    });
    fill.style.transform = 'translate3d(' + (mod(pos, N) * 100).toFixed(3) + '%,0,0)';
    setActive(mod(Math.round(pos), N));
  };

  var frame = function () {
    raf = 0;
    pos += (target - pos) * (reduce ? 1 : 0.085);
    if (Math.abs(target - pos) < 0.0005) pos = target;
    render();
    if (visible && (pos !== target || drag.on)) raf = requestAnimationFrame(frame);
  };
  var kick = function () { if (!raf && visible) raf = requestAnimationFrame(frame); };
  var go = function (i) { target = Math.round(i); kick(); };

  /* миниатюры и точки */
  thumbs.concat(dots).forEach(function (b, k) { b.addEventListener('click', function () { go(target + wrap(k % N - mod(target, N))); }); });

  /* перетаскивание: по горизонтали — лента, по вертикали — прокрутка страницы */
  var drag = { on: false, x: 0, y: 0, decided: false, start: 0, v: 0, lastX: 0, lastT: 0 };
  sec.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || e.target.closest('button')) return;
    drag = { on: true, x: e.clientX, y: e.clientY, decided: e.pointerType === 'mouse', start: target, v: 0, lastX: e.clientX, lastT: performance.now(), id: e.pointerId };
    if (drag.decided) { sec.setPointerCapture(e.pointerId); sec.classList.add('is-drag'); }
  });
  sec.addEventListener('pointermove', function (e) {
    if (!drag.on) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.decided) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      drag.decided = true;
      if (Math.abs(dy) > Math.abs(dx)) { drag.on = false; return; }
      sec.setPointerCapture(e.pointerId); sec.classList.add('is-drag');
    }
    var now = performance.now(), w = sec.clientWidth;
    drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT);
    drag.lastX = e.clientX; drag.lastT = now;
    target = drag.start - dx / w * 1.15;
    kick();
  });
  var release = function (e) {
    if (!drag.on) return;
    drag.on = false;
    sec.classList.remove('is-drag');
    if (sec.hasPointerCapture && sec.hasPointerCapture(e.pointerId)) sec.releasePointerCapture(e.pointerId);
    go(target - drag.v * 0.35);                                // бросок — с небольшой инерцией
  };
  sec.addEventListener('pointerup', release);
  sec.addEventListener('pointercancel', release);

  /* горизонтальная прокрутка тачпада листает ленту; вертикальная — страницу */
  var wheelTimer = 0;
  sec.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    target += e.deltaX / sec.clientWidth;
    kick();
    clearTimeout(wheelTimer); wheelTimer = setTimeout(function () { go(target); }, 140);
  }, { passive: false });

  /* клавиши ← →, пока страница на экране */
  document.addEventListener('keydown', function (e) {
    if (!visible || e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') go(Math.round(target) - 1);
    if (e.key === 'ArrowRight') go(Math.round(target) + 1);
  });

  render();
  new IntersectionObserver(function (en) { visible = en[0].intersectionRatio > 0.5; if (visible) kick(); }, { threshold: [0, 0.5, 1] }).observe(sec);
})();
