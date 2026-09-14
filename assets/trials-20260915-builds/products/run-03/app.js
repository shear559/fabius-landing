(function () {
  "use strict";

  // Mark that JS is running. CSS uses this to switch the mobile nav and
  // feature panels from "always visible" (no-JS fallback) to "interactive".
  document.documentElement.classList.add("js");

  /* ---------------- Mobile navigation ---------------- */

  var menuToggle = document.querySelector('[data-testid="menu-toggle"]');
  var mobileNav = document.querySelector('[data-testid="mobile-nav"]');

  function openMobileNav() {
    mobileNav.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeMobileNav(returnFocus) {
    mobileNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    if (returnFocus) {
      menuToggle.focus();
    }
  }

  function isMobileNavOpen() {
    return mobileNav.classList.contains("is-open");
  }

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      if (isMobileNavOpen()) {
        closeMobileNav(false);
      } else {
        openMobileNav();
      }
    });

    mobileNav.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileNav(true);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isMobileNavOpen()) {
        closeMobileNav(true);
      }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMobileNav(false);
      });
    });
  }

  /* ---------------- Feature tabs ---------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

  function selectTab(tab, moveFocus) {
    tabs.forEach(function (t) {
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      var selected = t === tab;
      t.setAttribute("aria-selected", selected ? "true" : "false");
      t.setAttribute("tabindex", selected ? "0" : "-1");
      if (panel) {
        panel.classList.toggle("is-active", selected);
      }
    });
    if (moveFocus) {
      tab.focus();
    }
  }

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

  /* ---------------- Billing toggle ---------------- */

  var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
  var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
  var priceSolo = document.querySelector('[data-testid="price-solo"]');
  var priceStudio = document.querySelector('[data-testid="price-studio"]');
  var periodLabel = document.querySelector('[data-testid="billing-period-label"]');

  function setBilling(period) {
    var isYearly = period === "yearly";

    monthlyBtn.classList.toggle("is-active", !isYearly);
    monthlyBtn.setAttribute("aria-pressed", String(!isYearly));
    yearlyBtn.classList.toggle("is-active", isYearly);
    yearlyBtn.setAttribute("aria-pressed", String(isYearly));

    var key = isYearly ? "yearly" : "monthly";
    priceSolo.textContent = priceSolo.dataset[key];
    priceStudio.textContent = priceStudio.dataset[key];

    periodLabel.textContent = isYearly
      ? "Prices shown are billed yearly."
      : "Prices shown are billed monthly.";
  }

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener("click", function () {
      setBilling("monthly");
    });
    yearlyBtn.addEventListener("click", function () {
      setBilling("yearly");
    });
  }
})();
