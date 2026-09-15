(function () {
  "use strict";

  /* ============ Mobile navigation ============ */
  var menuToggle = document.querySelector('[data-testid="menu-toggle"]');
  var mobileNav = document.querySelector('[data-testid="mobile-nav"]');
  var menuToggleIcon = menuToggle ? menuToggle.querySelector("use") : null;

  function openMobileNav() {
    mobileNav.hidden = false;
    menuToggle.setAttribute("aria-expanded", "true");
    if (menuToggleIcon) menuToggleIcon.setAttribute("href", "#icon-close");
  }

  function closeMobileNav(returnFocus) {
    mobileNav.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    if (menuToggleIcon) menuToggleIcon.setAttribute("href", "#icon-menu");
    if (returnFocus) menuToggle.focus();
  }

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
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

  /* ============ Feature tabs ============ */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var isSelected = t === tab;
      t.setAttribute("aria-selected", isSelected ? "true" : "false");
      t.tabIndex = isSelected ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !isSelected;
    });
    tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      selectTab(tab);
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
        selectTab(tabs[newIndex]);
      }
    });
  });

  /* ============ Billing toggle ============ */
  var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
  var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
  var priceSolo = document.querySelector('[data-testid="price-solo"]');
  var priceStudio = document.querySelector('[data-testid="price-studio"]');
  var periodSolo = document.querySelector('[data-testid="period-solo"]');
  var periodStudio = document.querySelector('[data-testid="period-studio"]');

  var prices = {
    monthly: { solo: "12", studio: "29", period: "/month" },
    yearly: { solo: "108", studio: "264", period: "/year" }
  };

  function setBilling(period) {
    var data = prices[period];
    priceSolo.textContent = data.solo;
    priceStudio.textContent = data.studio;
    periodSolo.textContent = data.period;
    periodStudio.textContent = data.period;

    var isMonthly = period === "monthly";
    monthlyBtn.classList.toggle("is-active", isMonthly);
    yearlyBtn.classList.toggle("is-active", !isMonthly);
    monthlyBtn.setAttribute("aria-pressed", isMonthly ? "true" : "false");
    yearlyBtn.setAttribute("aria-pressed", isMonthly ? "false" : "true");
  }

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener("click", function () { setBilling("monthly"); });
    yearlyBtn.addEventListener("click", function () { setBilling("yearly"); });
  }

  /* ============ Hero workflow demonstration ============ */
  var demoFrame = document.querySelector('[data-testid="hero-demo"]');
  var playBtn = document.querySelector('[data-testid="demo-play"]');
  var restartBtn = document.querySelector('[data-testid="demo-restart"]');
  var caption = document.querySelector('[data-testid="demo-caption"]');
  var stepDots = document.querySelectorAll(".demo-step-dot");

  var states = ["capture", "connect", "export"];
  var captions = {
    capture: "<strong>Capture —</strong> save a passage straight from a source, with the citation attached.",
    connect: "<strong>Connect —</strong> link this note to related notes and sources you've already captured.",
    export: "<strong>Export —</strong> turn the connected notes into clean Markdown files, ready to use anywhere."
  };

  var currentIndex = 0;
  var isPlaying = false;
  var timerId = null;
  var ADVANCE_MS = 2600;

  function renderState() {
    var state = states[currentIndex];
    demoFrame.setAttribute("data-state", state);
    caption.innerHTML = captions[state];
    stepDots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === currentIndex);
    });
  }

  function setPlaying(playing) {
    isPlaying = playing;
    playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    var icon = playBtn.querySelector("use");
    var label = playBtn.querySelector("[data-label]");
    if (playing) {
      icon.setAttribute("href", "#icon-pause");
      label.textContent = "Pause";
      timerId = window.setInterval(function () {
        currentIndex = (currentIndex + 1) % states.length;
        renderState();
      }, ADVANCE_MS);
    } else {
      icon.setAttribute("href", "#icon-play");
      label.textContent = "Play";
      if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }
  }

  if (demoFrame && playBtn && restartBtn) {
    playBtn.addEventListener("click", function () {
      setPlaying(!isPlaying);
    });

    restartBtn.addEventListener("click", function () {
      setPlaying(false);
      currentIndex = 0;
      renderState();
    });

    renderState();
  }
})();
