/* Блок 7 «Я не жду ТЗ — я задаю правильные вопросы» (Figma «п-р 11»).
   Вместо списка принципов — iPhone с перепиской: клиентка пишет, Людмила отвечает,
   в ответах — её четыре принципа работы. Появление сообщений — как в образце (Originkit Live Chat):
   пузырь въезжает «пружиной» (opacity 0 → 1, scale .85 → 1, y 10 → 0), перед ответом — три прыгающие точки.
   Переписка идёт сама, когда блок на экране; ушли и вернулись — начинается заново. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-talk]');
  if (!sec || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var list = sec.querySelector('.chat__list');
  if (!list) return;

  /* отзыв — ровно по ширине заголовка (до конца строки «я задаю правильные») */
  var title = sec.querySelector('.talk__title');
  var fitReview = function () {
    if (window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches) { sec.style.removeProperty('--tw'); return; }
    var w = 0;
    Array.prototype.forEach.call(title.querySelectorAll('.story__reveal'), function (r) { w = Math.max(w, r.offsetWidth); });
    if (w) sec.style.setProperty('--tw', w + 'px');
  };
  fitReview();
  window.addEventListener('resize', fitReview);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitReview);

  var DIALOG = [                                   // коротко: одна мысль — одна строка
    ['them', 'Нужен дизайн карточек. ТЗ нет.'],
    ['me', 'И не надо. Сначала — смысл: что должен почувствовать покупатель?'],
    ['them', 'Что это ручная работа.'],
    ['me', 'Поняла с первого раза.'],
    ['them', 'А как узнать, что работа идёт?'],
    ['me', 'Пишу первой. Всегда на связи.'],
    ['them', 'Файлы останутся у меня?'],
    ['me', 'Все: Figma, PSD, PNG.'],
    ['them', 'Начинаем!']
  ];
  var SPRING = 'back.out(1.6)';   // упругий въезд, как spring из образца

  var clock = 0;                  // время сообщений: 10:02, 10:03…
  var bubble = function (who, text) {
    var row = document.createElement('div');
    row.className = 'chat__row chat__row--' + who;
    var b = document.createElement('div');
    b.className = 'chat__msg';
    b.textContent = text.replace(/(^|\s)(а|в|и|к|о|с|у|не|на|по|за|из|до|что|как)\s/gi, function (m, p, w) { return p + w + ' '; });   // предлог — со следующим словом
    /* время в углу пузыря, как в Telegram; у своих — две галочки «прочитано» */
    var tm = document.createElement('span');
    tm.className = 'chat__time';
    tm.textContent = '10:' + String(2 + (clock++)).padStart(2, '0');
    if (who === 'me') { var ck = document.createElement('span'); ck.className = 'chat__ticks'; ck.textContent = '✓✓'; tm.appendChild(ck); }
    b.appendChild(tm);
    row.appendChild(b);
    return row;
  };
  var typing = function (who) {
    var row = document.createElement('div');
    row.className = 'chat__row chat__row--' + who + ' is-typing';
    row.innerHTML = '<div class="chat__msg chat__typing"><i></i><i></i><i></i></div>';
    return row;
  };
  var appear = function (row) {
    list.appendChild(row);
    gsap.fromTo(row.firstChild, { autoAlpha: 0, scale: 0.85, y: 10 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.55, ease: SPRING });
  };

  var timers = [], dotsTween = null;
  var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
  var reset = function () {
    timers.forEach(clearTimeout); timers = [];
    if (dotsTween) { dotsTween.kill(); dotsTween = null; }
    list.innerHTML = '';
    clock = 0;
  };

  var play = function () {
    reset();
    var t = 600;
    DIALOG.forEach(function (m) {
      var who = m[0], text = m[1];
      if (who === 'them') {                     // это телефон Людмилы: как в iMessage, «печатает…» видно у собеседницы — точки прыгают волной
        later(function () {
          var tr = typing('them'); appear(tr);
          dotsTween = gsap.to(tr.querySelectorAll('i'), { y: -5, opacity: 1, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.18 });
        }, t);
        t += 900 + Math.min(1600, text.length * 14);
        later(function () {
          var tr = list.querySelector('.is-typing');
          if (dotsTween) { dotsTween.kill(); dotsTween = null; }
          if (tr) tr.remove();
          appear(bubble('them', text));
        }, t);
      } else {
        later(function () { appear(bubble('me', text)); }, t);   // свои сообщения Людмила отправляет сразу
      }
      t += 700 + text.length * 32;               // пауза на чтение
    });
  };

  if (reduce) { DIALOG.forEach(function (m) { list.appendChild(bubble(m[0], m[1])); }); return; }

  /* появление блока: фото приближается, заголовок выезжает строками, телефон всплывает */
  var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  intro.from(sec.querySelector('.talk__window'), { scale: 1.12, autoAlpha: 0, duration: 1.8, ease: 'power2.out' }, 0)
    .from(sec.querySelector('.talk__person'), { xPercent: -6, autoAlpha: 0, duration: 1.4 }, 0.2)
    .from(sec.querySelectorAll('.talk__title .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, stagger: 0.12 }, 0.4)
    .fromTo(sec.querySelectorAll('.talk__quote, .talk__by, .talk__cards img'), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12, clearProps: 'transform' }, 0.7)
    .fromTo(sec.querySelector('.chat'), { y: 80, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1 }, 0.6)
    .call(function () {          // телефон «живой»: медленно покачивается и чуть поворачивается
      gsap.to(sec.querySelector('.chat'), { y: -18, rotation: '-=2.5', duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });

  var phone = sec.querySelector('.chat');
  var stackedMq = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  var TILT = stackedMq ? 4 : 7;                      // наклон: низ телефона — к центру страницы
  gsap.set(phone, { yPercent: stackedMq ? 0 : -50, rotation: TILT });
  var introDone = false;
  var startIntro = function () { if (!introDone) { introDone = true; intro.play(); } };
  /* заголовок проявляется, как только до него докрутили (на телефоне он выше переписки) */
  new IntersectionObserver(function (en) { if (en[0].isIntersecting) startIntro(); }, { threshold: 0.3 }).observe(sec.querySelector('.talk__title'));
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) { startIntro(); play(); }
    else reset();
  }, { threshold: 0.35 }).observe(phone);
})();
