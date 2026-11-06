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

  var SPEED = 1.5, SENSITIVITY = 5, GAP = 0.34; // 9° в секунду — полный оборот за 40 секунд; зазор — доля высоты плашки
  var degPerSec = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SPEED * 6;
  var radius = 0, rotY = 0, vel = 0, last = 0, raf = 0, visible = false;
  var drag = { active: false, x: 0, y: 0, decided: false, horizontal: false };
  var ratios = Array.prototype.map.call(items, function (el) { return parseFloat(el.getAttribute('data-ratio')) || 0.75; });

  /* Симметрия: широкие плашки (экраны сайтов, 16:9) стоят на кольце через равные углы
     (при четырёх — ровно через 90°), а обычные карточки между ними разложены с равными зазорами.
     Радиус — из общей длины всех плашек с зазорами. */
  var geometry = function (h) {
    var widths = ratios.map(function (r) { return h * r; });
    var total = widths.reduce(function (s, w) { return s + w + h * GAP; }, 0);
    var R = total / (2 * Math.PI);
    var deg = function (len) { return len / R * 180 / Math.PI; };
    var angles = [], anchors = [];
    ratios.forEach(function (r, i) { if (r > 1.2) anchors.push(i); });
    if (anchors.length < 2) {
      var arc = 0;
      widths.forEach(function (w, i) { angles[i] = deg(arc + (w + h * GAP) / 2); arc += w + h * GAP; });
    } else {
      var step = 360 / anchors.length;
      anchors.forEach(function (ai, k) {
        var next = anchors[(k + 1) % anchors.length];
        var base = k * step;
        angles[ai] = base;
        var between = [];
        for (var i = (ai + 1) % count; i !== next; i = (i + 1) % count) between.push(i);
        var used = widths[ai] / 2 + widths[next] / 2 + between.reduce(function (s, i) { return s + widths[i]; }, 0);
        var gap = ((step / 180 * Math.PI * R) - used) / (between.length + 1);
        var pos = widths[ai] / 2 + gap;
        between.forEach(function (i) { angles[i] = base + deg(pos + widths[i] / 2); pos += widths[i] + gap; });
      });
    }
    return { widths: widths, R: R, angles: angles };
  };

  /* Самая широкая проекция кольца на экран при любом повороте (с учётом перспективы) */
  var PERSPECTIVE = 3000;
  var halfExtent = function (g) {
    var m = 0;
    for (var t = 0; t < 360; t += 2) {
      g.angles.forEach(function (a0, i) {
        var a = (a0 + t) * Math.PI / 180, e = g.widths[i] / 2;
        [-e, e].forEach(function (ex) {
          var x = ex * Math.cos(a) + g.R * Math.sin(a);
          var z = -ex * Math.sin(a) + g.R * Math.cos(a) - g.R;
          if (PERSPECTIVE - z > 1) m = Math.max(m, Math.abs(x * PERSPECTIVE / (PERSPECTIVE - z)));
        });
      });
    }
    return m;
  };

  /* Самая высокая проекция по вертикали с учётом наклона колеса (rotateX −10°):
     задний ряд поднимается — он не должен заходить на заголовок */
  var TILT = -10 * Math.PI / 180;
  var vertical = function (g, h) {
    var up = 0, down = 0;
    for (var t = 0; t < 360; t += 6) {
      g.angles.forEach(function (a0) {
        var a = (a0 + t) * Math.PI / 180;
        var z = g.R * Math.cos(a) - g.R;
        [-h / 2, h / 2].forEach(function (y) {
          var y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
          var z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
          if (PERSPECTIVE - z2 > 1) { var p = y2 * PERSPECTIVE / (PERSPECTIVE - z2); up = Math.max(up, -p); down = Math.max(down, p); }
        });
      });
    }
    return { up: up, down: down };
  };

  /* Подбор высоты плашек: кольцо целиком помещается между полями и по высоте сцены */
  var layout = function () {
    var availW = stage.clientWidth, availH = stage.clientHeight;
    /* на телефоне кольцо целиком было бы крошечным — там оно шире экрана, видны 3–4 передние работы */
    var spread = stage.clientWidth < 700 ? 2.4 : 1;
    var lo = 20, hi = availH;
    for (var n = 0; n < 22; n++) {
      var mid = (lo + hi) / 2;
      var gm = geometry(mid);
      var v = vertical(gm, mid);
      if (halfExtent(gm) * 2 <= availW * spread && v.up + v.down <= availH) lo = mid; else hi = mid;
    }
    var h = Math.floor(lo);
    ring.style.height = h + 'px';
    /* задний ряд поднят наклоном — сдвигаем колесо так, чтобы его видимая фигура стояла
       ровно посередине между заголовком и кнопкой */
    var vv = vertical(geometry(h), h);
    stage.querySelector('.works__tilt').style.translate = '0 ' + ((vv.up - vv.down) / 2) + 'px';
    var g = geometry(h);
    radius = g.R;
    items.forEach(function (el, i) {
      var w = g.widths[i];
      el.style.width = w + 'px';
      el.style.marginLeft = (-w / 2) + 'px';
      el.style.transform = 'rotateY(' + g.angles[i] + 'deg) translateZ(' + radius + 'px)';
    });
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

/* Четвёртый блок «Мой подход» — по примеру Animated clip-path slider Concept (jakewhiteleydev):
   • наведение на фото: снимок сжимается маской (inset 18%), подписи «мой подход» разъезжаются,
     буквы слова слетаются в центр, номер сцены переворачивается;
   • смена сцены: новая картинка раскрывается маской — слева снизу вверх, справа сверху вниз
     (назад — наоборот) и одновременно чуть уменьшается с 1.2 до 1;
   • пока блок на экране и курсор не над ним, сцены листаются сами каждые 6 секунд. */
(function () {
  'use strict';
  var root = document.querySelector('[data-approach]');
  if (!root || !window.gsap) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var sides = root.querySelectorAll('.ap__side');
  var photoSlides = Array.prototype.slice.call(sides[0].querySelectorAll('.ap__slide'));
  var total = photoSlides.length;
  var current = 0;

  /* разлёт букв: симметрично от центра, как $sceneOffsets в примере (−300% … 300%) */
  photoSlides.forEach(function (slide) {
    var letters = slide.querySelectorAll('.ap__word span');
    var mid = (letters.length - 1) / 2;
    letters.forEach(function (l, i) { gsap.set(l, { xPercent: (i - mid) * 150, y: '-3rem', opacity: 0 }); });
  });

  var hoverTl = photoSlides.map(function (slide) {
    var more = slide.querySelectorAll('.ap__more');
    var tl = gsap.timeline({ paused: true, defaults: { duration: 1.1, ease: 'power2.inOut' } });
    tl.to(slide.querySelector('.ap__img'), { clipPath: 'inset(18%)', scale: 0.95 }, 0)
      .to(more[0], { x: '2rem' }, 0)
      .to(more[1], { x: '-2rem' }, 0)
      .to(slide.querySelector('.ap__num'), { y: 0, duration: 1 }, 0.3)
      .to(slide.querySelector('.ap__num'), { opacity: 1 }, 0.4)
      .to(slide.querySelectorAll('.ap__num span'), { rotateY: 0, duration: 1.6 }, 0)
      .to(slide.querySelectorAll('.ap__word span'), { xPercent: 0, y: 0, opacity: 1, duration: 1.2 }, 0.2);
    return tl;
  });

  var hovering = false;
  var side0 = sides[0];
  if (canHover) {
    side0.addEventListener('mouseenter', function () { hovering = true; hoverTl[current].play(); });
    side0.addEventListener('mouseleave', function () { hovering = false; hoverTl[current].reverse(); });
  }

  var busy = false;
  var go = function (dir) {
    if (busy) return;
    busy = true;
    /* на каждую смену — свой таймлайн: так сцены всегда сменяются полностью */
    var navTl = gsap.timeline({ onComplete: function () { busy = false; } });
    hoverTl[current].reverse();
    var next = (current + dir + total) % total;
    sides.forEach(function (side, k) {
      var slides = side.querySelectorAll('.ap__slide');
      var active = slides[current], incoming = slides[next];
      /* вперёд: левая половина раскрывается снизу, правая сверху; назад — наоборот */
      var fromBottom = dir > 0 ? k === 0 : k === 1;
      var clip = fromBottom ? 'inset(100% 0% 0%)' : 'inset(0% 0% 100%)';
      active.classList.remove('active');
      incoming.classList.add('active');
      gsap.set(incoming, { autoAlpha: 1, zIndex: 3, scale: reduce ? 1 : 1.2, clipPath: reduce ? 'inset(0% 0% 0%)' : clip });
      gsap.set(active, { zIndex: 2 });
      navTl.to(incoming, {
        clipPath: 'inset(0% 0% 0%)', scale: 1, ease: 'power2.inOut', duration: reduce ? 0.01 : 1,
        onComplete: function () { gsap.set(active, { autoAlpha: 0, zIndex: 1 }); gsap.set(incoming, { zIndex: 2 }); }
      }, 0);
    });
    current = next;
    /* на телефоне наведения нет — надписи на фото показываются сами и прячутся перед сменой */
    if (!canHover && !reduce) gsap.delayedCall(1.1, function () { hoverTl[current].play(); });
    else if (hovering) gsap.delayedCall(1, function () { if (hovering) hoverTl[current].play(); });
  };

  /* стартовое состояние: видна только первая сцена */
  sides.forEach(function (side) {
    side.querySelectorAll('.ap__slide').forEach(function (s, i) { gsap.set(s, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1 }); });
  });

  var frame = root.parentNode;
  frame.querySelector('.js-next').addEventListener('click', function () { go(1); restart(); });
  frame.querySelector('.js-prev').addEventListener('click', function () { go(-1); restart(); });

  /* автолистание, пока блок виден и курсор не над слайдером */
  var timer = 0, inView = false, over = false;
  var tick = function () { if (inView && !over && !reduce) go(1); };
  var restart = function () { clearInterval(timer); timer = setInterval(tick, 6000); };
  root.addEventListener('mouseenter', function () { over = true; });
  root.addEventListener('mouseleave', function () { over = false; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      inView = e[0].isIntersecting;
      if (inView && !canHover && !reduce) hoverTl[current].play();
    }, { threshold: 0.5 }).observe(root);
  }
  restart();
})();
