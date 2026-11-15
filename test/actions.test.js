'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pruneStack, navigateAndPrune, resolveNavigation, createPruneListeners } = require('../lib/commonjs/index.js');

const r = (name) => ({ key: `${name}-k`, name });
function fakeNav(state, extra = {}) {
  const nav = {
    state, calls: 0,
    getState: () => nav.state,
    dispatch(thunk) {
      nav.calls++;
      const action = typeof thunk === 'function' ? thunk(nav.state) : thunk;
      assert.equal(action.type, 'RESET');
      nav.state = action.payload;
    },
    ...extra,
  };
  return nav;
}
const st = (...n) => ({ key: 's', index: n.length - 1, routeNames: n, routes: n.map(r) });

test('pruneStack dispatches a single RESET', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'B', 'Success'));
  assert.equal(pruneStack(nav, { from: 'Cart' }), true);
  assert.equal(nav.calls, 1);
  assert.deepEqual(nav.state.routes.map((x) => x.name), ['Home', 'Cart', 'Success']);
});

test('pruneStack does not dispatch when nothing changes', () => {
  const nav = fakeNav(st('Home', 'Cart', 'Success'));
  assert.equal(pruneStack(nav, { from: 'Cart' }), false);
  assert.equal(nav.calls, 0);
});

test('v5 style navigation (dangerouslyGetState) is supported', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'Success'));
  nav.dangerouslyGetState = nav.getState;
  delete nav.getState;
  assert.equal(pruneStack(nav, { from: 'Cart' }), true);
  assert.equal(nav.state.routes.length, 3);
});

test('navigatorId resolves parent / self', () => {
  const parent = fakeNav(st('Home', 'Cart', 'A', 'Success'));
  const child = fakeNav(st('Tab1'), { getId: () => 'tabs', getParent: (id) => (id === 'root' ? parent : undefined) });
  assert.equal(resolveNavigation(child, 'tabs'), child);
  assert.equal(resolveNavigation(child, 'root'), parent);
  assert.equal(resolveNavigation(child, 'missing'), undefined);
  pruneStack(child, { from: 'Cart', navigatorId: 'root' });
  assert.equal(parent.state.routes.length, 3);
  assert.equal(child.calls, 0);
});

test('navigateAndPrune pushes + prunes with one dispatch', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'B'));
  nav.state.routeNames.push('Success');
  navigateAndPrune(nav, { name: 'Success', params: { id: 1 } }, { from: 'Cart' });
  assert.equal(nav.calls, 1);
  assert.deepEqual(nav.state.routes.map((x) => x.name), ['Home', 'Cart', 'Success']);
  assert.deepEqual(nav.state.routes[2].params, { id: 1 });
  assert.match(nav.state.routes[2].key, /^Success-/);
});

test('createPruneListeners uses route.key as anchor and skips closing transitions', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'Success'));
  const listeners = createPruneListeners({ from: 'Cart' })({ navigation: nav, route: nav.state.routes[3] });
  listeners.transitionEnd({ data: { closing: true } });
  assert.equal(nav.calls, 0);
  listeners.transitionEnd({ data: { closing: false } });
  assert.deepEqual(nav.state.routes.map((x) => x.name), ['Home', 'Cart', 'Success']);
});
