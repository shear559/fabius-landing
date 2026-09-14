(function () {
  "use strict";

  /* ------------------------------------------------------------
     Mobile navigation disclosure.
     Markup ships with the nav visible (no-JS: content stays
     discoverable). On load we collapse it behind the toggle and
     wire the interactive disclosure pattern.
  ------------------------------------------------------------ */
  function initMobileNav() {
    var toggle = document.querySelector('[data-testid="menu-toggle"]');
    var nav = document.querySelector('[data-testid="mobile-nav"]');
    if (!toggle || !nav) return;

    function close(returnFocus) {
      nav.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      if (returnFocus) toggle.focus();
    }

    function open() {
      nav.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    }

    // Start collapsed once script has run.
    close(false);

    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) {
        close(false);
      } else {
        open();
      }
    });

    nav.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        close(true);
      }
    });

    nav.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (link) close(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        close(true);
      }
    });
  }

  /* ------------------------------------------------------------
     Feature tabs. Markup ships with all three panels visible
     (no-JS: content stays discoverable). On load we apply proper
     tab semantics: hide inactive panels, roving tabindex, arrows.
  ------------------------------------------------------------ */
  function initTabs() {
    var tablist = document.querySelector('[data-tabs] [role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function panelFor(tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    }

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
        var panel = panelFor(t);
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    }

    // Apply initial state: first tab active, matching its aria-selected="true" default.
    var initiallySelected = tabs.filter(function (t) {
      return t.getAttribute("aria-selected") === "true";
    })[0] || tabs[0];
    select(initiallySelected, false);

    tablist.addEventListener("click", function (event) {
      var tab = event.target.closest('[role="tab"]');
      if (tab) select(tab, false);
    });

    tablist.addEventListener("keydown", function (event) {
      var currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex === -1) return;
      var nextIndex = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      select(tabs[nextIndex], true);
    });
  }

  /* ------------------------------------------------------------
     Billing toggle. Prices are fixed fictional strings per plan
     and period; switching just swaps the stored text, so
     returning to monthly restores the exact original values.
  ------------------------------------------------------------ */
  function initBilling() {
    var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
    var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
    var live = document.querySelector("[data-billing-live]");
    if (!monthlyBtn || !yearlyBtn) return;

    var prices = Array.prototype.slice.call(document.querySelectorAll(".price-value"));
    var suffixes = Array.prototype.slice.call(document.querySelectorAll("[data-price-suffix]"));

    function setPeriod(period) {
      prices.forEach(function (el) {
        el.textContent = el.getAttribute("data-" + period);
      });
      suffixes.forEach(function (el) {
        el.textContent = period === "monthly" ? "/ month" : "/ year";
      });
      monthlyBtn.setAttribute("aria-pressed", period === "monthly" ? "true" : "false");
      yearlyBtn.setAttribute("aria-pressed", period === "yearly" ? "true" : "false");
      if (live) {
        live.textContent = period === "monthly" ? "Showing monthly billing." : "Showing yearly billing.";
      }
    }

    monthlyBtn.addEventListener("click", function () { setPeriod("monthly"); });
    yearlyBtn.addEventListener("click", function () { setPeriod("yearly"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initTabs();
    initBilling();
  });
})();
