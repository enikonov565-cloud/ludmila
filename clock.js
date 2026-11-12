/* «Мой подход», карточка «Итог» → «Как решаю я»: вместо фото — настенные часы в фирменных цветах
   (по мотивам присланного образца: тёмный циферблат, кольцо тонких радиальных штрихов, золотые метки и цифры 12, 3, 6, 9;
   ход стрелок — как в «Braun Inspired Glass Clock», filipz: секундная стрелка с противовесом идёт плавно, без скачков).
   Без марки производителя. Показывают текущее время посетителя. Стрелки двигаются, только пока часы видны на экране. */
(function () {
  'use strict';
  var host = document.querySelector('[data-clock]');
  if (!host) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function (name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  var svg = el('svg', { viewBox: '-100 -100 200 200', 'aria-hidden': 'true', class: 'clock__svg' }, host);
  var defs = el('defs', {}, svg);
  /* циферблат — глубокая фирменная бирюза, к краю темнее */
  var face = el('radialGradient', { id: 'clkFace', cx: '45%', cy: '40%', r: '70%' }, defs);
  el('stop', { offset: '0', 'stop-color': '#21363B' }, face);
  el('stop', { offset: '.65', 'stop-color': '#16262A' }, face);
  el('stop', { offset: '1', 'stop-color': '#0B1517' }, face);
  /* золото меток и стрелок — фирменные бежево-медные тона */
  var gold = el('linearGradient', { id: 'clkGold', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': '#E8D3AE' }, gold);
  el('stop', { offset: '.5', 'stop-color': '#C9A27A' }, gold);
  el('stop', { offset: '1', 'stop-color': '#9C7550' }, gold);

  el('circle', { r: 96, fill: 'url(#clkFace)' }, svg);
  el('circle', { r: 95.4, fill: 'none', stroke: 'rgba(232,220,200,.10)', 'stroke-width': .8 }, svg);

  /* кольцо тонких радиальных штрихов */
  var ring = el('g', { stroke: 'rgba(232,220,200,.42)', 'stroke-width': .35, 'stroke-linecap': 'round' }, svg);
  for (var i = 0; i < 180; i++) {
    var a = i / 180 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    el('line', { x1: (s * 62).toFixed(2), y1: (-c * 62).toFixed(2), x2: (s * 88).toFixed(2), y2: (-c * 88).toFixed(2) }, ring);
  }
  /* под метками и цифрами штрихи прячем — как на образце */
  var marks = el('g', {}, svg);
  for (var h = 0; h < 12; h++) {
    var ang = h * 30;
    if (h % 3 === 0) continue;
    var g = el('g', { transform: 'rotate(' + ang + ')' }, marks);
    el('rect', { x: -3.4, y: -88.5, width: 6.8, height: 28, rx: 1, fill: '#16262A' }, g);
    el('rect', { x: -1.6, y: -86, width: 3.2, height: 23, rx: .6, fill: 'url(#clkGold)' }, g);
  }
  /* цифры 12, 3, 6, 9 — контуром, строгим геометрическим шрифтом */
  var nums = [['12', 0, -74], ['3', 74, 0], ['6', 0, 74], ['9', -74, 0]];
  nums.forEach(function (n) {
    el('rect', { x: n[1] - (n[0].length > 1 ? 13 : 8), y: n[2] - 12.5, width: n[0].length > 1 ? 26 : 16, height: 25, fill: '#16262A' }, marks);
    var t = el('text', { x: n[1], y: n[2] + 8.6, 'text-anchor': 'middle', 'font-size': 24, 'font-family': 'Inter, system-ui, sans-serif', 'font-weight': 300,
      fill: 'none', stroke: 'url(#clkGold)', 'stroke-width': 1.1, 'letter-spacing': '-0.5' }, marks);
    t.textContent = n[0];
  });

  /* тени стрелок — мягкие, со сдвигом вниз-вправо; сами стрелки */
  var hands = el('g', {}, svg);
  var mkHand = function (len, back, w, fill, shadow) {
    var g = el('g', {}, hands);
    if (shadow) el('rect', { x: -w / 2 + 1.2, y: -len + 1.6, width: w, height: len + back, rx: w / 2, fill: 'rgba(0,0,0,.35)' }, g);
    el('rect', { x: -w / 2, y: -len, width: w, height: len + back, rx: w / 2, fill: fill }, g);
    return g;
  };
  var hourHand = mkHand(46, 9, 4.2, 'url(#clkGold)', true);
  var minHand = mkHand(72, 11, 3, 'url(#clkGold)', true);
  /* секундная — тонкая медная, с круглым противовесом */
  var secHand = el('g', {}, hands);
  el('rect', { x: -.1, y: -78, width: 1.2, height: 100, rx: .6, fill: 'rgba(0,0,0,.3)' }, secHand);
  el('rect', { x: -.6, y: -79.6, width: 1.2, height: 100, rx: .6, fill: '#A9502C' }, secHand);
  el('circle', { cy: 16, r: 4, fill: '#A9502C' }, secHand);
  el('circle', { r: 3.6, fill: 'url(#clkGold)' }, svg);
  el('circle', { r: 1.6, fill: '#A9502C' }, svg);

  var set = function (g, deg) { g.setAttribute('transform', 'rotate(' + deg.toFixed(3) + ')'); };
  var tick = function () {
    var d = new Date();
    var ms = d.getMilliseconds(), s = d.getSeconds() + ms / 1000, m = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + m / 60;
    set(secHand, s * 6);                                       // плавный ход, без скачков
    set(minHand, m * 6);
    set(hourHand, hr * 30);
  };
  tick();

  /* идут, только пока часы на экране (карточка открыта и блок виден) */
  var raf = 0, on = false;
  var loop = function () { tick(); raf = on ? requestAnimationFrame(loop) : 0; };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setInterval(tick, 1000); return; }
  new IntersectionObserver(function (en) {
    on = en[0].isIntersecting;
    if (on && !raf) raf = requestAnimationFrame(loop);
  }, { threshold: 0 }).observe(host);
})();
