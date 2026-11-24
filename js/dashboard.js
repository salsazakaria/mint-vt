/* Dashboard: collapsible sidebar, asset tabs, account menu */
(function () {
  'use strict';
  const sidebar = document.getElementById('sidebar');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const openBtn = document.querySelector('[data-sidebar-open]');
  const backdrop = document.querySelector('[data-sidebar-backdrop]');
  const lg = window.matchMedia('(min-width: 1024px)');

  /* ---------- desktop collapse / mobile drawer ---------- */
  function setCollapsed(collapsed) {
    sidebar.dataset.collapsed = String(collapsed);
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    try { localStorage.setItem('mint.sidebar', collapsed ? 'collapsed' : 'expanded'); } catch (e) {}
  }
  function setDrawer(open) {
    sidebar.dataset.open = String(open);
    backdrop.classList.toggle('hidden', !open);
    openBtn.setAttribute('aria-expanded', String(open));
  }
  // initial state
  let saved = null;
  try { saved = localStorage.getItem('mint.sidebar'); } catch (e) {}
  sidebar.dataset.collapsed = String(saved === 'collapsed');
  toggle.setAttribute('aria-expanded', String(saved !== 'collapsed'));
  // the inline <head> script only applies to desktop; clear it on mobile so the drawer is full width
  const syncMq = () => { if (!lg.matches) { document.documentElement.dataset.sidebar = 'expanded'; } else { document.documentElement.dataset.sidebar = sidebar.dataset.collapsed === 'true' ? 'collapsed' : 'expanded'; setDrawer(false); } };
  lg.addEventListener('change', syncMq); syncMq();

  toggle.addEventListener('click', () => {
    if (lg.matches) setCollapsed(sidebar.dataset.collapsed !== 'true');
    else setDrawer(false);
  });
  openBtn.addEventListener('click', () => setDrawer(true));
  backdrop.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.dataset.open === 'true') setDrawer(false);
    // Cmd/Ctrl + B toggles the sidebar
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (lg.matches) setCollapsed(sidebar.dataset.collapsed !== 'true');
      else setDrawer(sidebar.dataset.open !== 'true');
    }
  });

  /* ---------- asset tabs → empty state ---------- */
  const nav = document.querySelector('[data-asset-nav]');
  const title = document.querySelector('[data-empty-title]');
  const noun = document.querySelector('[data-empty-noun]');
  const icon = document.querySelector('[data-empty-icon]');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-asset]');
    if (!b) return;
    nav.querySelectorAll('[data-asset]').forEach((x) => x.removeAttribute('aria-current'));
    b.setAttribute('aria-current', 'page');
    const name = b.dataset.asset;
    title.textContent = `No ${name} Yet`;
    noun.textContent = name;
    icon.src = b.dataset.icon === 'models' ? 'assets/img/dash/cube-lg.svg' : `assets/img/dash/${b.dataset.icon}.svg`;
    document.title = `${name} — Mint Modeler`;
    if (!lg.matches) setDrawer(false);
  });

  /* ---------- refresh ---------- */
  const refresh = document.querySelector('[data-refresh]');
  const rIcon = document.querySelector('[data-refresh-icon]');
  refresh.addEventListener('click', () => {
    rIcon.classList.remove('hidden'); rIcon.classList.add('spin'); refresh.disabled = true;
    // TODO: replace with the real assets API call
    setTimeout(() => {
      rIcon.classList.add('hidden'); rIcon.classList.remove('spin'); refresh.disabled = false;
      window.MintToast && window.MintToast('You’re up to date');
    }, 900);
  });

  /* ---------- account menu ---------- */
  const accBtn = document.querySelector('[data-account-toggle]');
  const accMenu = document.getElementById('account-menu');
  accBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = accMenu.dataset.open !== 'true';
    accMenu.dataset.open = String(open); accBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => { if (!accMenu.contains(e.target)) { accMenu.dataset.open = 'false'; accBtn.setAttribute('aria-expanded', 'false'); } });

  /* ---------- light / dark theme ---------- */
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const themeLabel = document.querySelector('[data-theme-label]');
  function applyTheme(light) {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    themeBtn.setAttribute('aria-checked', String(light));
    themeLabel.textContent = light ? 'Dark Theme' : 'Light Theme';
    document.querySelector('[data-theme-icon="sun"]').classList.toggle('hidden', light);
    document.querySelector('[data-theme-icon="moon"]').classList.toggle('hidden', !light);
    try { localStorage.setItem('mint.theme', light ? 'light' : 'dark'); } catch (e) {}
  }
  applyTheme(document.documentElement.dataset.theme === 'light');
  themeBtn.addEventListener('click', (e) => { e.stopPropagation(); applyTheme(document.documentElement.dataset.theme !== 'light'); });
})();
