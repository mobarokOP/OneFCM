/* OneFCM landing — shared behaviour: theme, reveal, tabs, copy, mobile menu */
(function () {
  // ---------- theme ----------
  const root = document.documentElement;
  const saved = localStorage.getItem('onefcm-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));

  window.toggleTheme = function () {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('onefcm-theme', next);
  };

  document.addEventListener('DOMContentLoaded', function () {
    // ---------- scroll reveal ----------
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // ---------- copy buttons ----------
    document.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pre = btn.closest('.code')?.querySelector('pre');
        if (!pre) return;
        navigator.clipboard.writeText(pre.innerText).then(() => {
          btn.classList.add('ok');
          const t = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.classList.remove('ok'); btn.textContent = t; }, 1600);
        });
      });
    });

    // ---------- tabs ----------
    document.querySelectorAll('[data-tabs]').forEach((group) => {
      const name = group.getAttribute('data-tabs');
      group.querySelectorAll('.tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          group.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          document.querySelectorAll(`[data-tab-panel][data-group="${name}"]`).forEach((p) => {
            p.classList.toggle('active', p.getAttribute('data-tab-panel') === tab.getAttribute('data-tab'));
          });
        });
      });
    });

    // ---------- mobile menu ----------
    const menuBtn = document.querySelector('.menu-btn');
    const mobile = document.querySelector('.mobile-menu');
    if (menuBtn && mobile) {
      if (!mobile.id) mobile.id = 'mobile-menu';
      menuBtn.setAttribute('aria-controls', mobile.id);
      menuBtn.setAttribute('aria-expanded', 'false');
      const setMenu = (open) => {
        mobile.classList.toggle('open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
      };
      menuBtn.addEventListener('click', () => setMenu(!mobile.classList.contains('open')));
      mobile.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
      // close on outside tap
      document.addEventListener('click', (e) => {
        if (mobile.classList.contains('open') && !mobile.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
      });
      // close on Escape, return focus to the button
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobile.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
      });
      // never leave the menu stuck open when growing past the mobile breakpoint
      const desktop = window.matchMedia('(min-width: 901px)');
      (desktop.addEventListener || desktop.addListener).call(desktop, (e) => e.matches && setMenu(false));
    }

    // ---------- docs: active section highlighting ----------
    const sideLinks = document.querySelectorAll('.docs-side a[href^="#"]');
    if (sideLinks.length) {
      const side = document.querySelector('.docs-side');
      // when the sidebar renders as the horizontal strip (mobile), keep the active link in view
      const revealActive = (a) => {
        if (!side || side.scrollWidth <= side.clientWidth + 4) return;
        side.scrollTo({ left: a.offsetLeft - (side.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
      };
      const sections = [...sideLinks].map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              sideLinks.forEach((a) => {
                const on = a.getAttribute('href') === '#' + e.target.id;
                a.classList.toggle('active', on);
                if (on) revealActive(a);
              });
            }
          });
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );
      sections.forEach((s) => spy.observe(s));
    }
  });
})();
