/*
 * Lattice — fictional demo landing page interactions.
 * No network calls, no dependencies. All enhancements are progressive:
 * the underlying HTML already carries navigation links, prices and FAQ
 * content, so nothing here is required to read the page.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------
   * Mobile navigation disclosure
   * ------------------------------------------------------------- */
  function initMobileNav() {
    var toggle = document.querySelector('[data-testid="menu-toggle"]');
    var nav = document.getElementById("mobile-nav");
    if (!toggle || !nav) return;

    function setOpen(isOpen) {
      nav.hidden = !isOpen;
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    }

    // Collapse by default only once JS is confirmed to be running the
    // interaction; without JS the nav stays visible and discoverable.
    setOpen(false);

    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    nav.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (link) {
        setOpen(false);
      }
    });

    // Avoid a stuck-open menu if the viewport grows past the mobile
    // breakpoint while the menu is open.
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 720) {
        setOpen(false);
      }
    });
  }

  /* ---------------------------------------------------------------
   * Feature tabs (Capture / Connect / Export)
   * ------------------------------------------------------------- */
  function initFeatureTabs() {
    var tablist = document.querySelector('.tablist[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function panelFor(tab) {
      var id = tab.getAttribute("aria-controls");
      return id ? document.getElementById(id) : null;
    }

    function selectTab(tab, moveFocus) {
      tabs.forEach(function (t) {
        var isSelected = t === tab;
        t.setAttribute("aria-selected", isSelected ? "true" : "false");
        t.tabIndex = isSelected ? 0 : -1;
        var panel = panelFor(t);
        if (panel) panel.hidden = !isSelected;
      });
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        selectTab(tab, false);
      });
    });

    tablist.addEventListener("keydown", function (event) {
      var currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex === -1) return;
      var nextIndex = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      selectTab(tabs[nextIndex], true);
    });

    // Establish the initial visible panel to match the tab already
    // marked aria-selected="true" in the markup.
    var initiallySelected = tabs.filter(function (t) {
      return t.getAttribute("aria-selected") === "true";
    })[0] || tabs[0];
    selectTab(initiallySelected, false);
  }

  /* ---------------------------------------------------------------
   * Billing toggle (monthly / yearly)
   * ------------------------------------------------------------- */
  function initBillingToggle() {
    var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
    var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
    var priceSolo = document.querySelector('[data-testid="price-solo"]');
    var priceStudio = document.querySelector('[data-testid="price-studio"]');
    var periodSolo = document.querySelector('[data-testid="price-solo-period"]');
    var periodStudio = document.querySelector('[data-testid="price-studio-period"]');
    if (!monthlyBtn || !yearlyBtn || !priceSolo || !priceStudio) return;

    var plans = {
      monthly: { solo: "$12", studio: "$29", period: "/ month" },
      yearly: { solo: "$108", studio: "$264", period: "/ year" }
    };

    function setBilling(cycle) {
      var plan = plans[cycle];
      if (!plan) return;

      priceSolo.textContent = plan.solo;
      priceStudio.textContent = plan.studio;
      if (periodSolo) periodSolo.textContent = plan.period;
      if (periodStudio) periodStudio.textContent = plan.period;

      var monthlyActive = cycle === "monthly";
      monthlyBtn.classList.toggle("is-active", monthlyActive);
      yearlyBtn.classList.toggle("is-active", !monthlyActive);
      monthlyBtn.setAttribute("aria-pressed", monthlyActive ? "true" : "false");
      yearlyBtn.setAttribute("aria-pressed", monthlyActive ? "false" : "true");
    }

    monthlyBtn.addEventListener("click", function () {
      setBilling("monthly");
    });
    yearlyBtn.addEventListener("click", function () {
      setBilling("yearly");
    });

    // Ensure the displayed values exactly match the monthly figures on
    // load, restoring them precisely whenever monthly is re-selected.
    setBilling("monthly");
  }

  function init() {
    initMobileNav();
    initFeatureTabs();
    initBillingToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
