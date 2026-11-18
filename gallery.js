/* Блок «Афиши, баннеры, реклама» — продолжение: галерея работ по диагонали.
   По мотивам «Diagonal Slideshow» (Codrops, MIT), переписано на GSAP сайта и в его стилях:
   текущая работа — в центре, предыдущая выглядывает слева сверху, следующая — справа снизу.
   Клик по боковой — листает по диагонали (буквы названия «перебираются», как в оригинале);
   клик по центральной — раскрывает подробности: работа уходит влево, справа — крупное название, вид работы и что она даёт.
   Работы показаны целиком: рамка слайда — по пропорциям картинки. Галерея листается сама, пока на неё не навели. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-gallery]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var DATA = JSON.parse(sec.querySelector('.gal__data').textContent);
  var N = DATA.length;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = function () { return window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches; };
  var strip = function (s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent; };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ARROW = '<svg viewBox="0 0 101 14.73" aria-hidden="true"><path fill="currentColor" d="M0 7.36V8.36H100V6.36H0V7.36ZM100.71 8.07C101.1 7.68 101.1 7.05 100.71 6.66L94.34.29C93.95-.1 93.32-.1 92.93.29 92.54.68 92.54 1.32 92.93 1.71L98.59 7.36 92.93 13.02C92.54 13.41 92.54 14.04 92.93 14.44 93.32 14.83 93.95 14.83 94.34 14.44L100.71 8.07Z"/></svg>';

  /* ---------- разметка ---------- */
  var stage = document.createElement('div'); stage.className = 'dg__stage';
  var deco = document.createElement('div'); deco.className = 'dg__deco'; deco.setAttribute('aria-hidden', 'true');
  stage.appendChild(deco);
  var slides = DATA.map(function (d, i) {
    var el = document.createElement('div'); el.className = 'dg__slide';
    var kind = strip(d.kind).replace(/:$/, ''), where = strip(d.where);
    el.innerHTML =
      '<div class="dg__frame"><span class="dg__pic"><img class="dg__img" src="' + d.src + '" alt="' + strip(d.name) + ' — ' + kind.toLowerCase() + ' ' + where + '" decoding="async" draggable="false"></span></div>' +
      '<p class="dg__side" aria-hidden="true">' + kind + '</p>' +
      '<div class="dg__texts"><span class="dg__num">' + pad(i + 1) + '</span><p class="dg__title">' + strip(d.name) + '</p><p class="dg__sub">' + kind + ' ' + where + '</p></div>';
    stage.appendChild(el);
    return { el: el, frame: el.querySelector('.dg__frame'), img: el.querySelector('.dg__img'), texts: el.querySelector('.dg__texts'), title: el.querySelector('.dg__title'), side: el.querySelector('.dg__side'), d: d };
  });
  /* подробности (открываются кликом по текущей работе) */
  var content = document.createElement('div'); content.className = 'dg__content';
  content.innerHTML = '<button class="dg__close" type="button" aria-label="Назад к галерее">' + ARROW + '</button>' +
    DATA.map(function (d, i) {
      var kind = strip(d.kind).replace(/:$/, '');
      return '<div class="dg__item"><p class="dg__item-title">' + strip(d.name) + '</p><p class="dg__item-sub">' + kind + ' ' + strip(d.where) + '</p>' +
        '<p class="dg__item-text">' + strip(d.note).replace(/^./, function (c) { return c.toUpperCase(); }) + '</p><span class="dg__item-num">' + pad(i + 1) + '</span></div>';
    }).join('');
  var nav = document.createElement('div'); nav.className = 'dg__nav';
  nav.innerHTML = '<p class="dg__count"><span class="dg__cur">01</span><span class="dg__sep" aria-hidden="true"></span><span class="dg__total">' + pad(N) + '</span></p>' +
    '<button class="dg__arrow dg__arrow--prev" type="button" aria-label="Предыдущая работа">' + ARROW + '</button>' +
    '<button class="dg__arrow dg__arrow--next" type="button" aria-label="Следующая работа">' + ARROW + '</button>';
  var label = sec.querySelector('.gal__label'); if (label) label.remove();
  var oldCanvas = sec.querySelector('.gal__canvas'); if (oldCanvas) oldCanvas.remove();
  /* точки справа вверху, вертикально: сколько работ и какая показана; клик — к этой работе */
  var dots = document.createElement('div'); dots.className = 'dg__dots'; dots.setAttribute('aria-label', 'Работы');
  dots.innerHTML = DATA.map(function (d, i) { return '<button class="dg__dot" type="button" aria-label="' + strip(d.name).replace(/"/g, '') + '"></button>'; }).join('');
  sec.appendChild(stage); sec.appendChild(content); sec.appendChild(nav); sec.appendChild(dots);
  var dotEls = Array.prototype.slice.call(dots.children);
  var mark = function () { dotEls.forEach(function (b, k) { b.classList.toggle('is-on', k === current); b.setAttribute('aria-current', k === current ? 'true' : 'false'); }); };
  var items = Array.prototype.slice.call(content.querySelectorAll('.dg__item'));
  var closeBtn = content.querySelector('.dg__close');
  var cur = nav.querySelector('.dg__cur');

  /* размеры слайда: работа целиком, в пределах «коробки» */
  var size = function (s) {
    var W = stage.clientWidth, H = stage.clientHeight, ar = (s.d.h || 1) / (s.d.w || 1);
    var maxW = phone() ? W * 0.66 : Math.min(W * 0.4, H * 0.8), maxH = phone() ? H * 0.5 : H * 0.66;   // горизонтальные баннеры — шире, вертикальные — по высоте
    /* рамка с паспарту: работа — целиком внутри, паспарту одинаковое со всех сторон */
    var u = phone() ? 1 : Math.min(window.innerWidth / 1920, window.innerHeight / 1080), m = (phone() ? 9 : 16 * u) + 2;
    var w = maxW - 2 * m, h = w * ar; if (h > maxH - 2 * m) { h = maxH - 2 * m; w = h / ar; }
    w += 2 * m; h += 2 * m;
    s.w = w; s.h = h;
    gsap.set(s.frame, { width: w, height: h });
  };
  /* положения: -2 за кадром слева сверху, -1 слева сверху, 0 центр, 1 справа снизу, 2 за кадром справа снизу, 3 — влево при подробностях */
  var at = function (s, p) {
    var W = stage.clientWidth, H = stage.clientHeight, sm = phone() ? 0.5 : 1;   // телефон: соседние работы меньше и уходят в углы — не закрывают подписи
    var w = s.w * (p === 0 || p === 3 ? 1 : sm), h = s.h * (p === 0 || p === 3 ? 1 : sm), k = phone() ? 0.28 : 1 / 3, sc = p === 0 || p === 3 ? 1 : sm;
    switch (p) {
      case -2: return { x: -(W / 2 + w), y: -(H / 2 + h), rotation: -30, scale: sc };
      case -1: return { x: -(W / 2 - w * k), y: -(H / 2 - h * k), rotation: 0, scale: sc };
      case 1: return { x: W / 2 - w * k, y: H / 2 - h * k, rotation: 0, scale: sc };
      case 2: return { x: W / 2 + w, y: H / 2 + h, rotation: 30, scale: sc };
      case 3: return { x: -(W / 2 - w / 2 - W * 0.075), y: 0, rotation: 0, scale: 1 };
      default: return { x: 0, y: 0, rotation: 0, scale: 1 };
    }
  };
  var place = function (s, p) { var t = at(s, p); gsap.set(s.el, { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, autoAlpha: 1 }); s.pos = p; };
  var MOVE = 0.95, REST = 1.7;   // одно ровное движение без рывков и одинаковая пауза между сменами
  var move = function (s, p, opt) {
    opt = opt || {};
    var t = at(s, p);
    if (opt.from !== undefined) { var f = at(s, opt.from); gsap.set(s.el, { x: f.x, y: f.y, rotation: f.rotation, scale: f.scale, autoAlpha: 1 }); }
    s.pos = p;
    return gsap.to(s.el, { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, rotationX: 0, rotationY: 0, duration: reduce ? 0.01 : MOVE, delay: opt.delay || 0, ease: 'sine.inOut', force3D: true });   // плавно и быстро — живой темп
  };

  /* буквы названия: «перебираются» и встают на место — русскими буквами */
  var CH = 'абвгдежзиклмнопрстуфхцчшэюя*#&%'.split('');
  var letters = function (el) {
    if (!el._chars) {
      var t = el.textContent; el.textContent = '';
      el._chars = Array.from(t).map(function (c) { var sp = document.createElement('span'); sp.textContent = c; sp.dataset.c = c; el.appendChild(sp); return sp; });
    }
    return el._chars;
  };
  var scramble = function (el) {
    if (reduce) return;
    letters(el).forEach(function (sp, k) {
      if (/\s/.test(sp.dataset.c)) return;
      var n = 0, loop = setInterval(function () { sp.textContent = CH[(Math.random() * CH.length) | 0]; if (++n > 4 + k % 5) { clearInterval(loop); sp.textContent = sp.dataset.c; } }, 55);
    });
  };
  var showTexts = function (s, anim) {
    gsap.fromTo([s.texts, s.side], { autoAlpha: 0 }, { autoAlpha: 1, duration: anim ? 0.5 : 0, delay: anim ? 0.25 : 0, ease: 'power1.out' });
    if (anim) { scramble(s.title); gsap.fromTo(s.texts.querySelector('.dg__num'), { x: -12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.9, ease: 'power2.out' }); }
  };
  var hideTexts = function (s) { gsap.to([s.texts, s.side], { autoAlpha: 0, duration: 0.2, ease: 'power1.in' }); };

  /* ---------- слайдшоу ---------- */
  var current = 0, busy = false, open = false, over = false, inView = false;
  var idx = function (i) { return (i + N) % N; };
  var decoFit = function (s, animate) {
    gsap.to(deco, { width: s.w * 1.08, height: s.h * 1.08, duration: animate && !reduce ? MOVE : 0, ease: 'sine.inOut' });
  };
  var render = function () {
    slides.forEach(function (s, i) {
      s.el.classList.remove('is-current', 'is-prev', 'is-next');
      if (i === current) { place(s, open ? 3 : 0); s.el.classList.add('is-current'); }
      else if (i === idx(current - 1)) { place(s, open ? -2 : -1); s.el.classList.add('is-prev'); }
      else if (i === idx(current + 1)) { place(s, open ? 2 : 1); s.el.classList.add('is-next'); }
      else { gsap.set(s.el, { autoAlpha: 0 }); s.pos = null; }
      if (i !== current) gsap.set([s.texts, s.side], { autoAlpha: 0 });
    });
    cur.textContent = pad(current + 1); mark();
  };
  var layout = function () { slides.forEach(size); render(); decoFit(slides[current], false); if (open) gsap.set(deco, { width: stage.clientWidth, height: stage.clientHeight }); };

  var go = function (dir) {
    if (busy || open) return;
    busy = true;
    var prev = slides[idx(current - 1)], now = slides[current], next = slides[idx(current + 1)];
    var upcoming = slides[idx(current + 2 * dir)];
    current = idx(current + dir);
    hideTexts(now);
    if (dir > 0) {
      move(prev, -2);
      move(now, -1);
      move(next, 0);
      move(upcoming, 1, { from: 2 }).then(done);
      showTexts(next, true);
    } else {
      move(next, 2);
      move(now, 1);
      move(prev, 0);
      move(upcoming, -1, { from: -2 }).then(done);
      showTexts(prev, true);
    }
    /* прямоугольник за работой плавно подстраивается под новую рамку — тем же движением */
    decoFit(slides[current], true);
    cur.textContent = pad(current + 1); mark();
    function done() { busy = false; render(); schedule(); }
  };

  var showContent = function () {
    if (open || busy || phone()) return;
    open = true; sec.classList.add('dg--open');
    var s = slides[current];
    gsap.to(deco, { width: stage.clientWidth, height: stage.clientHeight, x: -20, y: 20, duration: reduce ? 0 : 0.8, ease: 'power4.inOut' });
    move(slides[idx(current - 1)], -2); move(slides[idx(current + 1)], 2); move(s, 3);
    gsap.to(s.img, { scale: 1, duration: 0.8 });
    hideTexts(s);
    var it = items[current]; it.classList.add('is-on');
    gsap.fromTo([closeBtn].concat(Array.prototype.slice.call(it.children)), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power4.out', stagger: 0.05, delay: 0.4 });
  };
  var hideContent = function () {
    if (!open || busy) return;
    var it = items[current];
    gsap.to([closeBtn].concat(Array.prototype.slice.call(it.children)).reverse(), { y: 10, autoAlpha: 0, duration: 0.3, stagger: 0.01, ease: 'power3.in', onComplete: function () { it.classList.remove('is-on'); } });
    sec.classList.remove('dg--open');
    gsap.to(deco, { x: 0, y: 0, duration: reduce ? 0 : 0.8, ease: 'power4.inOut' });
    decoFit(slides[current], true);
    move(slides[idx(current - 1)], -1); move(slides[idx(current + 1)], 1);
    move(slides[current], 0).then(function () { open = false; });
    showTexts(slides[current], true);
  };

  /* клики: боковая работа — листаем; текущая — подробности */
  slides.forEach(function (s, i) {
    s.frame.addEventListener('click', function () {
      if (s.pos === 1) { go(1); restart(); } else if (s.pos === -1) { go(-1); restart(); } else if (s.pos === 0) showContent();
    });
    /* лёгкий наклон текущей работы за курсором */
    s.frame.addEventListener('pointermove', function (e) {
      if (s.pos !== 0 || open || busy || reduce || phone()) return;
      var r = s.frame.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(s.frame, { rotationY: px * 16, rotationX: -py * 16, x: px * 24, y: py * 24, duration: 1.2, ease: 'power1.out' });
      gsap.to(s.texts, { x: -px * 24, y: -py * 24, duration: 1.2, ease: 'power1.out' });
      gsap.to(s.img, { scale: 1.06, duration: 0.8, ease: 'power3.out' });
    });
    s.frame.addEventListener('pointerleave', function () {
      gsap.to(s.frame, { rotationY: 0, rotationX: 0, x: 0, y: 0, duration: 1.6, ease: 'power4.out' });
      gsap.to(s.texts, { x: 0, y: 0, duration: 1.6, ease: 'power4.out' });
      gsap.to(s.img, { scale: 1, duration: 1.6, ease: 'power4.out' });
    });
  });
  closeBtn.addEventListener('click', hideContent);
  /* карточка галереи — та же самая (рамка, название, вид, текст, номер, стрелка «назад»), но открывается прямо в другом блоке:
     window.galleryCard(ключ по имени файла картинки, блок). Блок со вращающейся подставкой выше открывает её по щелчку на работе */
  var fileOf = function (src) { return String(src).split('/').pop().split('?')[0].split('.')[0]; };
  window.galleryCard = function (key, host) {
    var i = DATA.findIndex(function (d) { return fileOf(d.src) === key; });
    if (i < 0 || !host || host.querySelector('.dg-embed')) return;
    var s0 = slides[i];
    var box = document.createElement('div'); box.className = 'dg-embed dg--open';
    var st = document.createElement('div'); st.className = 'dg__stage';
    var dc = document.createElement('div'); dc.className = 'dg__deco'; dc.setAttribute('aria-hidden', 'true');
    var sl = s0.el.cloneNode(true); sl.classList.add('is-current'); sl.style.cssText = '';
    st.appendChild(dc); st.appendChild(sl);
    var ct = document.createElement('div'); ct.className = 'dg__content';
    var cb = closeBtn.cloneNode(true); cb.style.cssText = '';
    var it = items[i].cloneNode(true); it.classList.add('is-on');
    Array.prototype.forEach.call(it.children, function (c) { c.style.cssText = ''; });
    ct.appendChild(cb); ct.appendChild(it);
    box.appendChild(st); box.appendChild(ct);
    host.appendChild(box);
    var frame = sl.querySelector('.dg__frame'), img = sl.querySelector('.dg__img');
    img.loading = 'eager'; img.style.cssText = ''; frame.style.cssText = '';
    gsap.set(sl.querySelectorAll('.dg__texts, .dg__side'), { autoAlpha: 0 });
    /* размер и место — как у галереи: работа целиком в рамке, при подробностях — слева */
    var W = st.clientWidth, H = st.clientHeight, ar = (s0.d.h || 1) / (s0.d.w || 1), ph = phone();
    var maxW = ph ? W * 0.66 : Math.min(W * 0.4, H * 0.8), maxH = ph ? H * 0.42 : H * 0.66;
    var u = ph ? 1 : Math.min(window.innerWidth / 1920, window.innerHeight / 1080), m = (ph ? 9 : 16 * u) + 2;
    var w = maxW - 2 * m, h = w * ar; if (h > maxH - 2 * m) { h = maxH - 2 * m; w = h / ar; }
    w += 2 * m; h += 2 * m;
    gsap.set(frame, { width: w, height: h });
    var to = ph ? { x: 0, y: -H / 2 + 96 + h / 2 } : { x: -(W / 2 - w / 2 - W * 0.075), y: 0 };
    if (ph) { it.style.top = (96 + h + 70) + 'px'; cb.style.top = (96 + h + 34) + 'px'; var y0 = host.getBoundingClientRect().top + window.scrollY; if (window.lenis) window.lenis.scrollTo(y0, { duration: 0.8 }); else window.scrollTo({ top: y0, behavior: 'smooth' }); }
    gsap.set(sl, { xPercent: -50, yPercent: -50, x: 0, y: ph ? to.y : 0, autoAlpha: 1, rotation: 0, scale: ph ? 1 : 0.9 });
    gsap.set(dc, { xPercent: -50, yPercent: -50, width: w * 1.08, height: h * 1.08, x: 0, y: ph ? to.y : 0, opacity: 1 });
    var parts = [cb].concat(Array.prototype.slice.call(it.children));
    var tl = gsap.timeline();
    tl.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduce ? 0 : 0.35, ease: 'power1.out' }, 0);
    tl.to(dc, { width: W, height: H, x: ph ? 0 : -20, y: ph ? 0 : 20, duration: reduce ? 0 : 0.8, ease: 'power4.inOut' }, 0.05);
    tl.to(sl, { x: to.x, y: to.y, scale: 1, duration: reduce ? 0.01 : 0.72, ease: 'power2.inOut' }, 0.1);
    tl.fromTo(parts, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power4.out', stagger: 0.05 }, reduce ? 0 : 0.45);
    var shut = function () {
      document.removeEventListener('keydown', esc);
      gsap.timeline({ onComplete: function () { box.remove(); host.dispatchEvent(new CustomEvent('gallerycard:close')); } })
        .to(parts.slice().reverse(), { y: 10, autoAlpha: 0, duration: 0.3, stagger: 0.01, ease: 'power3.in' }, 0)
        .to(dc, { width: w * 1.08, height: h * 1.08, x: 0, y: ph ? to.y : 0, duration: reduce ? 0 : 0.6, ease: 'power4.inOut' }, 0.1)
        .to(sl, { x: 0, y: ph ? to.y : 0, scale: ph ? 1 : 0.9, duration: reduce ? 0.01 : 0.6, ease: 'power2.inOut' }, 0.1)
        .to(box, { autoAlpha: 0, duration: reduce ? 0 : 0.35, ease: 'power1.in' }, 0.5);
    };
    var esc = function (e) { if (e.key === 'Escape') shut(); };
    cb.addEventListener('click', shut);
    document.addEventListener('keydown', esc);
    host.dispatchEvent(new CustomEvent('gallerycard:open'));
    cb.focus({ preventScroll: true });
  };
  /* переход к работе по точке: соседняя — обычным листанием, дальняя — мягкой сменой */
  dotEls.forEach(function (b, i) {
    b.addEventListener('click', function () {
      if (busy || open || i === current) return;
      restart();
      if (i === idx(current + 1)) return go(1);
      if (i === idx(current - 1)) return go(-1);
      busy = true;
      var vis = slides.filter(function (q) { return q.pos !== null && q.pos !== undefined; }).map(function (q) { return q.el; });
      gsap.to(vis, { autoAlpha: 0, duration: reduce ? 0 : 0.3, ease: 'power1.in', onComplete: function () {
        current = i; render(); decoFit(slides[current], false);
        var now = slides.filter(function (q) { return q.pos !== null && q.pos !== undefined; }).map(function (q) { return q.el; });
        gsap.fromTo(now, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduce ? 0 : 0.45, ease: 'power1.out', onComplete: function () { busy = false; } });
        showTexts(slides[current], true);
      } });
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) hideContent(); });
  nav.querySelector('.dg__arrow--prev').addEventListener('click', function () { if (open) hideContent(); else { go(-1); restart(); } });
  nav.querySelector('.dg__arrow--next').addEventListener('click', function () { if (open) hideContent(); else { go(1); restart(); } });
  /* телефон: листание пальцем */
  var sx = 0, sy = 0;
  stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); restart(); }
  }, { passive: true });
  stage.addEventListener('mouseenter', function () { over = true; });
  stage.addEventListener('mouseleave', function () { over = false; });

  /* листается сама, пока блок на экране, курсор не над работами и подробности закрыты */
  /* ровный ритм: следующая смена — через одинаковую паузу после окончания предыдущей (по часам анимации, а не по таймеру) */
  var timer = null;
  var schedule = function () {
    if (timer) timer.kill();
    timer = gsap.delayedCall(REST, function tryGo() { if (inView && !over && !open && !reduce && !document.hidden && !busy) go(1); else timer = gsap.delayedCall(0.4, tryGo); });
  };
  var restart = schedule;
  new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }, { threshold: 0.45 }).observe(sec);

  /* старт: размеры картинок известны заранее (в данных), раскладываем сразу */
  slides.forEach(function (s) { gsap.set(s.el, { xPercent: -50, yPercent: -50 }); });
  layout();
  showTexts(slides[current], false);
  /* все работы раскодируются заранее — при появлении новой картинки нет подвисания */
  var decodeAll = function () { slides.forEach(function (s) { if (s.img.decode) s.img.decode().catch(function () {}); }); };
  if (window.afterHero) window.afterHero(decodeAll); else decodeAll();   // после надписи первого экрана — чтобы она не дёргалась
  restart();
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 150); });
})();
