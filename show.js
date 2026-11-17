/* Блок 8 «Баннеры, наружка, соцсети» — по мотивам Amber (ismamz, Codrops «Parallel page transitions»).
   Работы стоят в рамках на круглой вращающейся подставке (three.js). Подставка поворачивается и выводит вперёд
   следующую работу; подпись внизу по центру меняется как в Amber: название в медной плашке уходит буквами вниз
   и выезжает снизу, вид работы поднимается из-под маски, заметка печатается по буквам.
   Подставку можно крутить мышью или пальцем, по боковой работе — щелчок, внизу — полоски-указатель.
   Идёт само, пока блок на экране. */
import * as THREE from 'three';

const sec = document.querySelector('[data-show]');
const gsap = window.gsap;
if (sec && gsap) init();

function init() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let QUINT = 'im-quint-inout', QUART = 'im-quart-inout';
  if (window.CustomEase) {
    gsap.registerPlugin(window.CustomEase);
    window.CustomEase.create(QUINT, '.76, 0, .2, 1');
    window.CustomEase.create(QUART, '0.65, 0.01, 0.05, 0.99');
  } else { QUINT = 'power4.inOut'; QUART = 'power3.inOut'; }

  /* ---------- работы: из скрытого списка в разметке ---------- */
  const works = Array.from(sec.querySelectorAll('.show__works li')).map((li) => ({
    src: li.dataset.src, w: +li.dataset.w, h: +li.dataset.h,
    type: li.dataset.type, name: li.dataset.name, note: li.dataset.note, alt: li.textContent.trim(),
  }));
  const total = works.length;
  if (!total) return;
  const STEP = (Math.PI * 2) / total;

  /* ---------- подпись: разбивка на буквы (слова не рвутся) ---------- */
  const nameEl = sec.querySelector('.show__name-text');
  const nameBlock = sec.querySelector('.show__name-block');
  const typeEl = sec.querySelector('.show__type-text');
  const noteEl = sec.querySelector('.show__note');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const words = (text, cls) => text.split(' ').map((w) => '<span class="sw">' + Array.from(w).map((c) => '<span class="' + cls + '">' + esc(c) + '</span>').join('') + '</span>').join(' ');
  const split = (el, text, cls) => { el.innerHTML = words(text, cls); return Array.from(el.querySelectorAll('.' + cls)); };
  const typeHtml = (el, text) => {                       // «Афиша:» — плотнее, остальное — обычным
    const i = text.indexOf(':');
    const head = i > 0 ? text.slice(0, i + 1) : '', rest = i > 0 ? text.slice(i + 1).trim() : text;
    el.innerHTML = (head ? '<b class="show__type-head">' + words(head, 'tc') + '</b> ' : '') + words(rest, 'tc');
    return Array.from(el.querySelectorAll('.tc'));
  };
  let shown = -1, busy = false, pending = -1;
  const cap = { name: [], type: [], note: [] };
  const fill = (i) => {
    cap.name = split(nameEl, works[i].name, 'nc');
    cap.type = typeHtml(typeEl, works[i].type);
    cap.note = split(noteEl, works[i].note, 'tw');
    gsap.set(cap.name, { yPercent: 105 }); gsap.set(cap.type, { yPercent: 140 }); gsap.set(cap.note, { autoAlpha: 0 });
  };
  const after = () => { busy = false; if (pending >= 0 && pending !== shown) { const p = pending; pending = -1; showCaption(p); } else pending = -1; };
  const enterCaption = () => {
    const tl = gsap.timeline({ onComplete: after });
    const d = reduce ? 0 : 0.85;
    tl.fromTo(nameBlock, { scaleX: 0 }, { scaleX: 1, duration: d, ease: QUART }, 0);
    tl.to(cap.name, { yPercent: 0, duration: d, ease: QUART, stagger: { amount: reduce ? 0 : 0.22 } }, reduce ? 0 : 0.3);
    tl.to(cap.type, { yPercent: 0, duration: reduce ? 0 : 0.55, ease: QUART, stagger: { amount: reduce ? 0 : 0.16 } }, reduce ? 0 : 0.2);
    tl.to(cap.note, { autoAlpha: 1, duration: 0, stagger: { each: reduce ? 0 : 0.018 } }, reduce ? 0 : 0.45);
  };
  const showCaption = (i) => {
    if (i === shown) return;
    if (busy) { pending = i; return; }
    busy = true;
    const first = shown < 0;
    shown = i;
    mark(i);
    if (first) { fill(i); enterCaption(); return; }
    const tl = gsap.timeline({ onComplete: () => { fill(shown); enterCaption(); } });
    const d = reduce ? 0 : 0.51;
    tl.to(cap.name, { yPercent: 105, duration: d, ease: QUINT, stagger: { amount: reduce ? 0 : 0.13, from: 'end' } }, 0);
    tl.to(nameBlock, { scaleX: 0, duration: d, ease: QUINT }, reduce ? 0 : 0.31);
    tl.to(cap.type, { yPercent: -160, duration: reduce ? 0 : 0.3, ease: QUINT, stagger: { amount: reduce ? 0 : 0.1 } }, reduce ? 0 : 0.06);
    tl.to(cap.note, { autoAlpha: 0, duration: 0, stagger: { each: reduce ? 0 : 0.007, from: 'end' } }, 0);
  };

  /* ---------- указатель: полоски, бегунок переезжает к текущей ---------- */
  const runner = sec.querySelector('.show__ind-run');
  const btns = Array.from(sec.querySelectorAll('.show__ind-btn'));
  const bars = Array.from(sec.querySelectorAll('.show__ind-bar'));
  function mark(i) {
    btns.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    if (bars[i] && runner) gsap.to(runner, { x: bars[i].offsetLeft, duration: reduce ? 0 : 0.32, ease: 'power2.inOut' });
  }

  /* ---------- сцена ---------- */
  const stage = sec.querySelector('.show__stage');
  const canvas = sec.querySelector('.show__canvas');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  if (!renderer) {                                        // без WebGL — просто первая работа картинкой
    stage.classList.add('is-flat');
    const im = new Image(); im.src = works[0].src; im.alt = works[0].alt; im.className = 'show__flat'; stage.appendChild(im);
    showCaption(0);
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  scene.add(new THREE.HemisphereLight(0xf3ece0, 0x0b1517, 1.1));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  key.position.set(-6, 11, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9a27a, 1.1);   // тёплый контровой — медь по краям рамок
  rim.position.set(6, 4, -7);
  scene.add(rim);
  const fillL = new THREE.DirectionalLight(0xdfe9ea, 0.6);
  fillL.position.set(7, 3, 6);
  scene.add(fillL);

  /* подставка: тёмная бирюза, сетка тонкими молочными линиями с крестиками (как у Amber), медный обод */
  const R = 5.2;
  const world = new THREE.Group();
  scene.add(world);
  const platform = new THREE.Group();
  world.add(platform);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R * 1.01, 0.32, 160),
    new THREE.MeshPhysicalMaterial({ color: 0x14262b, roughness: 0.55, metalness: 0.12, clearcoat: 0.2, clearcoatRoughness: 0.6 }),
  );
  base.position.y = -0.16;
  base.receiveShadow = true;
  platform.add(base);
  const gridTex = (() => {
    const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, '#26404a'); rg.addColorStop(0.7, '#1c3238'); rg.addColorStop(1, '#14262b');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.clip();
    const N = 22, cell = S / N;
    g.strokeStyle = 'rgba(232, 220, 200, .07)'; g.lineWidth = 1.5;
    for (let k = 0; k <= N; k++) { g.beginPath(); g.moveTo(k * cell, 0); g.lineTo(k * cell, S); g.stroke(); g.beginPath(); g.moveTo(0, k * cell); g.lineTo(S, k * cell); g.stroke(); }
    g.strokeStyle = 'rgba(232, 220, 200, .32)'; g.lineWidth = 2.5;
    const arm = cell * 0.3;
    for (let x = 0; x <= N; x += 4) for (let y = 0; y <= N; y += 4) {
      const px = (x + 1) * cell, py = (y + 1) * cell;
      g.beginPath(); g.moveTo(px - arm, py); g.lineTo(px + arm, py); g.moveTo(px, py - arm); g.lineTo(px, py + arm); g.stroke();
    }
    g.restore();
    g.strokeStyle = 'rgba(232, 220, 200, .18)'; g.lineWidth = 3;
    g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    return t;
  })();
  const top = new THREE.Mesh(new THREE.CircleGeometry(R * 0.995, 160), new THREE.MeshStandardMaterial({ map: gridTex, roughness: 0.78, metalness: 0.05 }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.002;
  top.receiveShadow = true;
  platform.add(top);
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.993, R * 1.004, 160), new THREE.MeshStandardMaterial({ color: 0xa9502c, roughness: 0.35, metalness: 0.55, emissive: 0x3a1a0c }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.006;
  platform.add(ring);

  /* рамка: тёмная кромка, паспарту фирменной бирюзы, скос, работа целиком (как в галерее ниже) */
  const PH = 2.7, MAT = 0.15, DEPTH = 0.08, RAD = 3.55;
  const frames = [];
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x0b1517, roughness: 0.5, metalness: 0.2 });
  const standMat = new THREE.MeshStandardMaterial({ color: 0x0f1d20, roughness: 0.45, metalness: 0.3 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xa9502c, roughness: 0.35, metalness: 0.6 });
  const faceTexture = (pw, img) => {
    const scale = 1100 / (PH + 2 * MAT);
    const W = Math.round((pw + 2 * MAT) * scale), H = Math.round((PH + 2 * MAT) * scale);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, W * 0.3, H);
    lg.addColorStop(0, '#2a444a'); lg.addColorStop(0.45, '#1a2c30'); lg.addColorStop(1, '#102024');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(201, 162, 122, .28)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
    const m = MAT * scale, bev = m * 0.32;
    const bg = g.createLinearGradient(0, m - bev, 0, H - m + bev);
    bg.addColorStop(0, '#070f10'); bg.addColorStop(0.4, '#0f1c1f'); bg.addColorStop(0.85, '#2a4248'); bg.addColorStop(1, '#3a565c');
    g.fillStyle = bg; g.fillRect(m - bev, m - bev, W - 2 * (m - bev), H - 2 * (m - bev));
    if (img) g.drawImage(img, m, m, W - 2 * m, H - 2 * m);
    else { g.fillStyle = '#0b1517'; g.fillRect(m, m, W - 2 * m, H - 2 * m); }
    const sh = g.createLinearGradient(0, m, 0, m + bev * 2.6);
    sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(m, m, W - 2 * m, bev * 2.6);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; g.strokeRect(m, m, W - 2 * m, H - 2 * m);
    return c;
  };
  let dirty = true;
  works.forEach((wk, i) => {
    const pw = PH * (wk.w / wk.h);
    const fw = pw + 2 * MAT, fh = PH + 2 * MAT;
    const item = new THREE.Group();
    const a = i * STEP;
    item.position.set(Math.sin(a) * RAD, 0, Math.cos(a) * RAD);
    item.userData = { a, index: i };
    const lift = new THREE.Group();                         // точка опоры — у основания: работа «встаёт» из подставки
    item.add(lift);
    /* постамент: тёмная плита с медной полоской спереди */
    const plinthW = fw * 0.92;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(plinthW, 0.16, 0.62), standMat);
    plinth.position.y = 0.08; plinth.castShadow = true; plinth.receiveShadow = true;
    lift.add(plinth);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(plinthW * 0.999, 0.025, 0.012), copperMat);
    strip.position.set(0, 0.11, 0.311);
    lift.add(strip);
    /* рамка чуть откинута назад, сзади — подпорка */
    const tilt = new THREE.Group();
    tilt.position.set(0, 0.16, 0.06);
    tilt.rotation.x = -0.06;
    lift.add(tilt);
    const tex = new THREE.CanvasTexture(faceTexture(pw, null));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.02 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, DEPTH), [edgeMat, edgeMat, edgeMat, edgeMat, faceMat, edgeMat]);
    body.position.y = fh / 2;
    body.castShadow = true;
    body.userData.index = i;
    tilt.add(body);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, fh * 0.5, 0.04), standMat);
    strut.position.set(0, fh * 0.25, -0.2); strut.rotation.x = 0.36; strut.castShadow = true;
    lift.add(strut);
    platform.add(item);
    frames.push({ item, lift, body });
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { tex.image = faceTexture(pw, im); tex.needsUpdate = true; dirty = true; };
    im.src = wk.src;
  });

  /* ---------- вращение ---------- */
  const st = { rot: 0 };
  const wrap = (x) => { x = (x + Math.PI) % (Math.PI * 2); if (x < 0) x += Math.PI * 2; return x - Math.PI; };
  const nearest = (target, from) => from + wrap(target - from);
  const indexAt = (rot) => ((Math.round(-rot / STEP) % total) + total) % total;
  let spin = null, active = 0;
  const place = () => {
    platform.rotation.y = st.rot;
    frames.forEach((f) => {
      const wa = wrap(st.rot + f.item.userData.a);            // где работа сейчас: 0 — впереди
      f.item.rotation.y = f.item.userData.a - wa * 0.55;        // боковые развёрнуты к зрителю вполоборота
      f.item.visible = Math.abs(wa) < 2.5;                       // та, что точно сзади, не выглядывает из-за передней
    });
  };
  const HOLD = 5.2;
  let timer = null, visible = false, started = false, drag = null;
  const schedule = () => {
    if (timer) timer.kill();
    if (reduce) return;
    timer = gsap.delayedCall(HOLD, () => { if (visible && !drag) goTo((active + 1) % total); });
    if (!visible) timer.pause();
  };
  const goTo = (i, opts) => {
    const target = nearest(-i * STEP, st.rot);
    if (spin) spin.kill();
    if (timer) timer.kill();
    showCaption(i);
    active = i;
    spin = gsap.to(st, { rot: target, duration: reduce ? 0 : (opts && opts.fast ? 0.9 : 1.6), ease: QUART, onUpdate: () => { dirty = true; }, onComplete: () => { spin = null; schedule(); } });
  };

  /* ---------- камера: передняя работа целиком, подпись — на переднем крае подставки ---------- */
  let phone = false;
  const fit = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    phone = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
    renderer.setPixelRatio(Math.min(phone ? 2 : 1.5, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fh = PH + 2 * MAT + 0.16;
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const needH = fh * (phone ? 1.5 : 1.95), needW = (PH * 0.75 + 2 * MAT) * (phone ? 1.6 : 2.2);
    const dist = Math.max(needH / (2 * vt), needW / (2 * vt * camera.aspect));
    const elev = THREE.MathUtils.degToRad(phone ? 11 : 13);
    const target = new THREE.Vector3(0, fh * (phone ? 0.3 : 0.12), RAD * 0.55);
    camera.position.set(0, target.y + Math.sin(elev) * dist, target.z + Math.cos(elev) * dist);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    dirty = true;
  };
  fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);

  /* ---------- мышь / палец: тянуть — крутить, щелчок по боковой работе — к ней ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(frames.map((f) => f.body), false)[0];
    return hit ? hit.object.userData.index : -1;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!started) return;
    drag = { x: e.clientX, y: e.clientY, rot: st.rot, moved: false, horiz: null, t: performance.now(), v: 0, lx: e.clientX };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) {
      if (e.target === canvas && started && e.pointerType === 'mouse') { const i = pick(e); canvas.style.cursor = i >= 0 && i !== active ? 'pointer' : 'grab'; }
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.horiz === null && Math.hypot(dx, dy) > 6) drag.horiz = Math.abs(dx) > Math.abs(dy);
    if (!drag.horiz) return;
    if (!drag.moved) {
      drag.moved = true;
      if (spin) spin.kill(); spin = null;
      if (timer) timer.kill();
      canvas.classList.add('is-drag');
    }
    const now = performance.now();
    drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.t); drag.t = now; drag.lx = e.clientX;
    st.rot = drag.rot + dx * (phone ? 0.011 : 0.0055);
    dirty = true;
    const i = indexAt(st.rot);
    if (i !== shown) showCaption(i);
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    canvas.classList.remove('is-drag');
    if (d.moved) {
      const fling = THREE.MathUtils.clamp(d.v * (phone ? 0.25 : 0.12), -STEP * 0.9, STEP * 0.9);
      goTo(indexAt(st.rot + fling), { fast: true });
      return;
    }
    if (e.target === canvas) { const i = pick(e); if (i >= 0 && i !== active) goTo(i); }
  });
  window.addEventListener('pointercancel', () => {
    if (!drag) return;
    const d = drag; drag = null;
    canvas.classList.remove('is-drag');
    if (d.moved) goTo(indexAt(st.rot), { fast: true });
  });
  btns.forEach((b, i) => b.addEventListener('click', () => { if (started && i !== active) goTo(i); }));

  /* ---------- заход в блок: подставка выезжает снизу с поворотом, работы встают по очереди ---------- */
  const intro = () => {
    started = true;
    const tl = gsap.timeline({ onUpdate: () => { dirty = true; }, onComplete: schedule });
    if (!reduce) {
      st.rot = 1.4;
      tl.fromTo(world.position, { y: -2.2 }, { y: 0, duration: 1.6, ease: QUART }, 0);
      tl.fromTo(world.scale, { x: 0.7, y: 0.7, z: 0.7 }, { x: 1, y: 1, z: 1, duration: 1.6, ease: QUART }, 0);
      tl.to(st, { rot: 0, duration: 2, ease: QUART }, 0);
      frames.forEach((f, k) => tl.fromTo(f.lift.scale, { y: 0.001 }, { y: 1, duration: 0.9, ease: QUART }, 0.5 + k * 0.1));
      tl.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0);
    }
    showCaption(0);
    if (!reduce) {
      /* шапка: заголовок встаёт из-под строки, мелкие подписи печатаются, плашки вспыхивают как табло */
      gsap.fromTo(sec.querySelectorAll('.show__head .story__reveal'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: QUART, delay: 0.1 });
      [sec.querySelector('.show__sub'), sec.querySelector('.show__kicker')].forEach((el, k) => {
        if (!el) return;
        const ch = split(el, el.textContent, 'hc');
        gsap.fromTo(ch, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0, stagger: 0.025, delay: k ? 0.7 : 0 });
      });
      sec.querySelectorAll('.show__tag, .show__head .btn-frame').forEach((el, k) => {
        gsap.fromTo(el, { autoAlpha: 0 }, { keyframes: { autoAlpha: [0, 1, 0.15, 1, 0.4, 1], easeEach: 'steps(1)' }, duration: 0.32, ease: 'none', delay: 0.5 + k * 0.08 });
      });
    }
  };

  /* ---------- отрисовка: только пока блок виден и что-то меняется ---------- */
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!dirty) return;
    dirty = false;
    place();
    renderer.render(scene, camera);
  };
  if (!reduce) gsap.set(canvas, { autoAlpha: 0 });
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) {
      if (!raf) { dirty = true; raf = requestAnimationFrame(loop); }
      if (!started) intro(); else if (timer) timer.resume();
    } else {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (timer) timer.pause();
    }
  }, { threshold: 0.25 }).observe(sec);
  document.addEventListener('visibilitychange', () => {
    if (!timer) return;
    if (document.hidden) timer.pause(); else if (visible) timer.resume();
  });
  place();
}
