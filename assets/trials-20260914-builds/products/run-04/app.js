(function () {
  "use strict";

  /* ----------------------------------------------------------
     Mobile navigation
     Default markup (no JS) leaves #mobile-nav visible in the
     flow so the links are discoverable without JavaScript.
     JS collapses it into a real disclosure widget.
     ---------------------------------------------------------- */
  function initMobileNav() {
    var toggle = document.querySelector('[data-testid="menu-toggle"]');
    var nav = document.getElementById("mobile-nav");
    if (!toggle || !nav) return;

    toggle.setAttribute("aria-expanded", "false");
    nav.hidden = true;

    function open() {
      nav.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    }
    function close(opts) {
      nav.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (opts && opts.refocus) toggle.focus();
    }
    function isOpen() {
      return !nav.hidden;
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) {
        close({ refocus: false });
      } else {
        open();
      }
    });

    nav.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") {
        close({ refocus: true });
      }
    });

    nav.addEventListener("click", function (evt) {
      var link = evt.target.closest("a");
      if (link) close({ refocus: false });
    });

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && isOpen()) {
        close({ refocus: true });
      }
    });
  }

  /* ----------------------------------------------------------
     Feature tabs
     Default markup (no JS) shows all three panels stacked so
     the content is discoverable without JavaScript. JS hides
     the inactive panels and wires the standard tabs pattern.
     ---------------------------------------------------------- */
  function initFeatureTabs() {
    var tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function panelFor(tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    }

    function select(tab, focusTab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
        var panel = panelFor(t);
        if (panel) panel.hidden = !selected;
      });
      if (focusTab) tab.focus();
    }

    // Initial state: first tab selected, others hidden.
    select(tabs[0], false);

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        select(tab, false);
      });

      tab.addEventListener("keydown", function (evt) {
        var targetIndex = null;
        if (evt.key === "ArrowRight" || evt.key === "ArrowDown") {
          targetIndex = (index + 1) % tabs.length;
        } else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp") {
          targetIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (evt.key === "Home") {
          targetIndex = 0;
        } else if (evt.key === "End") {
          targetIndex = tabs.length - 1;
        }
        if (targetIndex !== null) {
          evt.preventDefault();
          select(tabs[targetIndex], true);
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Billing toggle
     Default markup (no JS) already shows the monthly prices as
     static text, so pricing is discoverable without JavaScript.
     ---------------------------------------------------------- */
  function initBilling() {
    var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
    var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
    if (!monthlyBtn || !yearlyBtn) return;

    var prices = {
      monthly: {
        solo: "$12",
        studio: "$29",
        period: "/month"
      },
      yearly: {
        solo: "$108",
        studio: "$264",
        period: "/year, billed annually"
      }
    };

    var soloAmount = document.querySelector('[data-testid="price-solo"]');
    var studioAmount = document.querySelector('[data-testid="price-studio"]');
    var soloPeriod = document.querySelector('[data-testid="price-solo-period"]');
    var studioPeriod = document.querySelector('[data-testid="price-studio-period"]');

    function apply(period) {
      var set = prices[period];
      if (soloAmount) soloAmount.textContent = set.solo;
      if (studioAmount) studioAmount.textContent = set.studio;
      if (soloPeriod) soloPeriod.textContent = set.period;
      if (studioPeriod) studioPeriod.textContent = set.period;
      monthlyBtn.setAttribute("aria-pressed", period === "monthly" ? "true" : "false");
      yearlyBtn.setAttribute("aria-pressed", period === "yearly" ? "true" : "false");
    }

    monthlyBtn.addEventListener("click", function () { apply("monthly"); });
    yearlyBtn.addEventListener("click", function () { apply("yearly"); });

    // Markup already ships the exact monthly values; re-assert once so a
    // page saved/edited mid-toggle always starts from a known state.
    apply("monthly");
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initFeatureTabs();
    initBilling();
  });
})();
