(() => {
  'use strict';
  const toggle = document.querySelector('[data-testid="menu-toggle"]');
  const mobileNav = document.querySelector('[data-testid="mobile-nav"]');
  const desktop = window.matchMedia('(min-width: 64rem)');
  function setMenu(open, restoreFocus = false) {
    mobileNav.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (restoreFocus) toggle.focus();
  }
  setMenu(false);
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false, true);
    }
  });
  mobileNav.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    setMenu(false);
    document.querySelector(link.getAttribute('href'))?.focus({ preventScroll: true });
  });
  desktop.addEventListener('change', () => setMenu(false));

  const tabList = document.querySelector('.feature-tabs');
  const tabs = [...tabList.querySelectorAll('a')];
  const panels = tabs.map(tab => document.querySelector(tab.getAttribute('href')));
  tabList.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
  });
  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => {
      event.preventDefault();
      selectTab(index);
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (event.key === ' ') next = index;
      if (next !== undefined) {
        event.preventDefault();
        selectTab(next, true);
      }
    });
  });
  const initialPanel = panels.findIndex(panel => '#' + panel.id === window.location.hash);
  selectTab(initialPanel < 0 ? 0 : initialPanel);

  const monthly = document.querySelector('[data-testid="billing-monthly"]');
  const yearly = document.querySelector('[data-testid="billing-yearly"]');
  const solo = document.querySelector('[data-testid="price-solo"]');
  const studio = document.querySelector('[data-testid="price-studio"]');
  // Announce each complete price, including its unit, when billing changes.
  document.querySelectorAll('.price-row').forEach(row => {
    row.setAttribute('aria-live', 'polite');
    row.setAttribute('aria-atomic', 'true');
  });
  function setBilling(isYearly) {
    monthly.setAttribute('aria-pressed', String(!isYearly));
    yearly.setAttribute('aria-pressed', String(isYearly));
    solo.textContent = isYearly ? '$108' : '$12';
    studio.textContent = isYearly ? '$264' : '$29';
    document.querySelectorAll('.price-period').forEach(period => {
      period.textContent = isYearly ? '/ year' : '/ month';
    });
    document.querySelectorAll('.billing-note').forEach(note => {
      note.textContent = isYearly ? 'Billed yearly in USD.' : 'Billed monthly in USD.';
    });
  }
  monthly.addEventListener('click', () => setBilling(false));
  yearly.addEventListener('click', () => setBilling(true));
  document.documentElement.classList.add('js');
})();
