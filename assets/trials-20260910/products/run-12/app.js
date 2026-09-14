'use strict';

// Progressive enhancement: navigation, all feature panels and both prices are
// available in the HTML before the interactive controls are enabled.
const menuToggle = document.querySelector('[data-testid="menu-toggle"]');
const mobileNav = document.querySelector('[data-testid="mobile-nav"]');
const mobileQuery = window.matchMedia('(max-width: 760px)');

function setMenu(open, returnFocus = false) {
  mobileNav.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  if (returnFocus) menuToggle.focus();
}
setMenu(false);
menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});
mobileNav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    event.preventDefault();
    setMenu(false, true);
  }
});
mobileQuery.addEventListener('change', () => setMenu(false));

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(selected, focus = false) {
  tabs.forEach(tab => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
  if (focus) selected.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectTab(tabs[next], true);
    }
  });
});
selectTab(tabs[0]);

const monthlyButton = document.querySelector('[data-testid="billing-monthly"]');
const yearlyButton = document.querySelector('[data-testid="billing-yearly"]');
const prices = {
  monthly: { solo: '$12', studio: '$29', period: '/ month' },
  yearly: { solo: '$108', studio: '$264', period: '/ year' }
};
function setBilling(period) {
  const yearly = period === 'yearly';
  monthlyButton.setAttribute('aria-pressed', String(!yearly));
  yearlyButton.setAttribute('aria-pressed', String(yearly));
  for (const plan of ['solo', 'studio']) {
    document.querySelector(`[data-testid="price-${plan}"]`).textContent = prices[period][plan];
    document.querySelector(`[data-plan="${plan}"]`).textContent = yearly
      ? `Billed yearly. Or ${prices.monthly[plan]} billed monthly.`
      : `Billed monthly. Or ${prices.yearly[plan]} billed yearly.`;
  }
  document.querySelectorAll('.price-period').forEach(label => label.textContent = prices[period].period);
  document.getElementById('billing-announcement').textContent = yearly
    ? 'Yearly billing selected. Solo: $108 per year. Studio: $264 per year.'
    : 'Monthly billing selected. Solo: $12 per month. Studio: $29 per month.';
}
monthlyButton.addEventListener('click', () => setBilling('monthly'));
yearlyButton.addEventListener('click', () => setBilling('yearly'));
document.documentElement.classList.add('js');
