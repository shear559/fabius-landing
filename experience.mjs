// Authored routing illustrations. No network calls or simulated live telemetry.
const routes = {
  build: {
    request: '“Build a launch page for my product.”',
    skills: [['disciplina','plan + verify'],['decor','visual design'],['mercatus','message + copy'],['archivum','project context']],
    steps: [
      ['Understand the brief','Read the brand, audience and existing project decisions.'],
      ['Compose the right skills','Disciplina plans and checks. Decor designs. Mercatus shapes the message. Archivum supplies approved context.'],
      ['Verify the experience','Exercise the page, check mobile layouts and inspect the final result.']
    ],
    output: 'A working page, with checks you can inspect.'
  },
  research: {
    request: '“Turn this research question into a visual report.”',
    skills: [['disciplina','evidence + checks'],['scientia','research method'],['archivum','sources + context'],['decor','visual explanation']],
    steps: [
      ['Define the question','Identify what needs evidence, what is already known and what could change the answer.'],
      ['Connect evidence to the explanation','Scientia guides the research. Archivum organizes sources. Decor makes the findings legible. Disciplina checks the claims.'],
      ['Keep uncertainty visible','Trace conclusions to sources and distinguish observed findings from assumptions.']
    ],
    output: 'An explained result with sources and visible limitations.'
  },
  automate: {
    request: '“Connect our tools into a repeatable workflow.”',
    skills: [['disciplina','plan + tests'],['machina','workflow design'],['praesidium','security review'],['archivum','project decisions']],
    steps: [
      ['Map the real workflow','Read the trigger, inputs, connected services and expected output before choosing the implementation.'],
      ['Design for the actual boundaries','Machina defines the workflow. Praesidium reviews trust boundaries. Disciplina plans checks. Archivum supplies approved decisions.'],
      ['Exercise the complete path','Check the result through the connected tools, including error handling and permission boundaries.']
    ],
    output: 'A repeatable workflow with an inspectable verification path.'
  }
};
const tablist = document.querySelector('.route-tabs');
const panel = document.querySelector('#route-panel');
if (tablist && panel) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  let animationFrame;
  const select = (index, moveFocus = false) => {
    const route = routes[tabs[index].dataset.route];
    if (!route) return;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tabs[index].id);
    document.querySelector('#route-request').textContent = route.request;
    document.querySelector('#route-output').textContent = route.output;
    route.skills.forEach(([name, role], i) => {
      document.querySelector(`#route-name-${i}`).textContent = name;
      document.querySelector(`#route-role-${i}`).textContent = role;
      document.querySelector(`#route-icon-${i}`).setAttribute('href', `#bug-${name}`);
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
