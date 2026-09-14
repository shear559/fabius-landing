'use strict';

document.documentElement.classList.add('js');

// Keep the mobile disclosure in sync with its visible state.
const menuToggle = document.querySelector('[data-testid="menu-toggle"]');
const mobileNav = document.querySelector('[data-testid="mobile-nav"]');
menuToggle.hidden = false;
function closeMenu(returnFocus = false) {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  if (returnFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
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
const mobileViewport = window.matchMedia('(max-width: 620px)');
mobileViewport.addEventListener('change', event => {
  if (!event.matches) closeMenu();
});

// Automatic-activation tabs with roving keyboard focus.
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectFeature(selected, moveFocus = false) {
  tabs.forEach(tab => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
  if (moveFocus) selected.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectFeature(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectFeature(tabs[next], true);
    }
  });
});
selectFeature(tabs[0]);

// Show totals for the actual billing period, never monthly equivalents.
const billingSwitch = document.querySelector('.billing-switch');
const monthlyButton = document.querySelector('[data-testid="billing-monthly"]');
const yearlyButton = document.querySelector('[data-testid="billing-yearly"]');
const soloPrice = document.querySelector('[data-testid="price-solo"]');
const studioPrice = document.querySelector('[data-testid="price-studio"]');
billingSwitch.hidden = false;
const priceGrid = document.querySelector('.pricing-grid');
priceGrid.setAttribute('aria-live', 'polite');
priceGrid.setAttribute('aria-atomic', 'false');
function setBilling(yearly) {
  monthlyButton.setAttribute('aria-pressed', String(!yearly));
  yearlyButton.setAttribute('aria-pressed', String(yearly));
  soloPrice.textContent = yearly ? '$108' : '$12';
  studioPrice.textContent = yearly ? '$264' : '$29';
  document.querySelectorAll('.price-period').forEach(period => {
    period.textContent = yearly ? '/ year' : '/ month';
  });
  document.querySelectorAll('.billing-description').forEach(description => {
    description.textContent = yearly ? 'Billed yearly, in one payment.' : 'Billed monthly.';
  });
  const references = document.querySelectorAll('.annual-reference');
  references[0].textContent = yearly ? 'Or $12 per month with monthly billing.' : 'Or $108 per year with yearly billing.';
  references[1].textContent = yearly ? 'Or $29 per month with monthly billing.' : 'Or $264 per year with yearly billing.';
}
monthlyButton.addEventListener('click', () => setBilling(false));
yearlyButton.addEventListener('click', () => setBilling(true));
