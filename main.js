(function () {
  'use strict';
  /* Типограф: предлоги и союзы переносятся вместе со следующим словом */
  var SHORT = 'а|в|во|и|к|о|об|от|до|по|за|из|у|с|со|не|ни|но|на|для|без|как|где|что|чтобы|через|или|при|под|над|про|я|мы|вы';
  var re = new RegExp('(^|[\\s\\u00a0(«"—])(' + SHORT + ')\\s+', 'gi');
  var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
  while ((n = tw.nextNode())) {
    if (/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)) continue;
    n.nodeValue = n.nodeValue.replace(re, function (m, p, w) { return p + w + ' '; })
                             .replace(re, function (m, p, w) { return p + w + ' '; });
  }
})();

document.documentElement.classList.replace('no-js', 'js');

/* Побуквенное появление надписей: каждая буква — свой span с порядковым номером --i,
   слова не разрываются при переносе. Следующий абзац группы начинается с паузой. */
(function () {
  'use strict';
  document.querySelectorAll('.says, .about__name').forEach(function (group) {
    var i = 0, prev = null;
    group.querySelectorAll('.say__line, .about__name-line').forEach(function (line) {
      var block = line.closest('.say') || group;
      if (prev && block !== prev) i += 6;
      prev = block;
      Array.prototype.slice.call(line.childNodes).forEach(function (node) {
        if (node.nodeType === 1 && node.classList.contains('cap')) {
          node.classList.add('ch'); node.style.setProperty('--i', i++); return;
        }
        if (node.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        node.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part.indexOf('\u00a0') > -1 ? '\u00a0' : ' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          Array.from(part).forEach(function (c) {
            var s = document.createElement('span'); s.className = 'ch'; s.textContent = c;
            s.style.setProperty('--i', i++); w.appendChild(s);
          });
          frag.appendChild(w);
        });
        line.replaceChild(frag, node);
      });
    });
  });
})();

/* Появление второго блока — одна синхронная цепочка.
   На компьютере блок помещается в окно целиком, поэтому всё запускается разом, когда блок
   въехал на треть: имя по буквам, подпись, «20+», карточки слева направо, подпись и плашки.
   На телефоне блок длинный — там каждый элемент проявляется, когда до него докрутили. */
(function () {
  'use strict';
  var about = document.querySelector('.about');
  var items = about ? Array.prototype.slice.call(about.querySelectorAll('[data-reveal]')) : [];
  if (!items.length) return;
  var show = function (el) { el.classList.add('is-in'); };
  if (!('IntersectionObserver' in window)) { items.forEach(show); return; }

  var order = ['.about__name', '.about__adapt', '.about__count', '.tile--portrait', '.tile--photo', '.case-card', '.about__hook', '.tags'];
  var step = 0.12;
  var desktop = !window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;

  if (desktop) {
    order.forEach(function (sel, n) {
      var el = about.querySelector(sel);
      if (!el) return;
      el.style.setProperty('--d', (n * step).toFixed(2) + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { items.forEach(show); io.disconnect(); }
    }, { threshold: 0.33 });
    io.observe(about);
  } else {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { show(e.target); io2.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io2.observe(el); });
  }
})();

