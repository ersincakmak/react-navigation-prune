'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prune, pushAndPrune, resolveNavigation, pruneListeners } = require('../lib/commonjs/index.js');

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

test('prune dispatches a single RESET', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'B', 'Success'));
  assert.equal(prune(nav, { after: 'Cart' }), true);
  assert.equal(nav.calls, 1);
  assert.deepEqual(nav.state.routes.map((x) => x.name), ['Home', 'Cart', 'Success']);
});

test('prune does not dispatch when nothing changes', () => {
  const nav = fakeNav(st('Home', 'Cart', 'Success'));
  assert.equal(prune(nav, { after: 'Cart' }), false);
  assert.equal(nav.calls, 0);
});

test('v5 style navigation (dangerouslyGetState) is supported', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'Success'));
  nav.dangerouslyGetState = nav.getState;
  delete nav.getState;
  assert.equal(prune(nav, { after: 'Cart' }), true);
  assert.equal(nav.state.routes.length, 3);
});

test('navigatorId resolves parent / self', () => {
  const parent = fakeNav(st('Home', 'Cart', 'A', 'Success'));
  const child = fakeNav(st('Tab1'), { getId: () => 'tabs', getParent: (id) => (id === 'root' ? parent : undefined) });
  assert.equal(resolveNavigation(child, 'tabs'), child);
  assert.equal(resolveNavigation(child, 'root'), parent);
  assert.equal(resolveNavigation(child, 'missing'), undefined);
  prune(child, { after: 'Cart', navigatorId: 'root' });
  assert.equal(parent.state.routes.length, 3);
  assert.equal(child.calls, 0);
});

test('pushAndPrune pushes + prunes with one dispatch', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'B'));
  nav.state.routeNames.push('Success');
  pushAndPrune(nav, { name: 'Success', params: { id: 1 } }, { after: 'Cart' });
  assert.equal(nav.calls, 1);
  assert.deepEqual(nav.state.routes.map((x) => x.name), ['Home', 'Cart', 'Success']);
  assert.deepEqual(nav.state.routes[2].params, { id: 1 });
  assert.match(nav.state.routes[2].key, /^Success-/);
});

test('pruneListeners uses route.key as anchor and skips closing transitions', () => {
  const nav = fakeNav(st('Home', 'Cart', 'A', 'Success'));
  const listeners = pruneListeners({ after: 'Cart' })({ navigation: nav, route: nav.state.routes[3] });
  listeners.transitionEnd({ data: { closing: true } });
  assert.equal(nav.calls, 0);
  listeners.transitionEnd({ data: { closing: false } });
  assert.deepEqual(nav.state.routes.map((x) => x.name), ['Home', 'Cart', 'Success']);
});
