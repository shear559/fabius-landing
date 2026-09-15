(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Mobile nav ---------------- */
  var menuToggle = document.querySelector('[data-testid="menu-toggle"]');
  var mobileNav = document.querySelector('[data-testid="mobile-nav"]');

  function openMobileNav() {
    mobileNav.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
  }
  function closeMobileNav(returnFocus) {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuToggle.focus();
  }

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function () {
      if (mobileNav.hidden) {
        openMobileNav();
      } else {
        closeMobileNav(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !mobileNav.hidden) {
        closeMobileNav(true);
      }
    });

    mobileNav.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (link) closeMobileNav(false);
    });
  }

  /* ---------------- Feature tabs ---------------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = {
    'tab-capture': document.getElementById('panel-capture'),
    'tab-connect': document.getElementById('panel-connect'),
    'tab-export': document.getElementById('panel-export')
  };

  function activateTab(tab) {
    tabs.forEach(function (t) {
      var isActive = t === tab;
      t.setAttribute('aria-selected', String(isActive));
      t.tabIndex = isActive ? 0 : -1;
      var panel = panels[t.id];
      if (panel) panel.hidden = !isActive;
    });
    tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      activateTab(tab);
    });
    tab.addEventListener('keydown', function (event) {
      var newIndex = null;
      if (event.key === 'ArrowRight') newIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') newIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') newIndex = 0;
      else if (event.key === 'End') newIndex = tabs.length - 1;
      if (newIndex !== null) {
        event.preventDefault();
        activateTab(tabs[newIndex]);
      }
    });
  });

  /* ---------------- Billing toggle ---------------- */
  var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
  var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
  var priceSolo = document.querySelector('[data-testid="price-solo"]');
  var priceStudio = document.querySelector('[data-testid="price-studio"]');
  var periodLabels = document.querySelectorAll('[data-period-label]');

  var prices = {
    monthly: { solo: '$12', studio: '$29', unit: '/mo', label: 'billed monthly' },
    yearly: { solo: '$108', studio: '$264', unit: '/yr', label: 'billed yearly' }
  };

  function setPriceElement(el, amount, unit) {
    var valueEl = el.querySelector('.price-value');
    var unitEl = el.querySelector('.price-unit');
    if (valueEl) valueEl.textContent = amount;
    if (unitEl) unitEl.textContent = unit;
  }

  function setBilling(period) {
    var data = prices[period];
    setPriceElement(priceSolo, data.solo, data.unit);
    setPriceElement(priceStudio, data.studio, data.unit);
    periodLabels.forEach(function (el) { el.textContent = data.label; });
    monthlyBtn.setAttribute('aria-pressed', String(period === 'monthly'));
    yearlyBtn.setAttribute('aria-pressed', String(period === 'yearly'));
  }

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener('click', function () { setBilling('monthly'); });
    yearlyBtn.addEventListener('click', function () { setBilling('yearly'); });
  }

  /* ---------------- Hero scene demonstration ---------------- */
  var scene = document.getElementById('hero-scene');
  var sceneToggle = document.getElementById('scene-toggle');
  var sceneToggleIcon = document.getElementById('scene-toggle-icon');
  var sceneToggleLabel = document.getElementById('scene-toggle-label');
  var sceneRestart = document.getElementById('scene-restart');
  var sceneStatus = document.getElementById('scene-status');

  var stages = [
    { key: 'capture', label: 'Showing: Capture — a note is saved with its source attached.' },
    { key: 'connect', label: 'Showing: Connect — related notes link together.' },
    { key: 'export', label: 'Showing: Export — the project exports to Markdown.' }
  ];
  var stageIndex = 0;
  var playing = false;
  var timer = null;

  function renderStage() {
    var stage = stages[stageIndex];
    scene.setAttribute('data-stage', stage.key);
    sceneStatus.textContent = stage.label;
  }

  function advanceStage() {
    stageIndex = (stageIndex + 1) % stages.length;
    renderStage();
  }

  function setPlaying(next) {
    playing = next;
    sceneToggle.setAttribute('aria-pressed', String(playing));
    sceneToggleLabel.textContent = playing ? 'Pause demonstration' : 'Play demonstration';
    sceneToggleIcon.querySelector('use').setAttribute('href', playing ? '#icon-pause' : '#icon-play');
    if (timer) { clearInterval(timer); timer = null; }
    if (playing && !reduceMotion) {
      timer = setInterval(advanceStage, 2600);
    }
  }

  if (scene && sceneToggle && sceneRestart) {
    sceneToggle.addEventListener('click', function () {
      if (reduceMotion) {
        advanceStage();
        return;
      }
      setPlaying(!playing);
    });

    sceneRestart.addEventListener('click', function () {
      stageIndex = 0;
      renderStage();
      if (playing && !reduceMotion) {
        setPlaying(true);
      }
    });

    if (reduceMotion) {
      sceneToggleLabel.textContent = 'Show next stage';
    }

    renderStage();
  }
})();
