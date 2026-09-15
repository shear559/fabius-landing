(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Mobile navigation
   * ------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  var menuToggle = document.querySelector('[data-testid="menu-toggle"]');
  var mobileNav = document.getElementById("mobile-nav");

  if (header && menuToggle && mobileNav) {
    header.classList.add("js-enhanced");

    function closeMenu(returnFocus) {
      header.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
      if (returnFocus) menuToggle.focus();
    }

    function openMenu() {
      header.classList.add("nav-open");
      menuToggle.setAttribute("aria-expanded", "true");
    }

    menuToggle.addEventListener("click", function () {
      var isOpen = header.classList.contains("nav-open");
      if (isOpen) closeMenu(false);
      else openMenu();
    });

    mobileNav.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu(true);
      }
    });

    mobileNav.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (link) closeMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("nav-open")) {
        closeMenu(true);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Feature tabs
   * ------------------------------------------------------------------ */
  var tablist = document.querySelector('[role="tablist"]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function selectTab(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectTab(tab);
      });
      tab.addEventListener("keydown", function (event) {
        var newIndex = null;
        if (event.key === "ArrowRight") newIndex = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") newIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") newIndex = 0;
        else if (event.key === "End") newIndex = tabs.length - 1;
        if (newIndex !== null) {
          event.preventDefault();
          selectTab(tabs[newIndex]);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Billing toggle
   * ------------------------------------------------------------------ */
  var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
  var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
  var priceSolo = document.querySelector('[data-testid="price-solo"]');
  var priceStudio = document.querySelector('[data-testid="price-studio"]');
  var periodSolo = document.querySelector('[data-testid="period-solo"]');
  var periodStudio = document.querySelector('[data-testid="period-studio"]');

  var prices = {
    monthly: { solo: "$12", studio: "$29", period: "/month" },
    yearly: { solo: "$108", studio: "$264", period: "/year" }
  };

  function setBilling(period) {
    var isMonthly = period === "monthly";
    priceSolo.textContent = prices[period].solo;
    priceStudio.textContent = prices[period].studio;
    periodSolo.textContent = prices[period].period;
    periodStudio.textContent = prices[period].period;

    monthlyBtn.classList.toggle("is-active", isMonthly);
    monthlyBtn.setAttribute("aria-pressed", String(isMonthly));
    yearlyBtn.classList.toggle("is-active", !isMonthly);
    yearlyBtn.setAttribute("aria-pressed", String(!isMonthly));
  }

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener("click", function () { setBilling("monthly"); });
    yearlyBtn.addEventListener("click", function () { setBilling("yearly"); });
  }

  /* ------------------------------------------------------------------ *
   * Hero workflow demonstration (play / pause / restart)
   * ------------------------------------------------------------------ */
  var scene = document.querySelector(".hero-scene");
  if (scene) {
    var states = ["capture", "connect", "export"];
    var stepDuration = 3000;
    var stateIndex = 0;
    var timer = null;
    var toggleBtn = scene.querySelector('[data-action="toggle"]');
    var restartBtn = scene.querySelector('[data-action="restart"]');
    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function applyState() {
      scene.dataset.state = states[stateIndex];
    }

    function advance() {
      stateIndex = (stateIndex + 1) % states.length;
      applyState();
    }

    function play() {
      if (timer) return;
      scene.classList.add("is-playing");
      toggleBtn.setAttribute("aria-pressed", "true");
      toggleBtn.querySelector(".scene-btn-label").textContent = "Pause";
      timer = window.setInterval(advance, stepDuration);
    }

    function pause() {
      scene.classList.remove("is-playing");
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.querySelector(".scene-btn-label").textContent = "Play";
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function restart() {
      stateIndex = 0;
      applyState();
    }

    toggleBtn.addEventListener("click", function () {
      if (timer) pause();
      else play();
    });

    restartBtn.addEventListener("click", function () {
      restart();
    });

    applyState();
    if (!prefersReducedMotion) {
      play();
    }
  }
})();
