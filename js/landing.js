/* Landing page interactions */
(function () {
  'use strict';
  const { DitherCanvas, FlowScene } = window.MintDither;

  /* ================================================================
     1. Hero — cursor-reactive pixel grid (js/hero-animation.js)
     ================================================================ */
  // js/hero-animation.js boots itself on #hero-animation

  /* ================================================================
     2. Final CTA — flowing dither terrain (Base-style)
     ================================================================ */
  const ctaCanvas = document.getElementById('cta-canvas');
  if (ctaCanvas) {
    new DitherCanvas(ctaCanvas, {
      cell: (w) => (w < 768 ? 5 : 6),
      palette: FlowScene.PALETTE,
      scene: new FlowScene(),
      pointerTarget: document.getElementById('cta-stage'),
      repel: { radius: 90, strength: 14 },
      barWidth: 0.5,
    });
  }

  /* ================================================================
     4. Showcase — coverflow carousel (center card big, sides shrink)
     ================================================================ */
  const root = document.querySelector('[data-showcase]');
  if (root) {
    const track = root.querySelector('[data-showcase-track]');
    const slides = [...track.querySelectorAll('.showcase-slide')];
    const prev = document.querySelector('[data-showcase-prev]');
    const next = document.querySelector('[data-showcase-next]');
    const dotsWrap = root.querySelector('[data-showcase-dots]');
    const SIDE = 0.759; // 803/1058 from Figma
    let W = 0, H = 0, gap = 18;
    let pos = 0, target = 0, vel = 0; // start on the first demo; neighbours wrap around
    let raf = 0;

    // posters for every slide (small jpgs); videos are attached only to the centre slide
    slides.forEach((s, i) => {
      if (s.dataset.poster) {
        const img = document.createElement('img');
        img.src = s.dataset.poster; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
        img.className = 'pointer-events-none absolute inset-0 h-full w-full object-cover';
        s.appendChild(img);
      }
      s.addEventListener('click', () => { if (!dragMoved) goSlide(i); });
    });

    // one <video> element at a time: created for the active slide, torn down when it leaves
    let inView = false, activeIdx = -1, activeVideo = null;
    function detachVideo() {
      if (!activeVideo) return;
      activeVideo.pause();
      activeVideo.removeAttribute('src');
      activeVideo.load(); // releases the network request / decoder
      activeVideo.remove();
      activeVideo = null; activeIdx = -1;
    }
    function syncVideo() {
      const idx = mod(Math.round(target));
      if (!inView) { if (activeVideo) activeVideo.pause(); return; }
      if (idx === activeIdx && activeVideo) { const p = activeVideo.play(); p && p.catch(() => {}); return; }
      detachVideo();
      const slide = slides[idx];
      if (!slide.dataset.video) return;
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
      v.loop = true; v.playsInline = true; v.setAttribute('playsinline', '');
      v.preload = 'auto'; v.disablePictureInPicture = true;
      v.className = 'pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300';
      v.addEventListener('playing', () => { v.classList.remove('opacity-0'); }, { once: true });
      v.src = slide.dataset.video;
      slide.appendChild(v);
      activeVideo = v; activeIdx = idx;
      const p = v.play(); p && p.catch(() => {});
    }
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; syncVideo(); }, { rootMargin: '150px 0px' }).observe(track);

    // dots (sm)
    if (dotsWrap) {
      dotsWrap.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Show demo ${i + 1}" class="h-1.5 w-1.5 rounded-full bg-white/25 transition-all" data-dot="${i}"></button>`).join('');
      dotsWrap.addEventListener('click', (e) => { const d = e.target.closest('[data-dot]'); if (d) goSlide(+d.dataset.dot); });
    }

    function measure() {
      const lg = window.innerWidth >= 1024;
      if (lg) {
        W = Math.min(1058, track.clientWidth * 0.7);
        H = W * (595.125 / 1058);
        gap = 18;
      } else {
        W = Math.min(304, track.clientWidth - 98);
        H = W * (171 / 304);
        gap = 12;
      }
      track.style.height = H + 'px';
      slides.forEach((s) => { s.style.width = W + 'px'; s.style.height = H + 'px'; });
      render();
    }
    const step1 = () => W / 2 + gap + (SIDE * W) / 2;
    const step2 = () => SIDE * W + gap;
    function offset(d) {
      const a = Math.abs(d);
      const x = a <= 1 ? a * step1() : step1() + (a - 1) * step2();
      return Math.sign(d) * x;
    }
    const N = slides.length;
    const mod = (n) => ((n % N) + N) % N;
    // shortest signed distance on the ring, so the carousel loops endlessly
    const ringDist = (i) => { let d = i - mod(pos); if (d > N / 2) d -= N; if (d < -N / 2) d += N; return d; };
    function render() {
      slides.forEach((s, i) => {
        const d = ringDist(i);
        const a = Math.min(Math.abs(d), 1);
        const sc = 1 - (1 - SIDE) * a;
        s.style.transform = `translate(-50%, -50%) translateX(${offset(d)}px) scale(${sc})`;
        s.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
        s.style.visibility = Math.abs(d) > 2.4 ? 'hidden' : '';
        s.style.filter = `brightness(${1 - 0.18 * a})`;
      });
      if (dotsWrap) dotsWrap.querySelectorAll('[data-dot]').forEach((d, i) => {
        const on = i === mod(target);
        d.style.width = on ? '18px' : '6px';
        d.style.background = on ? '#fff' : 'rgba(255,255,255,.25)';
      });
    }
    function animate() {
      // critically-damped spring toward target
      const k = 120, c = 2 * Math.sqrt(k);
      const dt = 1 / 60;
      const f = -k * (pos - target) - c * vel;
      vel += f * dt; pos += vel * dt;
      if (Math.abs(pos - target) < 0.0005 && Math.abs(vel) < 0.0005) { pos = target; vel = 0; render(); raf = 0; syncVideo(); return; }
      render();
      // start loading the new centre video as soon as the card is nearly in place
      if (Math.abs(pos - target) < 0.04 && mod(Math.round(target)) !== activeIdx) syncVideo();
      raf = requestAnimationFrame(animate);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(animate); }
    // go to an absolute ring position; for a slide index pick the nearest copy
    function go(i) { target = i; kick(); }
    function goSlide(i) { go(Math.round(pos) + ((i - mod(Math.round(pos)) + N + Math.floor(N / 2)) % N) - Math.floor(N / 2)); }
    prev && prev.addEventListener('click', () => go(target - 1));
    next && next.addEventListener('click', () => go(target + 1));

    // drag / swipe
    let dragging = false, dragMoved = false, sx = 0, sp = 0, lastX = 0, lastT = 0, v = 0;
    track.addEventListener('pointerdown', (e) => {
      dragging = true; dragMoved = false; sx = lastX = e.clientX; sp = pos; lastT = performance.now(); v = 0;
      cancelAnimationFrame(raf); raf = 0; vel = 0;
      track.setPointerCapture(e.pointerId);
      track.classList.add('dragging');
    });
    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 5) dragMoved = true;
      const now = performance.now();
      v = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
      pos = sp - dx / step1(); target = Math.round(pos);
      render();
    });
    const end = () => {
      if (!dragging) return;
      dragging = false; track.classList.remove('dragging');
      const fling = -v * 0.9; // px/ms -> slides
      go(Math.round(pos + fling));
      setTimeout(() => { dragMoved = false; }, 0);
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);

    // trackpad horizontal wheel
    let wheelAcc = 0, wheelT = 0;
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      wheelAcc += e.deltaX;
      const now = performance.now();
      if (Math.abs(wheelAcc) > 60 && now - wheelT > 350) {
        go(target + Math.sign(wheelAcc)); wheelAcc = 0; wheelT = now;
      }
    }, { passive: false });

    // keyboard
    root.tabIndex = 0;
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(target + 1);
      if (e.key === 'ArrowLeft') go(target - 1);
    });

    new ResizeObserver(measure).observe(track);
    measure();
  }
})();

/* ---------- "Built for you" row: prev / next buttons (lg only) ---------- */
(() => {
  const row = document.querySelector('[data-built-row]');
  const prev = document.querySelector('[data-built-prev]');
  const next = document.querySelector('[data-built-next]');
  if (!row || !prev || !next) return;
  const step = () => {
    const card = row.querySelector('article');
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : row.clientWidth * 0.8;
  };
  const update = () => {
    const max = row.scrollWidth - row.clientWidth;
    prev.disabled = row.scrollLeft <= 2;
    next.disabled = row.scrollLeft >= max - 2;
  };
  prev.addEventListener('click', () => row.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => row.scrollBy({ left: step(), behavior: 'smooth' }));
  row.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(row);
  update();
})();
