/*
 * Lattice — fictional demo landing page
 * Vanilla JS enhancements only. Everything in this file is progressive
 * enhancement: the HTML already contains real content, real links and
 * real prices, so a visitor without JavaScript still sees a usable page.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initFeatureTabs();
    initBilling();
  });

  /* ----------------------------------------------------------
   * Mobile navigation
   * -------------------------------------------------------- */
  function initMobileNav() {
    var toggle = document.querySelector('[data-testid="menu-toggle"]');
    var nav = document.querySelector('[data-testid="mobile-nav"]');
    if (!toggle || !nav) return;

    // Start closed. This attribute is only added once JS is confirmed to
    // be running, so a no-JS visitor always sees the links in the page.
    nav.hidden = true;
    toggle.setAttribute("aria-expanded", "false");

    function openNav() {
      nav.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    }

    function closeNav(returnFocus) {
      nav.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (nav.hidden) {
        openNav();
      } else {
        closeNav(false);
      }
    });

    nav.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeNav(true);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !nav.hidden) {
        closeNav(true);
      }
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeNav(false);
      });
    });

    // Keep the panel closed if the viewport grows past the mobile
    // breakpoint, so state never gets stuck open behind the desktop nav.
    var mq = window.matchMedia("(min-width: 760px)");
    function handleBreakpoint(e) {
      if (e.matches) closeNav(false);
    }
    if (mq.addEventListener) {
      mq.addEventListener("change", handleBreakpoint);
    } else if (mq.addListener) {
      mq.addListener(handleBreakpoint);
    }
  }

  /* ----------------------------------------------------------
   * Feature tabs (Capture / Connect / Export)
   * -------------------------------------------------------- */
  function initFeatureTabs() {
    var tablist = document.querySelector('.tablist[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function panelFor(tab) {
      var id = tab.getAttribute("aria-controls");
      return id ? document.getElementById(id) : null;
    }

    function selectTab(tab, focusTab) {
      tabs.forEach(function (t) {
        var isSelected = t === tab;
        t.setAttribute("aria-selected", String(isSelected));
        t.tabIndex = isSelected ? 0 : -1;
        var panel = panelFor(t);
        if (panel) panel.hidden = !isSelected;
      });
      if (focusTab) tab.focus();
    }

    // Only now (JS confirmed running) do we collapse to a single panel.
    var initiallySelected = tabs.filter(function (t) {
      return t.getAttribute("aria-selected") === "true";
    })[0] || tabs[0];
    selectTab(initiallySelected, false);

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectTab(tab, false);
      });

      tab.addEventListener("keydown", function (event) {
        var newIndex = null;
        switch (event.key) {
          case "ArrowRight":
          case "ArrowDown":
            newIndex = (index + 1) % tabs.length;
            break;
          case "ArrowLeft":
          case "ArrowUp":
            newIndex = (index - 1 + tabs.length) % tabs.length;
            break;
          case "Home":
            newIndex = 0;
            break;
          case "End":
            newIndex = tabs.length - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        selectTab(tabs[newIndex], true);
      });
    });
  }

  /* ----------------------------------------------------------
   * Billing toggle (monthly / yearly)
   * -------------------------------------------------------- */
  function initBilling() {
    var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
    var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
    var priceSolo = document.querySelector('[data-testid="price-solo"]');
    var priceStudio = document.querySelector('[data-testid="price-studio"]');
    if (!monthlyBtn || !yearlyBtn || !priceSolo || !priceStudio) return;

    var prices = {
      monthly: { solo: "$12/mo", studio: "$29/mo" },
      yearly: { solo: "$108/yr", studio: "$264/yr" }
    };

    function setPeriod(period) {
      var isYearly = period === "yearly";
      priceSolo.textContent = isYearly ? prices.yearly.solo : prices.monthly.solo;
      priceStudio.textContent = isYearly ? prices.yearly.studio : prices.monthly.studio;

      monthlyBtn.setAttribute("aria-pressed", String(!isYearly));
      yearlyBtn.setAttribute("aria-pressed", String(isYearly));
      monthlyBtn.classList.toggle("is-active", !isYearly);
      yearlyBtn.classList.toggle("is-active", isYearly);
    }

    monthlyBtn.addEventListener("click", function () {
      setPeriod("monthly");
    });
    yearlyBtn.addEventListener("click", function () {
      setPeriod("yearly");
    });

    // Ensure the exact default strings match the markup on load.
    setPeriod("monthly");
  }
})();
