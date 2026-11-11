/* Сайт всегда открывается с главного экрана: без восстановления прокрутки и без перехода по #якорю из адреса */
(function () {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  var toTop = function () { window.scrollTo(0, 0); if (window.lenis) window.lenis.scrollTo(0, { immediate: true, force: true }); };
  toTop();
  window.addEventListener('DOMContentLoaded', toTop);
  window.addEventListener('load', function () { toTop(); setTimeout(toTop, 0); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) toTop(); });

  /* Окно перешло через границу «телефон / компьютер» (открыли узким и растянули или наоборот):
     блоки собраны под другую раскладку — страницы кейса легли бы друг на друга, закрепления не сработали бы.
     Перезагружаем страницу и возвращаемся к тому же блоку. */
  var KEY = 'lud-return';
  var back = null;
  try { back = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
  if (back) {
    window.addEventListener('load', function () {
      var go = function () {
        var el = document.getElementById(back);
        if (!el) return;
        var st = window.ScrollTrigger && window.ScrollTrigger.getAll().filter(function (t) { return t.trigger === el && t.pin; })[0];
        var y = st ? st.start : el.getBoundingClientRect().top + window.pageYOffset;   // закреплённый блок — с его первой страницы
        if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      };
      /* раскладка дозревает по мере загрузки картинок — подравниваемся, пока человек сам не начал крутить */
      var userMoved = false, tries = 0;
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { window.addEventListener(ev, function () { userMoved = true; }, { once: true, passive: true }); });
      var loop = function () { if (userMoved || tries++ > 16) return; go(); setTimeout(loop, 250); };
      setTimeout(loop, 150);
    });
  }
  var bp = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)');
  var was = bp.matches, bpTimer = null, here = '', hereTick = false;
  /* какой блок сейчас на экране — запоминаем заранее: после растягивания окна раскладка уже другая */
  window.addEventListener('scroll', function () {
    if (hereTick || bp.matches !== was) return;
    hereTick = true;
    requestAnimationFrame(function () {
      hereTick = false;
      var mid = window.innerHeight / 2;
      document.querySelectorAll('main section[id]')   /* закреплённые блоки завёрнуты в pin-spacer */.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) here = s.id;
      });
    });
  }, { passive: true });
  var onBp = function () {
    clearTimeout(bpTimer);
    bpTimer = setTimeout(function () {
      if (bp.matches === was) return;
      try { if (here) sessionStorage.setItem(KEY, here); } catch (e) {}
      location.reload();
    }, 350);
  };
  if (bp.addEventListener) bp.addEventListener('change', onBp); else if (bp.addListener) bp.addListener(onBp);
})();
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
  document.querySelectorAll('.says, .about__name, .apx__answer').forEach(function (group) {
    var i = 0, prev = null;
    group.querySelectorAll('.say__line, .about__name-line, .apx__line').forEach(function (line) {
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
    window.lenis = lenis; // нужен меню для плавного перехода к блокам
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(250, 33); // после долгого кадра анимации не «прыгают» вперёд, а чуть притормаживают
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

/* Четвёртый блок «Мой подход» (макет «п-р 20»): квадрат с текстом сцены.
   Анимация — из примера Animated clip-path slider Concept (jakewhiteleydev, CodePen):
   • наведение: квадрат сужается маской с 680 до 480 (inset 14.7%), подписи «мой подход»
     разъезжаются, буквы главной мысли слетаются, номер сцены переворачивается;
   • смена сцены: новая раскрывается маской снизу вверх (назад — сверху вниз) и уменьшается с 1.2 до 1;
   • автолистание каждые 6 секунд, пока блок на экране и курсор не над квадратом. */
(function () {
  'use strict';
  var root = document.querySelector('[data-approach]');
  if (!root || !window.gsap) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slides = Array.prototype.slice.call(root.querySelectorAll('.apx__slide'));
  var total = slides.length;
  var frame = root.closest('.approach__frame');
  var cur = frame.querySelector('.apx__cur');
  var current = 0, busy = false, over = false, inView = false;
  var section = root.closest('.approach');
  /* у каждой сцены своя пара цветов: фон блока и текст + цвет квадрата и его текста */
  var THEMES = [
    { bg: '#A1998F', ink: '#182C31', sq: '#182C31', sqInk: '#EDE8E1' },
    { bg: '#C8BDAB', ink: '#182C31', sq: '#A9502C', sqInk: '#E8DCC8' },   // текст на медной плашке — слегка приглушённый, не чисто-белый
    { bg: '#6F7B74', ink: '#F1ECE4', sq: '#EDE8E1', sqInk: '#1C3238' },
    { bg: '#1A2C30', ink: '#E8DCC8', sq: '#C8BDAB', sqInk: '#1A2C30' }
  ];
  var theme = function (i) { return THEMES[i % THEMES.length]; };

  gsap.set(section, { '--bg': theme(0).bg, '--ink': theme(0).ink });
  slides.forEach(function (s, i) {
    gsap.set(s, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1, '--sq': theme(i).sq, '--sq-ink': theme(i).sqInk });
    var letters = s.querySelectorAll('.apx__word span');
    var mid = (letters.length - 1) / 2;
    letters.forEach(function (l, k) { gsap.set(l, { xPercent: (k - mid) * 150, y: '-2rem', opacity: 0 }); });
  });

  var hoverTl = slides.map(function (s) {
    var more = s.querySelectorAll('.apx__more');
    var num = s.querySelector('.apx__num');
    return gsap.timeline({ paused: true, defaults: { duration: 1.1, ease: 'power2.inOut' } })
      .to(s.querySelector('.apx__card'), { clipPath: 'inset(14.7%)', scale: 0.97 }, 0)
      .to(s.querySelector('.apx__front'), { autoAlpha: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 0)
      .fromTo(s.querySelector('.apx__back'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0.45)
      .from(s.querySelector('.apx__back img'), { scale: 1.15, duration: 1.2, ease: 'power2.out' }, 0.45)
      .from(s.querySelector('.apx__solution'), { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power2.out' }, 0.7)
      .to(more[0], { x: '1.5rem', opacity: 1 }, 0)
      .to(more[1], { x: '-1.5rem', opacity: 1 }, 0)
      .to(num, { y: 0, duration: 1 }, 0.3)
      .to(num, { opacity: 1 }, 0.4)
      .to(num.querySelectorAll('span'), { rotateY: 0, duration: 1.6 }, 0)
      .to(s.querySelectorAll('.apx__word span'), { xPercent: 0, y: 0, opacity: 1, duration: 1.2 }, 0.2);
  });

  /* нажатие на карточку: она сужается и показывает фото и решение Людмилы; повторное — возвращает проблему */
  var opened = false;
  var setOpen = function (v) {
    opened = v;
    var card = slides[current].querySelector('.apx__card');
    var hintBtn = card.querySelector('.js-open');
    if (hintBtn) hintBtn.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) hoverTl[current].timeScale(1).play(); else hoverTl[current].timeScale(1.4).reverse();
  };
  var showMeaning = function () {};
  slides.forEach(function (s) {
    var card = s.querySelector('.apx__card');
    /* клик по лицевой стороне открывает; на обороте — только кнопки, чтобы было ясно, что делать */
    card.addEventListener('click', function (e) {
      if (e.target.closest('.js-close')) { setOpen(false); restart(); return; }
      if (e.target.closest('.js-card-next')) { go(1); restart(); return; }
      if (!opened) { setOpen(true); restart(); }
    });
  });
  root.addEventListener('mouseenter', function () { over = true; });
  root.addEventListener('mouseleave', function () { over = false; });

  var go = function (dir) {
    if (busy) return;
    busy = true;
    var next = (current + dir + total) % total;
    var active = slides[current], incoming = slides[next];
    if (opened) { opened = false; var hb = active.querySelector('.js-open'); if (hb) hb.setAttribute('aria-expanded', 'false'); }
    hoverTl[current].timeScale(1.4).reverse();
    active.classList.remove('active');
    incoming.classList.add('active');
    gsap.set(active, { zIndex: 2 });
    gsap.set(incoming, { autoAlpha: 1, zIndex: 3, scale: reduce ? 1 : 1.2,
      clipPath: reduce ? 'inset(0% 0% 0%)' : (dir > 0 ? 'inset(100% 0% 0%)' : 'inset(0% 0% 100%)') });
    gsap.to(section, { '--bg': theme(next).bg, '--ink': theme(next).ink, duration: reduce ? 0.01 : 1.1, ease: 'power2.inOut' });
    if (window.approachTitleReform) window.approachTitleReform(); /* заголовок из частиц пересобирается новым цветом */
    if (window.approachBgReform) window.approachBgReform();
    gsap.to(incoming, { clipPath: 'inset(0% 0% 0%)', scale: 1, ease: 'power2.inOut', duration: reduce ? 0.01 : 1,
      onComplete: function () {
        gsap.set(active, { autoAlpha: 0, zIndex: 1 }); gsap.set(incoming, { zIndex: 2, clearProps: 'clipPath' });
        busy = false; showMeaning();
        if (wanted !== current) go(wanted > current ? 1 : -1); /* прокрутили дальше, пока шла смена — догоняем */
      } });
    current = next;
    if (cur) cur.textContent = String(current + 1).padStart(2, '0');
  };

  frame.querySelector('.js-next').addEventListener('click', function () { go(1); restart(); });
  frame.querySelector('.js-prev').addEventListener('click', function () { go(-1); restart(); });

  var timer = 0;
  var restart = function () { clearInterval(timer); timer = setInterval(function () { if (inView && !over && !opened && !reduce) go(1); }, 6000); };
  if ('IntersectionObserver' in window) {
    var answer = frame.querySelector('.apx__answer');
    new IntersectionObserver(function (e) {
      inView = e[0].isIntersecting;
      if (inView) { showMeaning(); if (answer) answer.classList.add('is-in'); }
    }, { threshold: 0.4 }).observe(root);
  }
  restart();

  /* Компьютер: блок закрепляется на экране, и прокрутка колёсиком листает сцены 01→04;
     после четвёртой страница едет дальше. Автолистание тогда не нужно — сцену задаёт прокрутка. */
  var wanted = 0;
  var stackedMq = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)');
  if (window.ScrollTrigger && !stackedMq.matches && !reduce) {
    clearInterval(timer);
    restart = function () {};
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: '+=' + (total - 1) * 100 + '%', pin: true, pinSpacing: true,
      onUpdate: function (self) {
        wanted = Math.min(total - 1, Math.floor(self.progress * total * 0.999));
        if (!busy && wanted !== current) go(wanted > current ? 1 : -1);
      }
    });
    /* стрелки и «Дальше» на обороте прокручивают страницу к нужной сцене — прокрутка и сцена не расходятся */
    var st = ScrollTrigger.getAll().filter(function (t) { return t.trigger === section; })[0];
    var jump = function (dir) {
      var n = Math.max(0, Math.min(total - 1, current + dir));
      var y = st.start + (st.end - st.start) * n / Math.max(1, total - 1);   // ровно на начало страницы — там же, куда доводит прокрутка
      if (window.lenis) window.lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    };
    var swap = function (sel, dir) {
      frame.querySelectorAll(sel).forEach(function (el) {
        var clone = el.cloneNode(true); el.parentNode.replaceChild(clone, el);
        clone.addEventListener('click', function (e) { e.stopPropagation(); jump(dir); });
      });
    };
    swap('.js-next', 1); swap('.js-prev', -1); swap('.js-card-next', 1);
  }
})();

/* Заголовок «Мой подход» из частиц — по примеру VoXelo (CodePen, p5.js), переписан на чистый canvas.
   Около двух тысяч частиц-штрихов слетаются в надпись и оставляют тающие следы; когда собрались —
   проявляется настоящий текст, а частицы гаснут. При смене сцены частицы разлетаются и собираются
   заново уже новым цветом: цвет берётся из текущего цвета текста блока (он меняется вместе с фоном). */
(function () {
  'use strict';
  var title = document.querySelector('.approach__title');
  if (!title) return;
  var canvas = title.querySelector('.approach__particles');
  var textEl = title.querySelector('.approach__title-text');
  var section = title.closest('.approach');
  if (!canvas || !canvas.getContext || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* на компьютере заголовок обычный — частицы там летают крупно на заднем плане (код ниже) */
  if (!window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches) return;
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var color = '', W = 0, H = 0, padX = 0, padY = 0, targets = [], parts = [], raf = 0, calm = 0, started = false, scale = 1;
  var MAX = 1100; // меньше частиц — легче для телефона, надпись так же читается

  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* точки надписи: рисуем каждый символ тем же шрифтом и в том же месте, что и настоящий текст */
  var buildTargets = function () {
    padX = -canvas.offsetLeft; padY = -canvas.offsetTop;
    W = Math.ceil(textEl.offsetWidth + padX * 2); H = Math.ceil(textEl.offsetHeight + padY * 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var o = off.getContext('2d');
    var cr = canvas.getBoundingClientRect();
    var marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    textEl.appendChild(marker);
    var baseY = marker.getBoundingClientRect().top - cr.top;
    marker.remove();
    var walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var st = getComputedStyle(node.parentNode);
      o.font = st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      var upper = st.textTransform === 'uppercase';
      for (var i = 0; i < node.length; i++) {
        var ch = node.data[i];
        if (/\s/.test(ch)) continue;
        var range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
        var rr = range.getBoundingClientRect();
        o.fillText(upper ? ch.toUpperCase() : ch, rr.left - cr.left, baseY);
      }
    }
    var fs = parseFloat(getComputedStyle(textEl).fontSize);
    scale = fs / 77;
    var step = Math.max(2, Math.round(fs / 24));
    var data = o.getImageData(0, 0, W, H).data, pts = [];
    for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
    for (var k = pts.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var t = pts[k]; pts[k] = pts[j]; pts[j] = t; }
    targets = pts.slice(0, MAX);
  };

  var makeParts = function () {
    var s = Math.max(0.6, scale);
    parts = targets.map(function (t) {
      var x = rand(0, W), y = rand(-H * 0.5, H * 1.5);
      return { x: x, y: y, px: x, py: y, vx: 0, vy: 0, tx: t[0], ty: t[1],
        maxSpeed: rand(3, 10) * s, maxForce: rand(0.3, 0.8) * s, size: rand(0.6, 2.2) * s };
    });
  };

  var frame = function () {
    /* следы: каждый кадр стираем 28% нарисованного — фон блока просвечивает, как в примере */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    var moving = 0;
    /* все штрихи — одним путём и одной заливкой: в десятки раз меньше работы для браузера */
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = 1.2 * Math.max(0.6, scale);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var want = d < 40 ? p.maxSpeed * d / 40 : p.maxSpeed; // подлетая, тормозит
      var sx = dx / d * want - p.vx, sy = dy / d * want - p.vy;
      var sm = Math.sqrt(sx * sx + sy * sy);
      if (sm > p.maxForce) { sx = sx / sm * p.maxForce; sy = sy / sm * p.maxForce; }
      p.vx += sx; p.vy += sy;
      var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (v > p.maxSpeed) { p.vx = p.vx / v * p.maxSpeed; p.vy = p.vy / v * p.maxSpeed; }
      if (d < 40) { p.vx *= 0.9; p.vy *= 0.9; }
      p.x += p.vx; p.y += p.vy;
      if (d < 0.6 && v < 0.4) { p.x = p.tx; p.y = p.ty; p.vx = p.vy = 0; }
      if (d > 1.5) moving++;
      if (v > 0.3) { ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); }
      p.px = p.x; p.py = p.y;
    }
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    for (var q = 0; q < parts.length; q++) { var pp = parts[q]; ctx.fillRect(pp.x - pp.size * 0.5, pp.y - pp.size * 0.5, pp.size, pp.size); }
    ctx.globalAlpha = 1;
    /* собрались — проявляем настоящий текст и гасим частицы */
    calm = moving < parts.length * 0.03 ? calm + 1 : 0;
    if (calm > 12) {
      title.classList.remove('is-particles');
      canvas.style.opacity = '0';
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  var run = function () {
    color = getComputedStyle(section).color; // цвет читаем один раз за запуск, а не каждый кадр
    canvas.style.opacity = '1';
    title.classList.add('is-particles');
    calm = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  };

  /* разлёт и сборка заново (вызывается при смене сцены) */
  window.approachTitleReform = function () {
    if (!started) return;
    var s = Math.max(0.6, scale);
    parts.forEach(function (p) {
      var a = rand(0, Math.PI * 2), f = rand(18, 45) * s;
      p.vx = Math.cos(a) * f; p.vy = Math.sin(a) * f;
    });
    run();
    setTimeout(function () { color = getComputedStyle(section).color; }, 600);
    setTimeout(function () { color = getComputedStyle(section).color; }, 1150);
  };

  var start = function () {
    if (started) return;
    started = true;
    buildTargets(); makeParts(); run();
  };
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    title.classList.add('is-particles');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { start(); io.disconnect(); } }, { threshold: 0.6 });
      io.observe(title);
    } else start();
  });
  var rt = 0;
  window.addEventListener('resize', function () {
    if (!started) return;
    clearTimeout(rt);
    rt = setTimeout(function () {
      buildTargets();
      parts.forEach(function (p, i) { var t = targets[i % targets.length]; p.tx = t[0]; p.ty = t[1]; });
      run();
    }, 200);
  });
})();

