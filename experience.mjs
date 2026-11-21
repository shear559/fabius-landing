// Authored routing illustrations. No network calls or simulated live telemetry.
const routes = {
  build: {
    request: 'Use Fabius to fix my mobile signup form. Keep the existing brand and test empty, invalid and valid email submissions.',
    skills: [['disciplina','form behavior'],['decor','mobile layout'],['mercatus','form copy'],['archivum','brand decisions']],
    steps: [
      ['Find the friction', 'Disciplina follows the signup flow. Archivum supplies the approved brand choices.'],
      ['Make the form usable', 'Decor fits the fields and button to a phone screen. Mercatus writes field labels and error messages.'],
      ['Exercise the form', 'Submit a blank field, a malformed address and a valid test address. Check the response and keyboard focus for each.']
    ],
    output: 'A revised form and a check record for all three submissions.'
  },
  research: {
    request: 'Use Fabius to compare Zendesk and Freshdesk for a five-person team. Cite the published prices and flag anything that needs a quote.',
    skills: [['scientia','comparison'],['archivum','dated sources'],['decor','cost table'],['disciplina','price checks']],
    steps: [
      ['Set a common basis', 'Scientia fixes the seat count, currency and billing interval so the totals answer the same question.'],
      ['Build the comparison', 'Archivum records each vendor source and its date. Decor lays out the per-seat price beside the five-seat total.'],
      ['Check every figure', 'Disciplina traces each price to its source, recomputes the totals and marks quote-only items.']
    ],
    output: 'A two-vendor cost table with dated links, comparable totals and any open pricing questions.'
  },
  automate: {
    request: 'Use Fabius to clean a sample contacts CSV. Merge duplicate emails, flag missing addresses and verify that running it twice gives the same result.',
    skills: [['machina','CSV workflow'],['archivum','field rules'],['praesidium','file access'],['disciplina','repeat checks']],
    steps: [
      ['Define a duplicate', 'Archivum retrieves the agreed field rules. Machina uses them to normalize addresses and choose which row to keep.'],
      ['Work on a copy', 'Machina writes clean rows and exceptions to separate outputs. Praesidium checks that file access is limited to the sample workspace.'],
      ['Test a second pass', 'Disciplina runs the same fixture twice and compares outputs. A duplicate should merge, and a blank address should appear in the exceptions.']
    ],
    output: 'A cleaned CSV, an exceptions file and a repeat-run comparison.'
  }
};
const tablist = document.querySelector('.route-tabs');
const panel = document.querySelector('#route-panel');
if (tablist && panel) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const request = panel.querySelector('#route-request');
  const copy = panel.querySelector('#route-copy');
  const copyStatus = panel.querySelector('#route-copy-status');
  let animationFrame;
  if (copy && typeof navigator.clipboard?.writeText === 'function') {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      const prompt = request.textContent;
      let message;
      try {
        await navigator.clipboard.writeText(prompt);
        message = 'Prompt copied.';
      } catch {
        message = 'Select the prompt text to copy it manually.';
      }
      if (prompt === request.textContent) copyStatus.textContent = message;
    });
  }
  const select = (index, moveFocus = false) => {
    const route = routes[tabs[index].dataset.route];
    if (!route) return;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tabs[index].id);
    panel.dataset.route = tabs[index].dataset.route;
    request.textContent = route.request;
    copyStatus.textContent = '';
    document.querySelector('#route-output').textContent = route.output;
    route.skills.forEach(([name, role], i) => {
      document.querySelector(`#route-name-${i}`).textContent = name;
      document.querySelector(`#route-role-${i}`).textContent = role;
      document.querySelector(`#route-icon-${i}`).setAttribute('href', `#bug-${name}`);
      document.querySelector(`#route-icon-${i}`).closest('.route-node').dataset.skill = name;
    });
    const items = panel.querySelectorAll('#route-steps li');
    route.steps.forEach(([title, description], i) => {
      items[i].querySelector('h4').textContent = title;
      items[i].querySelector('p').textContent = description;
    });
    cancelAnimationFrame(animationFrame);
    panel.dataset.changing = 'false';
    animationFrame = requestAnimationFrame(() => { panel.dataset.changing = 'true'; });
    if (moveFocus) tabs[index].focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(next, true); }
    });
  });
}
