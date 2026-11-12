/* «Мой подход», вторая карточка → «Как решаю я»: вместо фото — стеклянная прозрачная ёмкость со статуэткой внутри
   (по мотивам «3D Glass Portal Card», codrops / akella). Ёмкость сама медленно поворачивается — видна её глубина:
   статуэтка смещается относительно стенок, блик скользит по переднему стеклу; от указателя мыши — лёгкий наклон.
   Двигается, только пока карточка открыта и видна. */
(function () {
  'use strict';
  var host = document.querySelector('[data-portal]');
  if (!host) return;
  var card = host.querySelector('.portal__card');
  /* объём статуэтки: за лицевым слоем — стопка копий, каждая чуть глубже и темнее; при повороте видна толщина
     металла, и фигура (со звездой) не становится плоской полоской */
  var award = host.querySelector('.portal__award'), front = award && award.querySelector('img');
  if (award && front) {
    var LAYERS = 12, STEP = 0.9;                              // слоёв и шаг в «единицах» макета
    for (var i = LAYERS; i >= 1; i--) {
      var l = front.cloneNode(false);
      l.classList.remove('is-front');
      l.style.transform = 'translateZ(calc(' + (-i * STEP) + ' * var(--u)))';
      l.style.filter = 'brightness(' + (0.78 - i * 0.03).toFixed(2) + ') saturate(1.15)';
      award.insertBefore(l, front);
    }
    front.style.transform = 'translateZ(calc(' + (STEP * 0.5) + ' * var(--u)))';
  }
  var back = host.closest('.apx__back');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = 0, inView = false, t0 = 0;
  var ptr = { x: 0, y: 0 }, tilt = { x: 0, y: 0 };
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) / r.width * 2 - 1; ptr.y = (e.clientY - r.top) / r.height * 2 - 1;
  });
  if (fine) host.addEventListener('pointerleave', function () { ptr.x = 0; ptr.y = 0; });

  var want = false;
  var isOpen = function () { return want || (back && back.style.visibility !== 'hidden' && (parseFloat(back.style.opacity) || 0) > 0.02); };
  var frame = function (now) {
    raf = 0;
    if (!inView || !isOpen()) return;
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    tilt.x += (ptr.x - tilt.x) * 0.05; tilt.y += (ptr.y - tilt.y) * 0.05;
    /* медленное покачивание: по горизонтали шире, по вертикали чуть-чуть — без рывков */
    var ry = Math.sin(t * 0.55) * 17 + tilt.x * 8;           // не поворачивается ребром — фигура всегда читается
    var rx = Math.sin(t * 0.37 + 1.2) * 6 - tilt.y * 7;
    card.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    card.style.setProperty('--sheen', (50 - ry * 2.2).toFixed(1) + '%');   // блик скользит вслед за поворотом
  };
  var check = function () { if (inView && !raf && isOpen()) raf = requestAnimationFrame(frame); };
  if (reduce) { card.style.transform = 'rotateY(-12deg)'; return; }
  var slide = host.closest('.apx__slide');
  if (slide) slide.addEventListener('apx:card', function (e) {
    want = e.detail.open;
    if (want) { t0 = 0; check(); }                             // каждый раз — с ровного положения, плавно
  });
  new IntersectionObserver(function (e) { inView = e[0].isIntersecting; check(); }, { threshold: 0 }).observe(host);
})();
