(function () {
  "use strict";

  var docEl = document.documentElement;
  docEl.classList.remove("no-js");
  docEl.classList.add("js");

  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  /* ---------------- Mobile navigation ---------------- */
  (function mobileNav() {
    var toggle = document.querySelector('[data-testid="menu-toggle"]');
    var nav = document.querySelector('[data-testid="mobile-nav"]');
    if (!toggle || !nav) return;

    function isOpen() {
      return nav.getAttribute("data-open") === "true";
    }

    function open() {
      nav.setAttribute("data-open", "true");
      toggle.setAttribute("aria-expanded", "true");
    }

    function close(options) {
      nav.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
      if (options && options.returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) {
        close();
      } else {
        open();
      }
    });

    nav.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (link) {
        close();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) {
        close({ returnFocus: true });
      }
    });

    document.addEventListener("click", function (event) {
      if (!isOpen()) return;
      var withinNav = nav.contains(event.target);
      var withinToggle = toggle.contains(event.target);
      if (!withinNav && !withinToggle) {
        close();
      }
    });
  })();

  /* ---------------- Feature tabs ---------------- */
  (function featureTabs() {
    var tabs = Array.prototype.slice.call(
      document.querySelectorAll('[role="tab"]')
    );
    if (!tabs.length) return;

    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    });

    // Progressive enhancement: hide every panel except the first.
    panels.forEach(function (panel, index) {
      if (index !== 0 && panel) {
        panel.hidden = true;
      }
    });

    function selectTab(tab, options) {
      var focusPanel = options && options.focusPanel;
      tabs.forEach(function (t, i) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
        if (panels[i]) panels[i].hidden = !selected;
      });
      if (focusPanel) {
        var idx = tabs.indexOf(tab);
        if (panels[idx]) panels[idx].focus();
      }
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
          tabs[newIndex].focus();
          selectTab(tabs[newIndex]);
        }
      });
    });
  })();

  /* ---------------- Billing toggle ---------------- */
  (function billingToggle() {
    var monthlyBtn = document.querySelector('[data-testid="billing-monthly"]');
    var yearlyBtn = document.querySelector('[data-testid="billing-yearly"]');
    var priceSolo = document.querySelector('[data-testid="price-solo"]');
    var priceStudio = document.querySelector('[data-testid="price-studio"]');
    var periodLabel = document.getElementById("billing-period-label");
    if (!monthlyBtn || !yearlyBtn || !priceSolo || !priceStudio) return;

    var prices = {
      monthly: { solo: "$12/mo", studio: "$29/mo", label: "Showing monthly billing" },
      yearly: { solo: "$108/yr", studio: "$264/yr", label: "Showing yearly billing — equivalent to 2 months free" }
    };

    function setPeriod(period) {
      var isYearly = period === "yearly";
      monthlyBtn.setAttribute("aria-pressed", isYearly ? "false" : "true");
      yearlyBtn.setAttribute("aria-pressed", isYearly ? "true" : "false");
      var data = prices[period];
      priceSolo.textContent = data.solo;
      priceStudio.textContent = data.studio;
      if (periodLabel) periodLabel.textContent = data.label;
    }

    monthlyBtn.addEventListener("click", function () {
      setPeriod("monthly");
    });
    yearlyBtn.addEventListener("click", function () {
      setPeriod("yearly");
    });
  })();

  /* ---------------- Workflow demo ---------------- */
  (function workflowDemo() {
    var demo = document.getElementById("demo");
    if (!demo) return;

    var toggleBtn = demo.querySelector('[data-testid="demo-toggle"]');
    var restartBtn = demo.querySelector('[data-testid="demo-restart"]');
    var status = document.getElementById("demo-status");
    var stages = Array.prototype.slice.call(demo.querySelectorAll(".demo-stage"));
    var label = toggleBtn ? toggleBtn.querySelector(".demo-btn-label") : null;
    if (!toggleBtn || !stages.length) return;

    var STAGE_NAMES = ["1. Capture", "2. Connect", "3. Export"];
    var STAGE_DURATION = 3200;
    var current = 0;
    var playing = !prefersReducedMotion.matches;
    var timer = null;

    function render() {
      stages.forEach(function (stage, index) {
        stage.classList.toggle("is-active", index === current);
      });
      if (status) {
        status.textContent = (playing ? "Playing: " : "Paused: ") + STAGE_NAMES[current];
      }
      toggleBtn.setAttribute("aria-pressed", playing ? "true" : "false");
      if (label) label.textContent = playing ? "Pause" : "Play";
    }

    function stopTimer() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function startTimer() {
      stopTimer();
      timer = window.setInterval(function () {
        current = (current + 1) % stages.length;
        render();
      }, STAGE_DURATION);
    }

    function play() {
      playing = true;
      render();
      startTimer();
    }

    function pause() {
      playing = false;
      stopTimer();
      render();
    }

    toggleBtn.addEventListener("click", function () {
      if (playing) {
        pause();
      } else {
        play();
      }
    });

    restartBtn.addEventListener("click", function () {
      current = 0;
      render();
      if (playing) startTimer();
    });

    render();
    if (playing) startTimer();
  })();
})();
