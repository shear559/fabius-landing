(function () {
  "use strict";

  /* -----------------------------------------------
     Mobile navigation
     Progressive enhancement: without this script the
     mobile-nav panel stays in normal flow and visible,
     so links are always discoverable. With JS, it is
     collapsed by default and driven by the toggle.
  ----------------------------------------------- */
  var toggle = document.querySelector('[data-testid="menu-toggle"]');
  var mobileNav = document.querySelector('[data-testid="mobile-nav"]');

  if (toggle && mobileNav) {
    mobileNav.classList.add("js-collapsed");
    toggle.setAttribute("aria-expanded", "false");

    function openNav() {
      mobileNav.classList.remove("js-collapsed");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close navigation menu");
    }

    function closeNav(returnFocus) {
      mobileNav.classList.add("js-collapsed");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeNav(false);
      } else {
        openNav();
      }
    });

    mobileNav.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (link) {
        closeNav(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeNav(true);
      }
    });
  }

  /* -----------------------------------------------
     Feature tabs
  ----------------------------------------------- */
  var tablist = document.querySelector('.tabs[role="tablist"]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function selectTab(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.setAttribute("tabindex", selected ? "0" : "-1");
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) {
          panel.hidden = !selected;
        }
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectTab(tab);
        tab.focus();
      });

      tab.addEventListener("keydown", function (event) {
        var newIndex = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          newIndex = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          newIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          newIndex = 0;
        } else if (event.key === "End") {
          newIndex = tabs.length - 1;
        }
        if (newIndex !== null) {
          event.preventDefault();
          var target = tabs[newIndex];
          selectTab(target);
          target.focus();
        }
      });
    });
  }

  /* -----------------------------------------------
     Billing toggle
  ----------------------------------------------- */
  var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
  var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
  var priceEls = [
    document.querySelector('[data-testid="price-solo"]'),
    document.querySelector('[data-testid="price-studio"]')
  ];
  var periodNote = document.getElementById("billing-period-note");

  function renderPrices(period) {
    priceEls.forEach(function (el) {
      if (!el) return;
      var amount = period === "yearly" ? el.dataset.yearly : el.dataset.monthly;
      var label = period === "yearly" ? el.dataset.periodYearly : el.dataset.periodMonthly;
      el.textContent = amount;
      var periodSpan = document.createElement("span");
      periodSpan.className = "price-period";
      periodSpan.textContent = label;
      el.appendChild(periodSpan);
    });
    if (periodNote) {
      periodNote.textContent = period === "yearly"
        ? "Billing shown yearly. Prices are fictional and for demonstration only — no payment is processed on this page."
        : "Billing shown monthly. Prices are fictional and for demonstration only — no payment is processed on this page.";
    }
  }

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener("click", function () {
      monthlyBtn.classList.add("is-active");
      monthlyBtn.setAttribute("aria-pressed", "true");
      yearlyBtn.classList.remove("is-active");
      yearlyBtn.setAttribute("aria-pressed", "false");
      renderPrices("monthly");
    });

    yearlyBtn.addEventListener("click", function () {
      yearlyBtn.classList.add("is-active");
      yearlyBtn.setAttribute("aria-pressed", "true");
      monthlyBtn.classList.remove("is-active");
      monthlyBtn.setAttribute("aria-pressed", "false");
      renderPrices("yearly");
    });
  }
})();
