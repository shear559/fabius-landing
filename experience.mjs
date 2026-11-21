// Authored routing illustrations. No network calls or simulated live telemetry.
const routes = {
  build: {
    request: '“Build a launch page for my product.”',
    skills: [['disciplina','plan + verify'],['decor','visual design'],['mercatus','message + copy'],['archivum','project context']],
    steps: [
      ['Read the brief','Identify the audience, brand rules and action visitors should take.'],
      ['Build the page','Write the headline, lay out the page and wire up its main action.'],
      ['Test the main action','Follow the main link and inspect the layout at phone width.']
    ],
    output: 'A launch page with a record of the checks.'
  },
  research: {
    request: '“Turn this research question into a visual report.”',
    skills: [['disciplina','evidence + checks'],['scientia','research method'],['archivum','sources + context'],['decor','visual explanation']],
    steps: [
      ['Define the question','Identify the decision the report should inform.'],
      ['Compare the sources','Trace each claim to its source and flag gaps in the evidence.'],
      ['Present the findings','Choose a chart that shows the finding and its limits.']
    ],
    output: 'A visual report with citations.'
  },
  automate: {
    request: '“Connect our tools into a repeatable workflow.”',
    skills: [['disciplina','plan + tests'],['machina','workflow design'],['praesidium','security review'],['archivum','project decisions']],
    steps: [
      ['Map the handoff','Identify the trigger, the input and its destination.'],
      ['Connect the tools','Map fields between services and check the permissions each step needs.'],
      ['Test the workflow','Run a sample input and check what happens if a step fails.']
    ],
    output: 'A workflow with test results for success and failure.'
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
    panel.dataset.route = tabs[index].dataset.route;
    document.querySelector('#route-request').textContent = route.request;
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