/* Компьютер: крупное «МОЙ ПОДХОД» из частиц на заднем плане блока — как в примере VoXelo,
   частицы не замирают, а всё время кружат вокруг своих точек и оставляют тающие следы.
   Заголовок блока не трогаем. Цвет — текущий цвет текста блока (меняется вместе со сценой);
   при смене сцены надпись разлетается и собирается заново. На телефоне не работает —
   там частицы собирают сам заголовок (код выше). */
(function () {
  'use strict';
  var section = document.querySelector('.approach');
  var canvas = section && section.querySelector('.approach__bg');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var stacked = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)');
  var ctx = canvas.getContext('2d');
  var dpr = 1; // фон полупрозрачный — чёткость ретины не нужна, а нагрузка вчетверо меньше
  var W = 0, H = 0, parts = [], targets = [], raf = 0, visible = false, built = false, color = '', tick = 0;
  var MAX = 1300;
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  var build = function () {
    W = section.clientWidth; H = section.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var o = off.getContext('2d');
    /* надпись во всю ширину: рукописная «М» и «ОЙ ПОДХОД» прописными */
    var size = W * 0.135;
    var capFont = '400 ' + (size * 1.3) + 'px "Good Vibes Pro", "Great Vibes", cursive';
    var restFont = '500 ' + size + 'px Inter, system-ui, sans-serif';
    o.font = capFont; var capW = o.measureText('М').width;
    o.font = restFont; var restW = o.measureText('ОЙ ПОДХОД').width;
    var total = capW + size * 0.05 + restW;
    var k = Math.min(1, W * 0.94 / total);
    size *= k; capFont = '400 ' + (size * 1.3) + 'px "Good Vibes Pro", "Great Vibes", cursive'; restFont = '500 ' + size + 'px Inter, system-ui, sans-serif';
    o.font = capFont; capW = o.measureText('М').width;
    o.font = restFont; restW = o.measureText('ОЙ ПОДХОД').width;
    total = capW + size * 0.05 + restW;
    var x = (W - total) / 2, y = H * 0.06 + size * 0.78; // крупная надпись — вверху экрана
    o.fillStyle = '#000';
    o.font = capFont; o.fillText('М', x, y);
    o.font = restFont; o.fillText('ОЙ ПОДХОД', x + capW + size * 0.05, y);
    var step = Math.max(3, Math.round(size / 34));
    var data = o.getImageData(0, 0, W, H).data, pts = [];
    for (var yy = 0; yy < H; yy += step) for (var xx = 0; xx < W; xx += step) if (data[(yy * W + xx) * 4 + 3] > 140) pts.push([xx, yy]);
    for (var i = pts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    targets = pts.slice(0, MAX);
    var s = W / 1920;
    if (!parts.length) {
      parts = targets.map(function (t) {
        var px = t[0] + rand(-260, 260) * s, py = t[1] + rand(-220, 220) * s; // стартуют облаком вокруг букв
        return { x: px, y: py, px: px, py: py, vx: 0, vy: 0, tx: 0, ty: 0, a: rand(0, 6.283), r: rand(1.5, 6) * s, sp: rand(0.02, 0.06) * (Math.random() < .5 ? -1 : 1),
          maxSpeed: rand(4, 14) * s, maxForce: rand(0.4, 1) * s, size: rand(0.6, 2.4) * s };
      });
    }
    parts.forEach(function (p, i) { var t = targets[i % targets.length]; p.tx = t[0]; p.ty = t[1]; });
    built = true;
  };

  var frame = function () {
    raf = visible ? requestAnimationFrame(frame) : 0;
    /* фон рисуем через кадр (~30 кадров в секунду) — глазу незаметно, процессору вдвое легче */
    if ((tick++ & 1) === 1) return;
    if (tick % 40 === 0 || !color) color = getComputedStyle(section).color;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = 1.4 * W / 1920;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.a += p.sp * 2;                               // точка-цель медленно кружит — частицы не замирают
      var gx = p.tx + Math.cos(p.a) * p.r, gy = p.ty + Math.sin(p.a) * p.r;
      var dx = gx - p.x, dy = gy - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var want = d < 40 ? p.maxSpeed * d / 40 : p.maxSpeed;
      var sx = dx / d * want - p.vx, sy = dy / d * want - p.vy;
      var sm = Math.sqrt(sx * sx + sy * sy);
      if (sm > p.maxForce) { sx = sx / sm * p.maxForce; sy = sy / sm * p.maxForce; }
      p.vx += sx; p.vy += sy;
      var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (v > p.maxSpeed) { p.vx = p.vx / v * p.maxSpeed; p.vy = p.vy / v * p.maxSpeed; }
      if (d < 40) { p.vx *= 0.9; p.vy *= 0.9; }
      p.x += p.vx * 2; p.y += p.vy * 2;              // шаг вдвое длиннее — скорость та же при 30 кадрах
      ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y);
      p.px = p.x; p.py = p.y;
    }
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    for (var q = 0; q < parts.length; q++) { var pp = parts[q]; ctx.fillRect(pp.x - pp.size * 0.6, pp.y - pp.size * 0.6, pp.size * 1.2, pp.size * 1.2); }
    ctx.globalAlpha = 1;
  };
  var start = function () {
    if (stacked.matches) return;
    if (!built) build();
    if (!raf) raf = requestAnimationFrame(frame);
  };

  window.approachBgReform = function () {
    if (!built || stacked.matches) return;
    var s = W / 1920;
    parts.forEach(function (p) { var a = rand(0, 6.283), f = rand(10, 30) * s; p.vx = Math.cos(a) * f; p.vy = Math.sin(a) * f; });
    setTimeout(function () { color = getComputedStyle(section).color; }, 600);
    setTimeout(function () { color = getComputedStyle(section).color; }, 1150);
  };

  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible) start();
    }, { rootMargin: '100px' }).observe(section);
  });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (!stacked.matches && built) build(); if (visible) start(); }, 200);
  });
})();

