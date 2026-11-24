/* Shared behaviour for every MINT page */
(function () {
  'use strict';

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- videos: load + play only while visible ---------- */
  const vio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.preload === 'none') v.preload = 'auto';
        const p = v.play(); if (p && p.catch) p.catch(() => {});
      } else {
        v.pause();
      }
    }
  }, { rootMargin: '200px 0px' });
  window.MintObserveVideo = (v) => vio.observe(v);
  // every video on the site is silent
  document.querySelectorAll('video').forEach((v) => { v.muted = true; v.defaultMuted = true; v.volume = 0; });
  document.querySelectorAll('video[data-autoplay]').forEach((v) => vio.observe(v));

  /* ---------- mobile menu ---------- */
  const menu = document.getElementById('mobile-menu');
  if (menu) {
    const openBtns = document.querySelectorAll('[data-menu-open]');
    const set = (open) => {
      menu.dataset.open = String(open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
      openBtns.forEach((b) => b.setAttribute('aria-expanded', String(open)));
    };
    openBtns.forEach((b) => b.addEventListener('click', () => set(true)));
    menu.querySelectorAll('[data-menu-close]').forEach((b) => b.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---------- toast ---------- */
  const toastEl = document.getElementById('toast');
  let tt;
  window.MintToast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translate(-50%, 0)';
    clearTimeout(tt);
    tt = setTimeout(() => { toastEl.style.opacity = '0'; toastEl.style.transform = 'translate(-50%, 8px)'; }, 1600);
  };

  window.MintCopy = async (text, msg = 'Copied') => {
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (__) {}
      ta.remove();
    }
    window.MintToast(msg);
  };

  /* ---------- mouse drag for horizontal scrollers (desktop) ---------- */
  document.querySelectorAll('[data-drag-scroll], .hscroll').forEach((el) => {
    let down = false, sx = 0, sl = 0, moved = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = el.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4 && !moved) { moved = true; el.style.scrollSnapType = 'none'; el.style.cursor = 'grabbing'; }
      if (moved) el.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false; el.style.cursor = '';
      if (moved) {
        // re-enable snapping after the drag settles
        const keep = el.scrollLeft;
        el.style.scrollSnapType = '';
        el.scrollLeft = keep;
      }
    });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });
  /* ================================================================
     "Add to Claude" widget menu (landing + get-started)
     ================================================================ */
  const AGENTS = [
    { name: 'Claude', icon: 'assets/img/agents/claude.svg', w: 15, h: 15, primary: true },
    { name: 'Claude Code', icon: 'assets/img/agents/claude.svg', w: 15, h: 15 },
    { name: 'ChatGPT', icon: 'assets/img/agents/chatgpt.svg', w: 15, h: 15.2 },
    { name: 'Codex', icon: 'assets/img/agents/codex.svg', w: 15, h: 15 },
    { name: 'Grokbot', icon: 'assets/img/agents/grok.svg', w: 15, h: 15 },
    { name: 'Nebula', icon: 'assets/img/agents/nebula.svg', w: 16, h: 14.35 },
    { name: 'Instinct', instinct: true },
    { name: 'OpenClaw', icon: 'assets/img/agents/openclaw.svg', w: 15, h: 13.74 },
    { name: 'Cursor', icon: 'assets/img/agents/cursor.svg', w: 13.16, h: 15 },
    { name: 'Devin', icon: 'assets/img/agents/devin.svg', w: 13.17, h: 15 },
    { name: 'Another AI Tools' },
  ];
  // TODO: replace with the real setup prompt from docs.mint.gg
  const setupPrompt = (agent) =>
    `Set up Mint Modeler for ${agent}: follow https://docs.mint.gg/developers/modeler to install the Mint skill/MCP server, then connect my Mint account so you can generate production-ready 3D models.`;

  const list = document.querySelector('[data-agent-list]');
  if (list) {
    const copyIcon = '<img src="assets/img/agents/copy.svg" width="15" height="15" alt="" />';
    list.innerHTML = AGENTS.map((a) => {
      let icon = '';
      if (a.instinct) icon = '<span class="relative block h-[15.2px] w-[15px] rounded-full bg-white"><img src="assets/img/agents/instinct.png" class="absolute left-[5px] top-[1px] h-[13.15px] w-[5px] object-cover" alt="" /></span>';
      else if (a.icon) icon = `<img src="${a.icon}" width="${a.w}" height="${a.h}" alt="" />`;
      // icon only; on hover/focus the pill expands to "Copy setup prompt"
      const action = `<span class="copy-ic grid place-items-center">${copyIcon}</span>`
        + '<span class="copy-label whitespace-nowrap text-[13px] font-medium tracking-[-0.13px] text-[#d8d5d1]">Copy setup prompt</span>';
      return `<li>
        <button type="button" role="menuitem" data-agent="${a.name}" class="group flex w-full items-center justify-between rounded-[14px] bg-mint-panel py-1 pl-3 pr-1 transition hover:bg-[#262628]">
          <span class="flex items-center gap-2 font-medium text-[14px] leading-[1.1] tracking-[-0.56px] text-white">${icon}${a.name}</span>
          <span class="copy-pill flex h-[31px] items-center justify-center overflow-hidden rounded-btn border border-[#3b3b3b] bg-[#343435] px-3 transition-colors group-hover:border-[#555] group-hover:bg-[#3d3d3f]">${action}</span>
        </button></li>`;
    }).join('');
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-agent]');
      if (!b) return;
      window.MintCopy(setupPrompt(b.dataset.agent), `Setup prompt for ${b.dataset.agent} copied`);
    });
  }
  const toggle = document.querySelector('[data-widget-toggle]');
  const widget = document.getElementById('widget-menu');
  if (toggle && widget) {
    const set = (open) => { widget.dataset.open = String(open); toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', (e) => { e.stopPropagation(); set(widget.dataset.open !== 'true'); });
    document.addEventListener('click', (e) => { if (!widget.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

})();
