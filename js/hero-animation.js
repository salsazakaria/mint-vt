/*
 * Mint hero animation — cursor-reactive pixel grid (base.org style).
 * A field of dim square "pixels" that light up in white / Mint red around the
 * cursor and leave a fading trail. Touch devices get a slow ambient shimmer.
 */
(() => {
  const root = document.getElementById('hero-animation');
  if (!root) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'block size-full';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const COLORS = {
    dot: 'rgba(255,255,255,0.07)',
    white: [255, 255, 255],
    red: [242, 65, 46], // #f2412e
  };
  const RADIUS = 170;   // cursor influence radius (px)
  const DECAY = 0.955;  // trail fade per frame
  const RED_SHARE = 0.28;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  let w = 0, h = 0, dpr = 1, cell = 14, cols = 0, rows = 0;
  let energy, tint;            // per-cell state
  let dotLayer;                // pre-rendered idle grid
  let running = false, visible = true, raf = 0;
  const pointer = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };

  // Deterministic per-cell hash so colours don't flicker
  const hash = (i) => {
    let x = (i * 2654435761) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
    return (x >>> 0) / 4294967295;
  };

  function resize() {
    const rect = root.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cell = w < 768 ? 12 : 14;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    cols = Math.ceil(w / cell) + 1;
    rows = Math.ceil(h / cell) + 1;
    energy = new Float32Array(cols * rows);
    tint = new Uint8Array(cols * rows);
    for (let i = 0; i < tint.length; i++) tint[i] = hash(i + 7) < RED_SHARE ? 1 : 0;

    // Idle dot grid, drawn once
    dotLayer = document.createElement('canvas');
    dotLayer.width = canvas.width;
    dotLayer.height = canvas.height;
    const d = dotLayer.getContext('2d');
    d.scale(dpr, dpr);
    d.fillStyle = COLORS.dot;
    const s = 2;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        d.fillRect(x * cell + (cell - s) / 2, y * cell + (cell - s) / 2, s, s);

    draw(performance.now());
  }

  function update(t) {
    // Smooth the cursor so the trail glides
    pointer.sx += (pointer.x - pointer.sx) * 0.18;
    pointer.sy += (pointer.y - pointer.sy) * 0.18;

    const r2 = RADIUS * RADIUS;
    const ambient = !pointer.active;
    const time = t * 0.00035;

    for (let y = 0; y < rows; y++) {
      const cy = y * cell + cell / 2;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const cx = x * cell + cell / 2;
        let e = energy[i] * DECAY;

        if (pointer.active) {
          const dx = cx - pointer.sx, dy = cy - pointer.sy;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < r2) {
            const f = 1 - Math.sqrt(dist2) / RADIUS;
            // Sparse, pixelated falloff: some cells near the edge stay off
            const jitter = hash(i) * 0.5;
            const v = f * f * (1.25 - jitter);
            if (v > e) e = v;
          }
        }

        if (ambient) {
          // Two slow drifting waves give a gentle shimmer
          const n = Math.sin(cx * 0.012 + time * 3) * Math.cos(cy * 0.016 - time * 2)
                  + Math.sin((cx + cy) * 0.006 + time * 1.4);
          const v = Math.max(0, n - 1.15) * 0.6 * (hash(i + 3) > 0.45 ? 1 : 0);
          if (v > e) e = v;
        }

        energy[i] = e < 0.004 ? 0 : e;
      }
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(dotLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (let i = 0; i < energy.length; i++) {
      const e = energy[i];
      if (!e) continue;
      const x = (i % cols) * cell, y = ((i / cols) | 0) * cell;
      const level = Math.min(1, e);
      // Quantise size so it reads as pixels, not blobs
      const size = Math.max(2, Math.round((2 + level * (cell - 4)) / 2) * 2);
      const [r, g, b] = tint[i] && level > 0.35 ? COLORS.red : COLORS.white;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.08 + level * 0.82})`;
      ctx.fillRect(x + (cell - size) / 2, y + (cell - size) / 2, size, size);
    }
  }

  function frame(t) {
    update(t);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Pointer tracking — the slot sits behind the content, so listen on window
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && finePointer) return;
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    if (inside && !pointer.active) { pointer.sx = x; pointer.sy = y; }
    pointer.x = x; pointer.y = y; pointer.active = inside;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer.active = false; });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(root);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  resize();
  start();
})();