/* Шапка: подложка при прокрутке, бургер-меню, плавный переход к блокам */
(function () {
  'use strict';
  var header = document.querySelector('[data-header]');
  var menu = document.getElementById('site-menu');
  if (!header || !menu) return;
  var burger = header.querySelector('.burger');
  var scrim = document.querySelector('.menu-scrim');
  if (scrim) scrim.addEventListener('click', function () { setOpen(false); });
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var setOpen = function (open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add('is-open'); }); }
    else { menu.classList.remove('is-open'); setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700); }
    if (scrim) scrim.classList.toggle('is-on', open); /* окно поверх страницы, прокрутку не блокируем */
  };
  burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setOpen(false); burger.focus(); } });

  /* ссылки на блоки — плавно (через Lenis, если он есть) */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    a.addEventListener('click', function (e) {
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var wasOpen = burger.getAttribute('aria-expanded') === 'true';
      if (wasOpen) setOpen(false);
      var goTo = function () { if (window.lenis) window.lenis.scrollTo(target, { duration: 1.4 }); else target.scrollIntoView({ behavior: 'smooth' }); };
      wasOpen ? setTimeout(goTo, 350) : goTo();
    });
  });
})();

/* Шапка подстраивает цвет под блок, который сейчас под ней:
   на тёмных — светлые буквы и медь, на светлых (кольцо работ, светлые сцены «Моего подхода») — тёмно-зелёные. */
