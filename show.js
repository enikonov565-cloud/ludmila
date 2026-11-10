/* Блок 8 «Баннеры, наружка, соцсети» — точно по макету Figma «Slide 4:3 - 1» (узел 1029:275).
   Справа от тонкой линии — фото работы, слева от линии — её описание.
   Смена работы: описание рассыпается пылью, фото уходит влево под линию, следующее фото подъезжает справа
   к линии, и из-под линии с другой стороны выходит описание именно этого баннера. Идёт само, пока блок на экране. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-show]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var photos = Array.prototype.slice.call(sec.querySelectorAll('.show__photo'));
  var descs = Array.prototype.slice.call(sec.querySelectorAll('.show__desc'));
  var stage = sec.querySelector('.show__right');
  var left = sec.querySelector('.show__left');
  var dust = sec.querySelector('.show__dust');
  var total = photos.length, cur = 0, HOLD = 4.6;

  /* описание — по буквам (слова не рвутся): при смене буквы рассыпаются пылью */
  descs.forEach(function (d) {
    d.querySelectorAll('.show__t1, .show__t2, .show__name, .show__list li').forEach(function (el) {
      el.innerHTML = el.textContent.split(' ').map(function (w) {
        return '<span class="dw">' + Array.prototype.map.call(w, function (ch) { return '<span class="dc">' + ch + '</span>'; }).join('') + '</span>';
      }).join(' ');
    });
    d._chars = Array.prototype.slice.call(d.querySelectorAll('.dc'));
    d._rows = Array.prototype.slice.call(d.querySelectorAll('.show__type, .show__name, .show__list li'));
  });

  /* ---------- пыль: тонкие светлые пылинки от рассыпающихся букв ---------- */
  var ctx = dust.getContext('2d'), parts = [], dpr = Math.min(2, window.devicePixelRatio || 1), dustRaf = 0;
  var sizeDust = function () { dust.width = sec.clientWidth * dpr; dust.height = sec.clientHeight * dpr; };
  var tickDust = function (t) {
    dustRaf = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dust.width, dust.height);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += 1 / 60;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx / 60; p.y += p.vy / 60; p.vx *= 0.99; p.vy *= 0.99;
      ctx.fillStyle = 'rgba(255, 250, 250, ' + ((1 - p.life / p.max) * 0.75).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    if (parts.length) dustRaf = requestAnimationFrame(tickDust);
  };
  var puff = function (x, y) {
    for (var k = 0; k < 3; k++) parts.push({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
      vx: -(12 + Math.random() * 46), vy: -(6 + Math.random() * 26), life: 0, max: 1.3 + Math.random() * 1.5, r: 0.5 + Math.random() * 1 });
    if (!dustRaf) dustRaf = requestAnimationFrame(tickDust);
  };

  /* ---------- описание: выходит из-под линии / рассыпается пылью ---------- */
  var descIn = function (d, delay) {
    gsap.killTweensOf(d._chars); gsap.killTweensOf(d._rows);
    gsap.set(d, { autoAlpha: 1 });
    gsap.set(d._chars, { clearProps: 'all' });
    gsap.set(d._rows, { x: 0, autoAlpha: 1 });
    if (reduce) return;
    var edge = left.getBoundingClientRect().right;                    // правый край левой части — линия
    gsap.fromTo(d._rows, { x: function (i, el) { return edge - el.getBoundingClientRect().left + 2; }, autoAlpha: 1 },   // строки выходят из-под линии влево
      { x: 0, autoAlpha: 1, duration: 1.2, ease: 'power3.out', stagger: 0.12, delay: delay || 0 });
  };
  var descOut = function (d) {
    if (reduce) { gsap.set(d, { autoAlpha: 0 }); return; }
    var box = sec.getBoundingClientRect(), k = Math.max(0.5, Math.min(1, sec.clientWidth / 1920));
    sizeDust();
    d._chars.forEach(function (ch) {
      var r = ch.getBoundingClientRect();
      ch._px = r.left + r.width / 2 - box.left; ch._py = r.top + r.height / 2 - box.top;
    });
    gsap.to(d._chars, {
      x: function () { return -(20 + Math.random() * 90) * k; },
      y: function () { return -(8 + Math.random() * 50) * k; },
      autoAlpha: 0, filter: 'blur(2.5px)', duration: 1.3, ease: 'power2.in',
      stagger: { each: 0.006, from: 'start' },
      onStart: function () {},
      onUpdate: function () {}
    });
    /* пылинки — по мере того как буквы тают, слева направо */
    d._chars.forEach(function (ch, i) { gsap.delayedCall(0.25 + i * 0.006, function () { puff(ch._px, ch._py); }); });
    gsap.delayedCall(1.6 + d._chars.length * 0.006, function () { if (descs[cur] !== d) gsap.set(d, { autoAlpha: 0 }); });
  };

  /* ---------- фото: подъезжает к линии / уходит под линию ---------- */
  var farX = function () { return stage.clientWidth + 40; };
  var photoIn = function (p) {
    gsap.killTweensOf(p);
    gsap.set(p, { autoAlpha: 1, zIndex: 2 });
    if (reduce) { gsap.set(p, { x: 0, filter: 'brightness(1)' }); return; }
    gsap.fromTo(p, { x: farX(), filter: 'brightness(.45)' }, { x: 0, filter: 'brightness(1)', duration: 1.5, ease: 'power3.out' });
  };
  var photoOut = function (p) {
    gsap.killTweensOf(p);
    gsap.set(p, { zIndex: 1 });
    if (reduce) { gsap.set(p, { autoAlpha: 0 }); return; }
    gsap.to(p, { x: function () { return -(p.offsetLeft + p.offsetWidth + 10); }, duration: 1.3, ease: 'power2.inOut',
      onComplete: function () { gsap.set(p, { autoAlpha: 0, x: 0 }); } });
  };

  /* ---------- круг работ ---------- */
  gsap.set(photos.slice(1), { autoAlpha: 0 });
  gsap.set(descs.slice(1), { autoAlpha: 0 });
  var timer = null, started = false;
  var next = function () {
    var from = cur; cur = (cur + 1) % total;
    descOut(descs[from]);
    gsap.delayedCall(reduce ? 0 : 0.35, function () { photoOut(photos[from]); });
    gsap.delayedCall(reduce ? 0 : 0.5, function () { photoIn(photos[cur]); });
    gsap.delayedCall(reduce ? 0 : 1.55, function () { descIn(descs[cur]); });   // фото у линии — описание выходит из-под неё
    timer = gsap.delayedCall(HOLD + (reduce ? 0 : 1.6), next);
  };
  var begin = function () {
    started = true;
    photoIn(photos[0]);
    descIn(descs[0], reduce ? 0 : 1.05);
    timer = gsap.delayedCall(HOLD + 1.2, next);
  };
  window.addEventListener('resize', sizeDust);

  /* заход в блок: заголовок выезжает из-под строки; работы крутятся, только пока блок на экране */
  gsap.set(photos[0], { autoAlpha: 0 });
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) {
      if (!started) {
        if (!reduce) {
          gsap.from(sec.querySelector('.show__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
          gsap.from(sec.querySelectorAll('.show__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, delay: 0.1, ease: 'power3.out' });
          gsap.from(sec.querySelectorAll('.show__kicker, .show__tag'), { autoAlpha: 0, y: 14, duration: 0.7, delay: 0.35, stagger: 0.06, ease: 'power3.out' });
        }
        begin();
      } else if (timer) timer.resume();
    } else if (timer) timer.pause();
  }, { threshold: 0.3 }).observe(sec);
})();
