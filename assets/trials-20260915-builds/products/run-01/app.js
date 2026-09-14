(function () {
  "use strict";

  var html = document.documentElement;
  html.classList.add("js");

  /* -----------------------------------------------------------
     Mobile navigation
  ----------------------------------------------------------- */
  var menuToggle = document.querySelector('[data-testid="menu-toggle"]');
  var mobileNav = document.querySelector('[data-testid="mobile-nav"]');

  if (menuToggle && mobileNav) {
    // Start closed once JS is in control; markup stays visible for no-JS users.
    mobileNav.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");

    var openMenu = function () {
      mobileNav.hidden = false;
      menuToggle.setAttribute("aria-expanded", "true");
    };

    var closeMenu = function (opts) {
      mobileNav.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      if (opts && opts.returnFocus) {
        menuToggle.focus();
      }
    };

    menuToggle.addEventListener("click", function () {
      var isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    mobileNav.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu({ returnFocus: true });
      }
    });

    menuToggle.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
      }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });
  }

  /* -----------------------------------------------------------
     Feature tabs
  ----------------------------------------------------------- */
  var tabList = document.querySelector(".tablist");
  if (tabList) {
    var tabs = Array.prototype.slice.call(tabList.querySelectorAll('[role="tab"]'));

    var selectTab = function (tab, moveFocus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
        t.classList.toggle("is-selected", selected);

        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) {
          panel.hidden = !selected;
        }
      });
      if (moveFocus) {
        tab.focus();
      }
    };

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectTab(tab, false);
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
          selectTab(tabs[newIndex], true);
        }
      });
    });
  }

  /* -----------------------------------------------------------
     Pricing billing toggle
  ----------------------------------------------------------- */
  var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
  var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
  var priceEls = [
    document.querySelector('[data-testid="price-solo"]'),
    document.querySelector('[data-testid="price-studio"]')
  ];
  var periodEls = [
    document.querySelector('[data-testid="period-solo"]'),
    document.querySelector('[data-testid="period-studio"]')
  ];

  if (monthlyBtn && yearlyBtn) {
    var setBilling = function (period) {
      var isYearly = period === "yearly";

      priceEls.forEach(function (el) {
        if (!el) return;
        el.textContent = isYearly ? el.getAttribute("data-yearly") : el.getAttribute("data-monthly");
      });
      periodEls.forEach(function (el) {
        if (!el) return;
        el.textContent = isYearly ? "/ year" : "/ month";
      });

      monthlyBtn.classList.toggle("is-active", !isYearly);
      monthlyBtn.setAttribute("aria-pressed", (!isYearly).toString());
      yearlyBtn.classList.toggle("is-active", isYearly);
      yearlyBtn.setAttribute("aria-pressed", isYearly.toString());
    };

    monthlyBtn.addEventListener("click", function () { setBilling("monthly"); });
    yearlyBtn.addEventListener("click", function () { setBilling("yearly"); });
  }
})();