(function () {
  'use strict';
  var header = document.querySelector('[data-header]');
  if (!header) return;
  var LIGHT = { hc: '#1A2C30', acc: '#A9502C', bg: '237, 232, 225' };
  var DARK = { hc: '#E8DCC8', acc: '#C9A27A', bg: '18, 31, 34' };
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section')); // «Мой подход» закреплён и обёрнут — поэтому не только прямые потомки
  var isLight = function (rgb) {
    var m = rgb.match(/\d+(\.\d+)?/g); if (!m) return false;
    return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 150;
  };
  var last = '';
  var update = function () {
    var y = header.offsetHeight / 2, under = null;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { under = sections[i]; break; }
    }
    var light = false;
    if (under) {
      if (under.classList.contains('works')) light = true;
      /* в «Моём подходе» фон меняется со сценой: светлый текст блока = тёмный фон, и наоборот */
      else if (under.classList.contains('approach')) light = !isLight(getComputedStyle(under).color);
      else if (under.classList.contains('story')) light = under.classList.contains('is-now'); // «Сейчас» — светлое фото
      else if (under.classList.contains('case')) light = under.getAttribute('data-page') === '1'; // «После» — светлый фон
    }
    var key = light ? 'L' : 'D';
    if (key === last) return;
    last = key;
    var t = light ? LIGHT : DARK;
    header.style.setProperty('--hc', t.hc);
    header.style.setProperty('--hc-accent', t.acc);
    header.style.setProperty('--hc-bg', t.bg);
  };
  window.addEventListener('scroll', update, { passive: true });
  setInterval(update, 400); // сцены «Моего подхода» меняют фон и без прокрутки
  update();
})();

