// Same-origin public-page fixture. Production framing protections stay unchanged.
const frame = document.querySelector('#preview');
const width = document.querySelector('#width');
const section = document.querySelector('#section');
const result = document.querySelector('#result');
const navigate = () => frame.contentDocument?.getElementById(section.value)?.scrollIntoView({behavior:'instant',block:'start'});
function inspect() {
  const doc = frame.contentDocument;
  if (!doc?.querySelector('.launch-band')) return;
  const overflow = doc.documentElement.scrollWidth > doc.documentElement.clientWidth;
  const broken = [...doc.images].filter(image => image.complete && !image.naturalWidth).length;
  result.textContent = `${doc.defaultView.innerWidth}px CSS viewport · ${overflow ? 'HORIZONTAL OVERFLOW' : 'no page overflow'} · ${broken} broken images · ${doc.querySelectorAll('main > section').length} sections`;
}
width.addEventListener('change', () => { frame.style.width = `${width.value}px`; requestAnimationFrame(() => { navigate(); inspect(); }); });
section.addEventListener('change', navigate);
document.querySelector('#check').addEventListener('click', inspect);
frame.addEventListener('load', () => {
  const doc = frame.contentDocument;
  doc.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    const target = anchor && doc.getElementById(anchor.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({behavior:'instant',block:'start'});
  });
  navigate();
  inspect();
});
try {
  const response = await fetch('/', {cache:'no-store'});
  if (!response.ok) throw new Error(`Landing returned ${response.status}`);
  frame.srcdoc = await response.text();
} catch (error) { result.textContent = error.message; }
