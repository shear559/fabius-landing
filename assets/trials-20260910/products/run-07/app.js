'use strict';

// Enhance an already-readable page; without JavaScript all feature content remains available.
const menuToggle = document.querySelector('[data-testid="menu-toggle"]');
const mobileNav = document.querySelector('[data-testid="mobile-nav"]');
function closeMenu(returnFocus = false) {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  if (returnFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const opening = mobileNav.hidden;
  mobileNav.hidden = !opening;
  menuToggle.setAttribute('aria-expanded', String(opening));
  menuToggle.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
});
mobileNav.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    event.preventDefault();
    closeMenu(true);
  }
});
window.matchMedia('(min-width: 700px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

const tablist = document.querySelector('.feature-tabs');
const tabs = [...tablist.querySelectorAll('[role="tab"]')];
function selectFeature(selectedTab) {
  tabs.forEach(tab => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tab.id);
  panel.tabIndex = 0;
  tab.addEventListener('click', () => selectFeature(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectFeature(tabs[next]);
    tabs[next].focus();
  });
});
selectFeature(tabs[0]);

const billingControl = document.querySelector('.billing-control');
const monthly = document.querySelector('[data-testid="billing-monthly"]');
const yearly = document.querySelector('[data-testid="billing-yearly"]');
function setBilling(isYearly) {
  monthly.setAttribute('aria-pressed', String(!isYearly));
  yearly.setAttribute('aria-pressed', String(isYearly));
  document.querySelector('[data-testid="price-solo"]').textContent = isYearly ? '$108' : '$12';
  document.querySelector('[data-testid="price-studio"]').textContent = isYearly ? '$264' : '$29';
  document.querySelectorAll('.price-period').forEach(period => {
    period.textContent = isYearly ? '/ year' : '/ month';
  });
  document.querySelectorAll('.billing-description').forEach(description => {
    description.textContent = isYearly ? 'Billed yearly. Fictional pricing.' : 'Billed monthly. Fictional pricing.';
  });
}
monthly.addEventListener('click', () => setBilling(false));
yearly.addEventListener('click', () => setBilling(true));
menuToggle.hidden = false;
tablist.hidden = false;
billingControl.hidden = false;
document.documentElement.classList.add('js');