/* Блок «Мой путь» — 3D-сцена, см. story3d.js */

/* Доводка: если прокрутка остановилась и блок открыт не полностью — страница мягко подтягивается к ближайшему
   «правильному» положению: верх блока ровно по верху экрана, а в закреплённых блоках — к началу каждой их страницы
   («Мой подход» — сцены, «Дизайн продаёт» — «До» / «После»). Только на компьютере: на телефоне блоки длиннее экрана. */
(function () {
  'use strict';
  var stacked = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var snapping = false, timer = null, lastInput = 0;
  /* сколько «страниц» у закреплённого блока */
  var pagesOf = function (sec) {
    if (sec.classList.contains('approach')) return sec.querySelectorAll('.apx__slide').length || 1;
    if (sec.classList.contains('case')) return sec.querySelectorAll('.case__page').length || 1;
    return 1;
  };
  var points = function () {
    var list = [];
    var pins = window.ScrollTrigger ? window.ScrollTrigger.getAll().filter(function (t) { return t.pin; }) : [];
    document.querySelectorAll('main section[id]').forEach(function (sec) {
      var st = pins.filter(function (t) { return t.trigger === sec; })[0];
      if (st) {
        var n = pagesOf(sec);
        if (n > 1) for (var i = 0; i < n; i++) list.push(st.start + (st.end - st.start) * i / (n - 1));   // начало каждой страницы
        else { list.push(st.start); list.push(st.end); }
      } else {
        list.push(sec.getBoundingClientRect().top + window.pageYOffset);
      }
    });
    return list;
  };
  var settle = function () {
    timer = null;
    if (snapping || stacked.matches || !window.lenis) return;
    if (document.querySelector('.site-menu.is-open')) return;   // меню открыто — не трогаем
    if (performance.now() - lastInput < 120) { timer = setTimeout(settle, 140); return; }   // колесо ещё крутится
    /* по направлению прокрутки: стоило сдвинуться вперёд чуть больше, чем на шестую часть экрана, — доводим вперёд; иначе возвращаем */
    var y = window.pageYOffset, vh = window.innerHeight, dir = window.lenis.direction || 1;
    var pts = points().sort(function (p, q) { return p - q; }), behind = null, ahead = null;
    pts.forEach(function (p) { if (p <= y + 1) behind = p; else if (ahead === null) ahead = p; });
    if (behind === null || ahead === null) return;
    if (Math.abs(y - behind) < 2) return;                    // уже на месте
    if (ahead - behind > vh * 1.6) return;                   // длинный участок — не дёргаем
    var f = (y - behind) / (ahead - behind);
    var best = dir > 0 ? (f > 0.16 ? ahead : behind) : (f < 0.84 ? behind : ahead);
    var max = document.documentElement.scrollHeight - vh;
    best = Math.max(0, Math.min(max, best));
    snapping = true;
    window.lenis.scrollTo(best, { duration: reduce ? 0.01 : 0.75, easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      onComplete: function () { snapping = false; } });
    setTimeout(function () { snapping = false; }, 1200);       // на всякий случай — не застрять в режиме доводки
  };
  var arm = function () {
    if (snapping) return;
    clearTimeout(timer); timer = setTimeout(settle, 220);       // доводим, когда прокрутка затихла
  };
  ['wheel', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, function () { lastInput = performance.now(); if (snapping && window.lenis) { snapping = false; } }, { passive: true }); });
  var hook = function () { if (window.lenis && window.lenis.on) window.lenis.on('scroll', arm); else window.addEventListener('scroll', arm, { passive: true }); };
  if (document.readyState === 'complete') hook(); else window.addEventListener('load', hook);
})();