/* Параллакс в духе Osmo: слоям с data-parallax="layer" внутри data-parallax="trigger"
   задаётся смещение от data-parallax-start до data-parallax-end (в % своей высоты)
   за время прокрутки триггера. Плюс плавная прокрутка Lenis. */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('[data-parallax="trigger"]').forEach(function (trigger) {
    var layers = trigger.querySelectorAll('[data-parallax="layer"]');
    if (!layers.length) layers = [trigger];
    layers.forEach(function (layer) {
      var prop = layer.getAttribute('data-parallax-direction') === 'horizontal' ? 'xPercent' : 'yPercent';
      var start = parseFloat(layer.getAttribute('data-parallax-start') || '0');
      var end = parseFloat(layer.getAttribute('data-parallax-end') || '-20');
      var from = {}, to = { ease: 'none' };
      from[prop] = start; to[prop] = end;
      to.scrollTrigger = {
        trigger: trigger,
        start: 'clamp(' + (layer.getAttribute('data-parallax-scroll-start') || 'top top') + ')',
        end: layer.getAttribute('data-parallax-scroll-end') || 'bottom top',
        scrub: true
      };
      gsap.fromTo(layer, from, to);
    });
  });
  /* Глубина фото, как в nikonovphoto (Osmo Parallax Image Layers): слои уезжают с разной скоростью.
     Комната почти стоит на месте, надпись за головой отстаёт и гаснет, Людмила едет почти со страницей. */
  var stage = document.querySelector('.stage');
  var room = document.querySelector('[data-depth="room"]');
  var person = document.querySelector('[data-depth="person"]');
  var text = document.querySelector('[data-depth="text"]');
  var desktop = !window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  if (stage && room && person) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom top', scrub: true } });
    tl.to(room, { yPercent: desktop ? 70 : 18, ease: 'none', duration: 1 }, 0)
      .to(person, { yPercent: desktop ? 10 : 4, ease: 'none', duration: 1 }, 0);
    if (text && desktop) {
      tl.to(text, { yPercent: 40, ease: 'none', duration: 1 }, 0)
        .to(text, { opacity: 0, ease: 'power1.in', duration: 0.6 }, 0);
    }

    /* На компьютере главная — один экран без прокрутки, поэтому слои отзываются на курсор:
       комната почти стоит, Людмила смещается сильнее, тексты — сильнее всего */
    if (desktop && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var depth = [
        { el: room, k: 10 },
        { el: document.querySelector('[data-depth="text"]'), k: 16 },
        { el: person, k: 30 }
      ].filter(function (d) { return d.el; }).map(function (d) {
        return {
          k: d.k,
          x: gsap.quickTo(d.el, 'x', { duration: 1.2, ease: 'power3.out' }),
          y: gsap.quickTo(d.el, 'y', { duration: 1.2, ease: 'power3.out' })
        };
      });
      var move = function (nx, ny) { depth.forEach(function (d) { d.x(nx * d.k); d.y(ny * d.k * .6); }); };
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        move((e.clientX - r.left) / r.width - .5, (e.clientY - r.top) / r.height - .5);
      });
      stage.addEventListener('pointerleave', function () { move(0, 0); });
    }
  }

  /* Портрет во втором блоке: снимок чуть увеличен и плывёт внутри квадрата */
  document.querySelectorAll('[data-inner-parallax]').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none',
      scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* Второй блок: карточки стоят ровно по общим линиям, двигаются только снимки внутри —
     фон-фото второй карточки плывёт медленнее страницы, как и портрет */
  var bg = document.querySelector('.tile__bg');
  if (bg) gsap.fromTo(bg, { yPercent: -2.5 }, { yPercent: 2.5, ease: 'none',
    scrollTrigger: { trigger: bg.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

/* Третий блок: кольцо из плашек с работами — Round Carousel (Originkit), без React.
   Кольцо медленно крутится само, его можно потянуть мышью или пальцем (с инерцией),
   изнанка плашек приглушена. Пока блок вне экрана — анимация на паузе. */
(function () {
  'use strict';
  var stage = document.querySelector('[data-works]');
  if (!stage) return;
  var ring = stage.querySelector('.works__ring');
  var items = ring.querySelectorAll('.works__item');
  var count = items.length;
  if (!count) return;

  var SPACING = 3, SPEED = 7, SENSITIVITY = 5;
  var angle = 360 / count;
  var degPerSec = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SPEED * 6;
  var radius = 0, rotY = 0, vel = 0, last = 0, raf = 0, visible = false;
  var drag = { active: false, x: 0, y: 0, decided: false, horizontal: false };

  var layout = function () {
    var w = ring.offsetWidth; // размер без 3D-проекции
    radius = (w * (1 + SPACING * 0.15)) / (2 * Math.tan(Math.PI / count));
    items.forEach(function (el, i) { el.style.transform = 'rotateY(' + (i * angle) + 'deg) translateZ(' + radius + 'px)'; });
    apply();
  };
  var apply = function () { ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateY(' + rotY + 'deg)'; };

  var tick = function (now) {
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (!drag.active) {
      if (Math.abs(vel) > 0.01) { rotY += vel * dt; vel *= 0.94; }
      else { rotY += degPerSec * dt; }
    }
    apply();
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  var start = function () { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };

  /* тянем по горизонтали; вертикальное движение пальца оставляем прокрутке страницы */
  stage.addEventListener('pointerdown', function (e) {
    drag = { active: true, x: e.clientX, y: e.clientY, decided: e.pointerType === 'mouse', horizontal: e.pointerType === 'mouse' };
    vel = 0;
    if (drag.horizontal) { stage.setPointerCapture(e.pointerId); stage.classList.add('is-dragging'); }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag.active) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.decided) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      drag.decided = true; drag.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!drag.horizontal) { drag.active = false; return; }
      stage.setPointerCapture(e.pointerId); stage.classList.add('is-dragging');
    }
    drag.x = e.clientX; drag.y = e.clientY;
    var k = 0.1 * SENSITIVITY; // 0,5° на пиксель: плавнее, чем в оригинале (1,5°)
    rotY += dx * k; vel = dx * k * 60;
  });
  var end = function (e) {
    if (stage.hasPointerCapture && stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    drag.active = false; stage.classList.remove('is-dragging');
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  layout();
  window.addEventListener('resize', layout);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }, { rootMargin: '100px' }).observe(stage);
  } else { visible = true; start(); }
})();
