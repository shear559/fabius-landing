import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'));
const robots = readFileSync(new URL('robots.txt', root), 'utf8');
const blockedByConfig = (path, headers = {}) => config.routes.some(route =>
  new RegExp(`^(?:${route.src})$`).test(path) &&
  route.has.every(condition => headers[condition.key] !== undefined &&
    new RegExp(`^(?:${condition.value})$`).test(headers[condition.key])));

test('named crawlers are denied while people and conventional search stay available', () => {
  for (const agent of ['GPTBot/1.2', 'Mozilla/5.0 (compatible; ClaudeBot/1.0)', 'PerplexityBot/1.0', 'scrapy/2.0', 'AhrefsBot/7.0']) {
    assert.equal(blockedByConfig('/', { 'user-agent': agent }), true, agent);
    assert.equal(blockedByConfig('/styles.css', { 'user-agent': agent }), true, agent);
    assert.equal(blockedByConfig('/robots.txt', { 'user-agent': agent }), false, agent);
  }
  for (const agent of ['Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36', 'Googlebot/2.1', 'bingbot/2.0', 'facebookexternalhit/1.1', 'Twitterbot/1.0']) {
    assert.equal(blockedByConfig('/', { 'user-agent': agent }), false, agent);
  }
  assert.match(robots, /User-agent: \*\nAllow: \/\n/);
  assert.match(robots, /User-agent: GPTBot\nDisallow: \/\n/);
});

test('cross-site assets are denied without blocking navigation or same-origin resources', () => {
  for (const [path, destination] of [
    ['/styles.css', 'style'], ['/main.js', 'script'], ['/motion.mjs', 'script'],
    ['/assets/og-rules.png', 'image'], ['/assets/fonts/rubik/test.woff2', 'font']
  ]) {
    assert.equal(blockedByConfig(path, { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': destination }), true, path);
    assert.equal(blockedByConfig(path, { 'sec-fetch-site': 'same-origin', 'sec-fetch-dest': destination }), false, path);
    assert.equal(blockedByConfig(path, { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'document' }), false, path);
    assert.equal(blockedByConfig(path), false, path);
  }
  assert.equal(blockedByConfig('/', { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'document' }), false);
  assert.equal(blockedByConfig('/fabius-as-a-system.pdf', { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'document' }), false);
});

test('browser restrictions preserve the existing security floor', () => {
  const headers = Object.fromEntries(config.headers[0].headers.map(h => [h.key.toLowerCase(), h.value]));
  assert.equal(headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal(headers['x-frame-options'], 'DENY');
  assert.match(headers['content-security-policy'], /script-src 'self';/);
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.ok(!config.headers.some(group => group.headers.some(h => h.key === 'Access-Control-Allow-Origin' && h.value === '*')));
});

test('excluded authoring files are not referenced by the public page', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(html, /["']\/?(?:design-preview|_checks\/|_implementation\/|assets\/gallery\/|assets\/showcase-20260930-focused\/)/);
  for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
    const path = match[1];
    if (!/\.[a-z0-9]+$/i.test(path)) continue;
    // Vercel generates this same-origin endpoint after Web Analytics is enabled.
    if (path === '/_vercel/insights/script.js') continue;
    assert.ok(readFileSync(new URL(`..${path}`, import.meta.url)).length, path);
  }
});

const base = process.env.PROTECTION_BASE_URL;
test('live request boundary', { skip: !base }, async () => {
  const cases = [
    ['/', {}, 200],
    ['/styles.css', { 'sec-fetch-site': 'same-origin', 'sec-fetch-dest': 'style' }, 200],
    ['/styles.css', { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'style' }, 403],
    ['/styles.css', { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'document' }, 200],
    ['/', { 'user-agent': 'GPTBot/1.2' }, 403],
    ['/', { 'user-agent': 'Googlebot/2.1' }, 200],
    ['/robots.txt', { 'user-agent': 'GPTBot/1.2' }, 200],
    ['/README.md', {}, 404],
    ['/design-preview', {}, 404],
    ['/fabius-as-a-system.pdf', {}, 200],
  ];
  for (const [path, headers, expected] of cases) {
    const response = await fetch(new URL(path, base), { headers, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    await response.body?.cancel();
    assert.equal(response.status, expected, `${path} ${JSON.stringify(headers)}`);
    if (path === '/styles.css' && expected === 200) {
      assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    }
  }
});


test('pageview analytics is present once on every public HTML page without relaxing CSP', () => {
  for (const page of ['index.html', 'privacy.html', 'support.html', 'terms.html']) {
    const html = readFileSync(new URL(page, root), 'utf8');
    assert.equal((html.match(/src="\/_vercel\/insights\/script\.js"/g) || []).length, 1, page);
    assert.match(html, /<script defer src="\/_vercel\/insights\/script\.js"><\/script>/);
  }
  const privacy = readFileSync(new URL('privacy.html', root), 'utf8');
  assert.doesNotMatch(privacy, /no account sign-in or client-side analytics/);
  assert.match(privacy, /Vercel Web Analytics/);
});