/* Производительность: всё, что крутится бесконечно (парящие слова, покачивание телефона, пульсирующие стрелки),
   замирает, пока его блок не на экране, и продолжается, когда блок вернулся. Внешне ничего не меняется,
   но браузер больше не пересчитывает страницу ради невидимых блоков. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  var secs = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var infiniteIn = function (sec) {
    if (!window.gsap) return [];
    return window.gsap.globalTimeline.getChildren(true, true, true).filter(function (t) {
      if (t.repeat() !== -1 || t.paused() || !t.isActive()) return false;
      var tg = t.targets ? t.targets() : [];
      return tg.length && tg[0] instanceof Element && sec.contains(tg[0]);
    });
  };
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var sec = e.target;
      if (e.isIntersecting) {
        sec.classList.remove('is-off');
        (sec._sleep || []).forEach(function (t) { t.resume(); });
        sec._sleep = null;
      } else {
        sec.classList.add('is-off');
        sec._sleep = infiniteIn(sec);
        sec._sleep.forEach(function (t) { t.pause(); });
      }
    });
  }, { rootMargin: '10% 0px' });
  secs.forEach(function (s) { io.observe(s); });
  /* анимация могла запуститься с задержкой, когда блок уже ушёл с экрана, — подбираем и её */
  setInterval(function () {
    secs.forEach(function (s) {
      if (!s.classList.contains('is-off')) return;
      var more = infiniteIn(s);
      if (!more.length) return;
      more.forEach(function (t) { t.pause(); });
      s._sleep = (s._sleep || []).concat(more);
    });
  }, 1500);
})();
