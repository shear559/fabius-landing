const { chromium } = require("playwright");
const path = require("path");

const url = "file://" + path.resolve(__dirname, "index.html");

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const fail = (msg) => { results.push("FAIL: " + msg); };
  const pass = (msg) => { results.push("PASS: " + msg); };

  // ---- Desktop, JS enabled ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url);

    // Tabs
    const initialSelected = await page.getAttribute('[data-testid="feature-capture"]', "aria-selected");
    initialSelected === "true" ? pass("capture tab selected by default") : fail("capture tab not selected by default: " + initialSelected);

    await page.click('[data-testid="feature-connect"]');
    const connectSelected = await page.getAttribute('[data-testid="feature-connect"]', "aria-selected");
    const captureSelectedAfter = await page.getAttribute('[data-testid="feature-capture"]', "aria-selected");
    const panelConnectVisible = await page.isVisible('[data-testid="panel-connect"]');
    const panelCaptureVisible = await page.isVisible('[data-testid="panel-capture"]');
    (connectSelected === "true" && captureSelectedAfter === "false" && panelConnectVisible && !panelCaptureVisible)
      ? pass("clicking feature-connect switches panel + aria-selected")
      : fail("tab switch state wrong: connectSelected=" + connectSelected + " captureSelectedAfter=" + captureSelectedAfter + " panelConnectVisible=" + panelConnectVisible + " panelCaptureVisible=" + panelCaptureVisible);

    await page.focus('[data-testid="feature-connect"]');
    await page.keyboard.press("ArrowRight");
    const exportSelected = await page.getAttribute('[data-testid="feature-export"]', "aria-selected");
    const panelExportVisible = await page.isVisible('[data-testid="panel-export"]');
    (exportSelected === "true" && panelExportVisible) ? pass("ArrowRight moves to export tab") : fail("ArrowRight nav failed: exportSelected=" + exportSelected);

    // Billing toggle
    const soloMonthly = await page.textContent('[data-testid="price-solo"]');
    const studioMonthly = await page.textContent('[data-testid="price-studio"]');
    (soloMonthly === "$12" && studioMonthly === "$29") ? pass("default monthly prices correct") : fail("default monthly wrong: " + soloMonthly + " " + studioMonthly);

    await page.click('[data-testid="billing-yearly"]');
    const soloYearly = await page.textContent('[data-testid="price-solo"]');
    const studioYearly = await page.textContent('[data-testid="price-studio"]');
    (soloYearly === "$108" && studioYearly === "$264") ? pass("yearly prices correct") : fail("yearly wrong: " + soloYearly + " " + studioYearly);

    await page.click('[data-testid="billing-monthly"]');
    const soloBack = await page.textContent('[data-testid="price-solo"]');
    const studioBack = await page.textContent('[data-testid="price-studio"]');
    (soloBack === "$12" && studioBack === "$29") ? pass("returning to monthly restores exact values") : fail("monthly restore wrong: " + soloBack + " " + studioBack);

    // FAQ
    for (let i = 0; i < 4; i++) {
      const exists = await page.$(`[data-testid="faq-${i}"]`);
      exists ? pass("faq-" + i + " present") : fail("faq-" + i + " missing");
    }
    await page.click('[data-testid="faq-0"]');
    const detailsOpen = await page.evaluate(() => document.querySelector('[data-testid="faq-0"]').closest("details").open);
    detailsOpen ? pass("faq-0 opens on click") : fail("faq-0 did not open");

    // CTA
    const ctaHref = await page.getAttribute('a.btn-primary[href="#workflow"]', "href");
    ctaHref === "#workflow" ? pass('CTA links to #workflow') : fail("CTA href wrong: " + ctaHref);
    const workflowExists = await page.$("#workflow");
    workflowExists ? pass("#workflow section exists") : fail("#workflow section missing");

    // Hero scene controls
    const toggleLabelBefore = await page.textContent(".scene-btn-label");
    await page.click('[data-action="toggle"]');
    const pressedAfter = await page.getAttribute('[data-action="toggle"]', "aria-pressed");
    results.push("INFO: scene toggle label before=" + toggleLabelBefore + " pressedAfter=" + pressedAfter);

    if (errors.length) fail("console/page errors: " + errors.join(" | "));
    else pass("no console/page errors (desktop)");

    await page.screenshot({ path: "verify-desktop-1440.png", fullPage: true });
    await page.close();
  }

  // ---- Mobile, JS enabled ----
  {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await page.goto(url);

    const expandedBefore = await page.getAttribute('[data-testid="menu-toggle"]', "aria-expanded");
    expandedBefore === "false" ? pass("menu-toggle aria-expanded false initially") : fail("initial aria-expanded wrong: " + expandedBefore);

    await page.click('[data-testid="menu-toggle"]');
    const expandedAfterOpen = await page.getAttribute('[data-testid="menu-toggle"]', "aria-expanded");
    const navVisibleAfterOpen = await page.isVisible('[data-testid="mobile-nav"] a[href="#features"]');
    (expandedAfterOpen === "true" && navVisibleAfterOpen) ? pass("menu opens: aria-expanded true, nav link visible") : fail("open failed: expanded=" + expandedAfterOpen + " visible=" + navVisibleAfterOpen);

    await page.keyboard.press("Escape");
    const expandedAfterEsc = await page.getAttribute('[data-testid="menu-toggle"]', "aria-expanded");
    const focusedTestId = await page.evaluate(() => document.activeElement.getAttribute("data-testid"));
    (expandedAfterEsc === "false" && focusedTestId === "menu-toggle") ? pass("Escape closes nav and returns focus to toggle") : fail("Escape failed: expanded=" + expandedAfterEsc + " focused=" + focusedTestId);

    await page.click('[data-testid="menu-toggle"]');
    await page.click('[data-testid="mobile-nav"] a[href="#features"]');
    const expandedAfterLinkClick = await page.getAttribute('[data-testid="menu-toggle"]', "aria-expanded");
    expandedAfterLinkClick === "false" ? pass("selecting a nav link closes the menu") : fail("link click did not close menu: " + expandedAfterLinkClick);

    await page.waitForFunction(() => window.scrollY > 0, null, { timeout: 2000 }).catch(() => {});
    const scrollY = await page.evaluate(() => window.scrollY);
    scrollY > 0 ? pass("nav link navigated to section (scrolled)") : fail("did not scroll after nav link click");

    await page.screenshot({ path: "verify-mobile-360.png", fullPage: true });
    await page.close();
  }

  // ---- JS disabled: core content still discoverable ----
  {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 740 } });
    const page = await context.newPage();
    await page.goto(url);
    const heroVisible = await page.isVisible("h1");
    const priceVisible = await page.isVisible('[data-testid="price-solo"]');
    const priceText = await page.textContent('[data-testid="price-solo"]');
    const navLinkReachable = await page.isVisible('#mobile-nav a[href="#features"]');
    (heroVisible && priceVisible && priceText === "$12" && navLinkReachable)
      ? pass("JS disabled: hero, price ($12), and nav link remain visible")
      : fail("JS disabled content check failed: hero=" + heroVisible + " price=" + priceVisible + "(" + priceText + ") nav=" + navLinkReachable);
    await context.close();
  }

  // ---- Reduced motion: scene should not auto-play ----
  {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForTimeout(300);
    const pressed = await page.getAttribute('[data-action="toggle"]', "aria-pressed");
    pressed === "false" ? pass("reduced motion: scene does not auto-play") : fail("reduced motion: scene auto-played, pressed=" + pressed);
    await context.close();
  }

  await browser.close();

  console.log(results.join("\n"));
  const failures = results.filter((r) => r.startsWith("FAIL"));
  console.log("\n" + (failures.length ? failures.length + " FAILURES" : "ALL PASSED"));
  process.exit(failures.length ? 1 : 0);
})();
