'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pruner = require('../../lib/commonjs');
const { createHarness, loadCore, act } = require('./harness');

const { pruneStack, navigateAndPrune, usePruneOnMount, createPruneListeners } = pruner;

function captureWarnings() {
  const warnings = [];
  const orig = console.warn;
  console.warn = (m) => warnings.push(String(m));
  return { warnings, restore: () => (console.warn = orig) };
}

function defineSuite(label, pkg, { major, skip }) {
  const loaded = loadCore(pkg);
  const opts = skip
    ? { skip }
    : loaded.error
      ? { skip: `cannot load ${pkg}: ${loaded.error.message.split('\n')[0]}` }
      : {};
  test.describe(`integration: React Navigation ${label}`, opts, () => {
    if (opts.skip) return;
    const { mount } = createHarness(loaded.core);
    const base = (extra) => ({ initial: ['A', 'B', 'C', 'D'], ...extra });
    const nestedSpec = (extra) => ({
      initial: ['A', 'B', 'Flow'],
      outerId: 'root',
      nested: { host: 'Flow', id: 'inner', initial: ['X', 'Y', 'Z'] },
      ...extra,
    });

    test('pruneStack removes the middle in one state change without remounting', () => {
      const app = mount(base());
      const keys = app.keys();
      const nav = app.navOf('D');
      app.resetCount();
      let result;
      act(() => {
        result = pruneStack(nav, { from: 'A' });
      });
      assert.equal(result, true);
      assert.deepEqual(app.names(), ['A', 'D']);
      assert.equal(app.state().index, 1);
      assert.equal(app.stats.stateChanges, 1);
      assert.deepEqual(app.keys(), [keys[0], keys[3]]);
      for (const k of [keys[0], keys[3]]) {
        assert.equal(app.stats.mounts[k], 1, `route ${k} mounted once`);
        assert.equal(app.stats.unmounts[k], undefined, `route ${k} never unmounted`);
      }
      for (const k of [keys[1], keys[2]]) assert.equal(app.stats.unmounts[k], 1);
    });

    test('nothing to prune: no dispatch, no state change', () => {
      const app = mount({ initial: ['A', 'B'] });
      const before = app.state();
      app.resetCount();
      let result;
      act(() => {
        result = pruneStack(app.navOf('B'), { from: 'A' });
      });
      assert.equal(result, false);
      assert.equal(app.stats.stateChanges, 0);
      assert.equal(app.state(), before);
      act(() => {
        result = pruneStack(app.navOf('B'), { from: 'Nope' });
      });
      assert.equal(result, false);
      assert.equal(app.stats.stateChanges, 0);
      assert.equal(app.state(), before);
    });

    test("match: nearest (default) vs 'farthest' with duplicate names", () => {
      const initial = ['A', 'X', 'B', 'X', 'C', 'D'];
      let app = mount({ initial });
      act(() => pruneStack(app.navOf('D'), { from: 'X' }));
      assert.deepEqual(app.names(), ['A', 'X', 'B', 'X', 'D']);

      app = mount({ initial });
      act(() => pruneStack(app.navOf('D'), { from: 'X', match: 'farthest' }));
      assert.deepEqual(app.names(), ['A', 'X', 'D']);
    });

    test('inclusive removes the start screen too', () => {
      const app = mount(base());
      act(() => pruneStack(app.navOf('D'), { from: 'B', inclusive: true }));
      assert.deepEqual(app.names(), ['A', 'D']);
    });

    test('keep preserves matching routes in the range', () => {
      const app = mount({ initial: ['A', 'B', 'C', 'D', 'E'] });
      const keys = app.keys();
      act(() => pruneStack(app.navOf('E'), { from: 'A', keep: 'C' }));
      assert.deepEqual(app.names(), ['A', 'C', 'E']);
      assert.equal(app.keys()[1], keys[2]);
      assert.equal(app.stats.unmounts[keys[2]], undefined);
    });

    test('anchorKey keeps screens above the anchor', () => {
      const app = mount(base());
      const keys = app.keys();
      act(() => pruneStack(app.navOf('D'), { from: 'A', anchorKey: keys[2] }));
      assert.deepEqual(app.names(), ['A', 'C', 'D']);
      assert.equal(app.state().index, 2);
    });

    test('navigateAndPrune pushes and prunes atomically', () => {
      const app = mount({ initial: ['A', 'B', 'C'], extraScreens: ['Done'] });
      const keys = app.keys();
      app.resetCount();
      act(() =>
        navigateAndPrune(app.navOf('C'), { name: 'Done', params: { ok: 1 } }, { from: 'A' })
      );
      assert.equal(app.stats.stateChanges, 1);
      assert.deepEqual(app.names(), ['A', 'Done']);
      const s = app.state();
      assert.equal(s.index, 1);
      assert.deepEqual(s.routes[1].params, { ok: 1 });
      assert.equal(s.routes[0].key, keys[0]);
      assert.equal(app.stats.mounts[keys[0]], 1);
      assert.equal(app.stats.unmounts[keys[0]], undefined);
      assert.equal(app.stats.mounts[s.routes[1].key], 1);
    });

    if (major >= 6) {
      test('navigatorId targets a parent navigator (nested)', () => {
        const app = mount(nestedSpec());
        const z = app.stats.routesByName.Z;
        const zNav = app.navOfKey(z.key);
        app.resetCount();
        let result;
        act(() => {
          result = pruneStack(zNav, { from: 'A', navigatorId: 'root' });
        });
        assert.equal(result, true);
        assert.deepEqual(app.names(), ['A', 'Flow']);
        assert.equal(app.stats.stateChanges, 1);
        assert.deepEqual(
          app.state().routes[1].state.routes.map((r) => r.name),
          ['X', 'Y', 'Z']
        );
        assert.equal(app.stats.mounts[z.key], 1);
        assert.equal(app.stats.unmounts[z.key], undefined);
      });

      test('navigatorId: own id prunes inner stack; unknown id warns and no-ops', () => {
        const cap = captureWarnings();
        try {
          const app = mount(nestedSpec());
          const zNav = app.navOfKey(app.stats.routesByName.Z.key);
          app.resetCount();
          let result;
          act(() => {
            result = pruneStack(zNav, { from: 'A', navigatorId: 'nope' });
          });
          assert.equal(result, false);
          assert.equal(app.stats.stateChanges, 0);
          assert.deepEqual(app.names(), ['A', 'B', 'Flow']);
          assert.ok(cap.warnings.some((w) => /nope/.test(w)), 'warns about unknown id');

          act(() => {
            result = pruneStack(zNav, { from: 'X', navigatorId: 'inner' });
          });
          assert.equal(result, true);
          assert.deepEqual(
            app.state().routes[2].state.routes.map((r) => r.name),
            ['X', 'Z']
          );
        } finally {
          cap.restore();
        }
      });
    } else {
      test('navigatorId falls back to the current navigator with a warning (v5)', () => {
        const cap = captureWarnings();
        try {
          const app = mount(nestedSpec({ outerId: undefined }));
          const zNav = app.navOfKey(app.stats.routesByName.Z.key);
          act(() => {
            pruneStack(zNav, { from: 'X', navigatorId: 'root' });
          });
          assert.ok(cap.warnings.some((w) => /v6\+/.test(w)));
          assert.deepEqual(
            app.state().routes[2].state.routes.map((r) => r.name),
            ['X', 'Z']
          );
        } finally {
          cap.restore();
        }
      });
    }

    test('createPruneListeners via the screen listeners prop (focus)', () => {
      const app = mount({
        initial: ['A', 'B', 'C', 'D'],
        listeners: { D: createPruneListeners({ from: 'A' }, { event: 'focus' }) },
      });
      assert.deepEqual(app.names(), ['A', 'D']);
    });

    test("usePruneOnMount when: 'immediate' prunes right after mount", () => {
      const app = mount({
        initial: ['A', 'B', 'C', 'D'],
        hooks: {
          D: (navigation, route) =>
            usePruneOnMount(navigation, { from: 'A', anchorKey: route.key }, { when: 'immediate' }),
        },
      });
      assert.deepEqual(app.names(), ['A', 'D']);
    });

    test('usePruneOnMount default falls back to the timer', async () => {
      const app = mount({
        initial: ['A', 'B', 'C', 'D'],
        hooks: {
          D: (navigation, route) =>
            usePruneOnMount(navigation, { from: 'A', anchorKey: route.key }, { fallbackMs: 30 }),
        },
      });
      assert.deepEqual(app.names(), ['A', 'B', 'C', 'D']);
      await act(async () => {
        await app.sleep(100);
      });
      assert.deepEqual(app.names(), ['A', 'D']);
      assert.equal(app.stats.stateChanges, 1);
    });

    test('usePruneOnMount under StrictMode prunes exactly once (immediate)', async () => {
      const app = mount({
        strict: true,
        initial: ['A', 'B', 'C', 'D'],
        hooks: {
          D: (navigation, route) =>
            usePruneOnMount(navigation, { from: 'A', anchorKey: route.key }, { when: 'immediate' }),
        },
      });
      await act(async () => {
        await app.sleep(20);
      });
      assert.deepEqual(app.names(), ['A', 'D']);
      assert.equal(app.stats.stateChanges, 0); // the single prune happened during mount
    });

    test('usePruneOnMount under StrictMode prunes exactly once (timer)', async () => {
      const app = mount({
        strict: true,
        initial: ['A', 'B', 'C', 'D'],
        hooks: {
          D: (navigation, route) =>
            usePruneOnMount(navigation, { from: 'A', anchorKey: route.key }, { fallbackMs: 30 }),
        },
      });
      await act(async () => {
        await app.sleep(100);
      });
      assert.deepEqual(app.names(), ['A', 'D']);
      assert.equal(app.stats.stateChanges, 1);
    });
  });
}

module.exports = { defineSuite };
