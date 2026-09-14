(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  var menuToggle = document.querySelector('[data-testid="menu-toggle"]');
  var mobileNav = document.querySelector('[data-testid="mobile-nav"]');

  function openMobileNav() {
    mobileNav.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeMobileNav(returnFocus) {
    mobileNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    if (returnFocus) menuToggle.focus();
  }

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) closeMobileNav(false);
      else openMobileNav();
    });

    mobileNav.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileNav(true);
      }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMobileNav(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        closeMobileNav(true);
      }
    });
  }

  /* ---------- Feature tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

  function selectTab(tab, focusTab) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute("aria-selected", selected ? "true" : "false");
      t.tabIndex = selected ? 0 : -1;
      t.classList.toggle("is-selected", selected);
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
    });
    if (focusTab) tab.focus();
  }

  if (tabs.length) {
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

    // Initialize: only the first tab's panel stays visible once JS runs.
    var initialSelected = tabs.find(function (t) { return t.getAttribute("aria-selected") === "true"; }) || tabs[0];
    selectTab(initialSelected, false);
  }

  /* ---------- Billing toggle ---------- */
  var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
  var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
  var priceSolo = document.querySelector('[data-testid="price-solo"]');
  var priceStudio = document.querySelector('[data-testid="price-studio"]');
  var periodEls = document.querySelectorAll("[data-price-period]");
  var announce = document.querySelector("[data-billing-announce]");

  var PRICES = {
    monthly: { solo: "$12", studio: "$29", period: "/month", label: "Monthly billing" },
    yearly: { solo: "$108", studio: "$264", period: "/year", label: "Yearly billing" }
  };

  function setBilling(mode) {
    var data = PRICES[mode];
    if (!priceSolo || !priceStudio) return;

    priceSolo.textContent = data.solo;
    priceStudio.textContent = data.studio;
    periodEls.forEach(function (el) { el.textContent = data.period; });

    monthlyBtn.setAttribute("aria-pressed", mode === "monthly" ? "true" : "false");
    yearlyBtn.setAttribute("aria-pressed", mode === "yearly" ? "true" : "false");
    monthlyBtn.classList.toggle("is-active", mode === "monthly");
    yearlyBtn.classList.toggle("is-active", mode === "yearly");

    if (announce) announce.textContent = data.label + " selected.";
  }

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener("click", function () { setBilling("monthly"); });
    yearlyBtn.addEventListener("click", function () { setBilling("yearly"); });
  }
})();
