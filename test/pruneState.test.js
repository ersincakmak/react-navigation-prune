'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pruneState, pushAndPruneState, findStartIndex } = require('../lib/commonjs/index.js');

const r = (name, i = '') => ({ key: `${name}${i}-k`, name });
const stack = (...routes) => ({
  key: 'stack-1', type: 'stack', stale: false, index: routes.length - 1,
  routeNames: [...new Set(routes.map((x) => x.name))], routes,
});
const names = (s) => s.routes.map((x) => x.key);

test('removes routes between from and focused', () => {
  const s = stack(r('Home'), r('Cart'), r('Address'), r('Payment'), r('Success'));
  const n = pruneState(s, { after: 'Cart' });
  assert.deepEqual(names(n), ['Home-k', 'Cart-k', 'Success-k']);
  assert.equal(n.index, 2);
  assert.equal(n.routes[0], s.routes[0], 'route objects are reused (no remount)');
  assert.equal(n.key, 'stack-1');
  assert.equal(n.stale, false);
});

test('from removes the flow start too (after keeps it)', () => {
  const s = stack(r('Home'), r('Cart'), r('Address'), r('Success'));
  assert.deepEqual(names(pruneState(s, { from: 'Cart' })), ['Home-k', 'Success-k']);
});

test('returns same reference when nothing to remove', () => {
  const s = stack(r('Home'), r('Cart'), r('Success'));
  assert.equal(pruneState(s, { after: 'Cart' }), s);
  assert.equal(pruneState(s, { after: 'Missing' }), s);
  const single = stack(r('Home'));
  assert.equal(pruneState(single, { after: 'Home' }), single);
});

test('from equal to focused screen name is ignored for the focused route itself', () => {
  const s = stack(r('A'), r('B'), r('A', 2));
  assert.deepEqual(names(pruneState(s, { after: 'A' })), ['A-k', 'A2-k']);
});

test('match nearest (default) vs farthest with duplicate names', () => {
  const s = stack(r('Home'), r('Cart', 1), r('X', 1), r('Cart', 2), r('X', 2), r('Success'));
  assert.deepEqual(names(pruneState(s, { after: 'Cart' })), ['Home-k', 'Cart1-k', 'X1-k', 'Cart2-k', 'Success-k']);
  assert.deepEqual(names(pruneState(s, { after: 'Cart', match: 'nearest' })), names(pruneState(s, { after: 'Cart' })));
  assert.deepEqual(names(pruneState(s, { after: 'Cart', match: 'farthest' })), ['Home-k', 'Cart1-k', 'Success-k']);
  assert.equal(findStartIndex(s, { after: 'Cart', match: 'farthest' }, 5), 1);
  assert.equal(findStartIndex(s, { after: 'Cart' }, 5), 3);
});

test('keep preserves matching routes inside the range', () => {
  const s = stack(r('Home'), r('Cart'), r('Promo'), r('Address'), r('Success'));
  assert.deepEqual(names(pruneState(s, { after: 'Cart', keep: ['Promo'] })), ['Home-k', 'Cart-k', 'Promo-k', 'Success-k']);
  const s2 = stack(r('Home'), r('Cart'), r('Promo'), r('Success'));
  assert.equal(pruneState(s2, { after: 'Cart', keep: 'Promo' }), s2, 'all kept -> same ref');
});

test('matcher can be array or predicate', () => {
  const s = stack(r('Home'), r('CartA'), r('Step'), r('Success'));
  assert.deepEqual(names(pruneState(s, { after: ['CartA', 'CartB'] })), ['Home-k', 'CartA-k', 'Success-k']);
  assert.deepEqual(names(pruneState(s, { after: (route) => route.name.startsWith('Cart') })), ['Home-k', 'CartA-k', 'Success-k']);
  assert.deepEqual(names(pruneState(s, { after: (_r, i) => i === 0 })), ['Home-k', 'Success-k']);
});

test('anchorKey bounds the range and keeps routes above it', () => {
  const s = stack(r('Home'), r('Cart'), r('A'), r('Success'), r('Details'));
  const n = pruneState(s, { after: 'Cart', anchorKey: 'Success-k' });
  assert.deepEqual(names(n), ['Home-k', 'Cart-k', 'Success-k', 'Details-k']);
  assert.equal(n.index, 3, 'focused route stays focused');
  assert.equal(pruneState(s, { after: 'Cart', anchorKey: 'nope' }), s);
});

test('preserves unknown fields (v7 preloadedRoutes etc.)', () => {
  const s = { ...stack(r('Home'), r('Cart'), r('A'), r('Success')), preloadedRoutes: [r('Pre')] };
  const n = pruneState(s, { after: 'Cart' });
  assert.equal(n.preloadedRoutes, s.preloadedRoutes);
});

test('pushAndPruneState pushes and prunes in one state', () => {
  const s = stack(r('Home'), r('Cart'), r('Address'), r('Payment'));
  const route = { key: 'Success-new', name: 'Success' };
  const n = pushAndPruneState(s, route, { after: 'Cart' });
  assert.deepEqual(names(n), ['Home-k', 'Cart-k', 'Success-new']);
  assert.equal(n.index, 2);
  // current screen is the flow start -> plain push
  const s2 = stack(r('Home'), r('Cart'));
  assert.deepEqual(names(pushAndPruneState(s2, route, { after: 'Cart' })), ['Home-k', 'Cart-k', 'Success-new']);
  // not found -> plain push
  assert.deepEqual(names(pushAndPruneState(s2, route, { after: 'Nope' })), ['Home-k', 'Cart-k', 'Success-new']);
  // from replaces the whole flow
  assert.deepEqual(names(pushAndPruneState(s, route, { from: 'Cart' })), ['Home-k', 'Success-new']);
});

test('does not mutate input', () => {
  const s = stack(r('Home'), r('Cart'), r('A'), r('Success'));
  const snapshot = JSON.stringify(s);
  pruneState(s, { after: 'Cart' });
  pushAndPruneState(s, { key: 'x', name: 'X' }, { after: 'Cart' });
  assert.equal(JSON.stringify(s), snapshot);
});
