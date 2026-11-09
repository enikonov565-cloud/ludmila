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

  var DIALOG = [                                   // коротко: одна мысль — одна строка
    ['them', 'Нужен дизайн карточек. ТЗ нет 🙈'],
    ['me', 'И не надо. Сначала — смысл: что должен почувствовать покупатель?'],
    ['them', 'Что это ручная работа.'],
    ['me', 'Поняла с первого раза ✨'],
    ['them', 'А как узнать, что работа идёт?'],
    ['me', 'Пишу первой. Всегда на связи.'],
    ['them', 'Файлы останутся у меня?'],
    ['me', 'Все: Figma, PSD, PNG.'],
    ['them', 'Начинаем! 🙌']
  ];
  var SPRING = 'back.out(1.6)';   // упругий въезд, как spring из образца

  var bubble = function (who, text) {
    var row = document.createElement('div');
    row.className = 'chat__row chat__row--' + who;
    var b = document.createElement('div');
    b.className = 'chat__msg';
    b.textContent = text;
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
  };

  var play = function () {
    reset();
    var t = 600;
    DIALOG.forEach(function (m) {
      var who = m[0], text = m[1];
      if (who === 'me') {                       // Людмила печатает — точки прыгают волной
        later(function () {
          var tr = typing('me'); appear(tr);
          dotsTween = gsap.to(tr.querySelectorAll('i'), { y: -5, opacity: 1, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.18 });
        }, t);
        t += 900 + Math.min(1600, text.length * 14);
        later(function () {
          var tr = list.querySelector('.is-typing');
          if (dotsTween) { dotsTween.kill(); dotsTween = null; }
          if (tr) tr.remove();
          appear(bubble('me', text));
        }, t);
      } else {
        later(function () { appear(bubble('them', text)); }, t);
      }
      t += 700 + text.length * 32;               // пауза на чтение
    });
  };

  if (reduce) { DIALOG.forEach(function (m) { list.appendChild(bubble(m[0], m[1])); }); return; }

  /* появление блока: фото приближается, заголовок выезжает строками, телефон всплывает */
  var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  intro.from(sec.querySelector('.talk__window'), { scale: 1.12, autoAlpha: 0, duration: 1.8, ease: 'power2.out' }, 0)
    .from(sec.querySelector('.talk__person'), { xPercent: -6, autoAlpha: 0, duration: 1.4 }, 0.2)
    .from(sec.querySelectorAll('.talk__title .story__reveal'), { yPercent: 110, duration: 1, stagger: 0.12 }, 0.4)
    .fromTo(sec.querySelector('.chat'), { y: 80, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1 }, 0.6)
    .call(function () {          // телефон «живой»: медленно покачивается и чуть поворачивается
      gsap.to(sec.querySelector('.chat'), { y: -18, rotation: '-=2.5', duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });

  var phone = sec.querySelector('.chat');
  var stackedMq = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  var TILT = stackedMq ? 4 : 9;                      // наклон: низ телефона — к центру страницы
  gsap.set(phone, { yPercent: stackedMq ? 0 : -50, rotation: TILT });
  var introDone = false;
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting) {
      if (!introDone) { introDone = true; intro.play(); }
      play();
    } else reset();
  }, { threshold: 0.35 }).observe(phone);
})();
