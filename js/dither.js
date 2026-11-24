/* =====================================================================
   MINT dither engine
   - DitherCanvas : grid renderer (vertical-bar glyphs, ordered dither,
                    cursor repulsion, DPR aware, pauses when off-screen)
   - FlowScene    : flowing noise terrain (final CTA, Base-style)
   No dependencies. Exposes window.MintDither.
   ===================================================================== */
(function () {
  'use strict';

  const BAYER = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
  ].map((v) => (v + 0.5) / 16);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /*  Value noise / fbm                                                 */
  /* ---------------------------------------------------------------- */
  const PERM = new Uint8Array(512);
  (function seed() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = 1337;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  })();
  const fade = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = PERM[PERM[X] + Y] / 255, b = PERM[PERM[X + 1] + Y] / 255;
    const c = PERM[PERM[X] + Y + 1] / 255, d = PERM[PERM[X + 1] + Y + 1] / 255;
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    return vnoise(x, y) * 0.55 + vnoise(x * 2.03, y * 2.01) * 0.3 + vnoise(x * 4.1, y * 3.97) * 0.15;
  }

  /* ---------------------------------------------------------------- */
  /*  DitherCanvas                                                      */
  /* ---------------------------------------------------------------- */
  class DitherCanvas {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} opts
     *   cell(width)     -> cell size in css px
     *   palette         -> array of css colors, index 1..n (0 = empty)
     *   scene           -> object with resize(dc) and frame(dc, t, dt)
     *   pointerTarget   -> element that receives pointer events (defaults canvas parent)
     *   repel           -> { radius, strength }
     */
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({ repel: { radius: 120, strength: 26 }, barWidth: 0.42 }, opts);
      this.scene = opts.scene;
      this.palette = opts.palette;
      this.mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, inside: false, nx: 0, ny: 0, snx: 0, sny: 0, down: 0 };
      this.running = false;
      this.visible = true;
      this.t = 0;
      this._last = 0;
      this._bind();
      this.resize();
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas.parentElement);
      this._io = new IntersectionObserver((e) => {
        this.visible = e[0].isIntersecting;
        if (this.visible) this.start(); else this.stop();
      }, { rootMargin: '100px' });
      this._io.observe(canvas);
      if (reduceMotion) { this.renderOnce(); }
    }

    _bind() {
      const target = this.opts.pointerTarget || this.canvas.parentElement;
      const update = (cx, cy) => {
        const r = this.canvas.getBoundingClientRect();
        this.mouse.x = cx - r.left;
        this.mouse.y = cy - r.top;
        this.mouse.inside = this.mouse.x >= 0 && this.mouse.y >= 0 && this.mouse.x <= r.width && this.mouse.y <= r.height;
        this.mouse.nx = (this.mouse.x / r.width) * 2 - 1;
        this.mouse.ny = (this.mouse.y / r.height) * 2 - 1;
        this._lastMove = performance.now();
      };
      // listen on window so the effect keeps tracking while the cursor is over text/buttons
      window.addEventListener('pointermove', (e) => update(e.clientX, e.clientY), { passive: true });
      target.addEventListener('pointerdown', (e) => { update(e.clientX, e.clientY); this.mouse.down = 1; });
      window.addEventListener('pointerup', () => { this.mouse.down = 0; });
      target.addEventListener('pointerleave', () => { this.mouse.inside = false; });
    }

    resize() {
      const parent = this.canvas.parentElement;
      const w = parent.clientWidth, h = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = w; this.h = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.cell = typeof this.opts.cell === 'function' ? this.opts.cell(w) : this.opts.cell;
      this.cols = Math.ceil(w / this.cell) + 1;
      this.rows = Math.ceil(h / this.cell) + 1;
      const n = this.cols * this.rows;
      this.I = new Float32Array(n);   // intensity 0..1
      this.C = new Uint8Array(n);     // colour class (scene defined)
      this.Z = new Float32Array(n);   // depth buffer
      if (this.scene.resize) this.scene.resize(this);
      if (reduceMotion) this.renderOnce();
    }

    start() {
      if (this.running || reduceMotion) return;
      this.running = true;
      this._last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        const dt = Math.min(0.05, (now - this._last) / 1000);
        this._last = now;
        this.t += dt;
        this.step(dt);
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
    stop() { this.running = false; cancelAnimationFrame(this._raf); }
    renderOnce() { this.t = 1.2; this.step(0.016); }

    step(dt) {
      const m = this.mouse;
      // smoothed pointer (normalised + px)
      const k = 1 - Math.pow(0.0008, dt);
      m.snx += (m.nx - m.snx) * k;
      m.sny += (m.ny - m.sny) * k;
      if (m.sx < -1000) { m.sx = m.x; m.sy = m.y; }
      const kp = 1 - Math.pow(0.00002, dt);
      m.sx += (m.x - m.sx) * kp;
      m.sy += (m.y - m.sy) * kp;
      this.I.fill(0);
      this.C.fill(0);
      this.Z.fill(-1e9);
      this.scene.frame(this, this.t, dt);
      this.draw();
    }

    draw() {
      const { ctx, cols, rows, cell, I, C, dpr, palette } = this;
      const m = this.mouse;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);

      const paths = palette.map(() => new Path2D());
      const bw = Math.max(1, cell * this.opts.barWidth);
      const R = this.opts.repel.radius, S = this.opts.repel.strength;
      const R2 = R * R;
      const mx = m.sx, my = m.sy;
      const active = m.inside;
      const dim = this.scene.dimAt ? this.scene.dimAt.bind(this.scene) : null;

      for (let r = 0; r < rows; r++) {
        const by = (r & 3) * 4;
        const cy = r * cell + cell * 0.5;
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          let v = I[idx];
          if (v <= 0.01) continue;
          let cx = c * cell + cell * 0.5;
          let ox = 0, oy = 0;
          if (active) {
            const dx = cx - mx, dy = cy - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              const d = Math.sqrt(d2) || 1;
              const f = 1 - d / R;
              const p = f * f * S;
              ox = (dx / d) * p;
              oy = (dy / d) * p;
              v = Math.min(1, v + f * 0.35); // cursor "heats" the pixels
            }
          }
          if (dim) v *= dim(cx, cy);
          // ordered dither threshold
          if (v < BAYER[by + (c & 3)] * 0.92 + 0.04) continue;
          const col = C[idx];
          if (!col) continue;
          const h = cell * (0.28 + 0.72 * Math.min(1, v));
          paths[col].rect(cx + ox - bw * 0.5, cy + oy - h * 0.5, bw, h);
        }
      }
      for (let i = 1; i < palette.length; i++) {
        ctx.fillStyle = palette[i];
        ctx.fill(paths[i]);
      }
      if (this.scene.overlay) this.scene.overlay(this, ctx);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  FlowScene – drifting dithered terrain (final CTA)                */
  /* ---------------------------------------------------------------- */
  class FlowScene {
    resize(dc) { this.mobile = dc.w < 768; }
    frame(dc, t) {
      const { cols, rows, cell, I, C } = dc;
      const m = dc.mouse;
      const mx = m.sx / cell, my = m.sy / cell;
      const mobile = this.mobile;
      for (let r = 0; r < rows; r++) {
        const yN = r / rows;
        for (let c = 0; c < cols; c++) {
          const xN = c / cols;
          // mask: concentrate on the right, and along the bottom like a horizon
          const mask = mobile
            ? Math.max(0, (yN - 0.66) * 3.2) + Math.max(0, (0.16 - yN) * 3) * xN
            : Math.max(0, (xN - 0.5) * 2.6) * (0.6 + yN * 0.8) + Math.max(0, (yN - 0.78) * 3.4) * (0.3 + xN * 0.9);
          if (mask <= 0.02) continue;
          // domain warp toward cursor
          let wx = 0, wy = 0;
          if (m.inside) {
            const dx = c - mx, dy = r - my;
            const d = Math.sqrt(dx * dx + dy * dy);
            const f = Math.max(0, 1 - d / 22);
            wx = -dx * f * 0.25; wy = -dy * f * 0.25;
          }
          const n = fbm((c + wx) * 0.045 + t * 0.22, (r + wy) * 0.11 - t * 0.04);
          let v = (n - 0.34) * 3.4 * Math.min(1.2, mask);
          if (v <= 0.03) continue;
          v = Math.min(1, v);
          const idx = r * cols + c;
          I[idx] = v;
          C[idx] = v > 0.82 ? 4 : v > 0.62 ? 3 : v > 0.38 ? 2 : 1;
        }
      }
    }
  }
  FlowScene.PALETTE = [null, '#ff5b47', '#ff8a78', '#ffc7be', '#ffffff'];

  window.MintDither = { DitherCanvas, FlowScene, fbm };
})();
