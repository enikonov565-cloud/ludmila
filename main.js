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

/* Появление второго блока при прокрутке: элементы проявляются по очереди */
(function () {
  'use strict';
  var items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
  var order = 0;
  items.forEach(function (el) { el.style.setProperty('--d', (order++ % 4) * 0.12 + 's'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
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
  var desktop = window.matchMedia('(min-width: 1001px)').matches;
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
    if (window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1001px)').matches) {
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
