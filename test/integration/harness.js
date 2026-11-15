'use strict';
// Shared harness: builds a minimal stack navigator on a given @react-navigation/core
// version and exposes the same scenarios for every version.
const React = require('react');
const TestRenderer = require('react-test-renderer');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.__DEV__ = true;

const h = React.createElement;
const act = TestRenderer.act;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadCore(pkg) {
  try {
    const core = require(pkg);
    return { core };
  } catch (error) {
    return { error };
  }
}

/**
 * Creates a harness bound to one core. `routeNames` of every navigator are
 * declared up-front; `config` customizes per-screen hooks/listeners.
 */
function createHarness(core) {
  const {
    BaseNavigationContainer,
    StackRouter,
    useNavigationBuilder,
    createNavigatorFactory,
    NavigationHelpersContext,
  } = core;

  function Navigator({ children, screenListeners, ...rest }) {
    const builder = useNavigationBuilder(StackRouter, { children, ...rest });
    const { state, descriptors, navigation } = builder;
    Navigator.lastNavigation = navigation;
    const content = state.routes.map((route) =>
      h(React.Fragment, { key: route.key }, descriptors[route.key].render())
    );
    if (builder.NavigationContent) return h(builder.NavigationContent, null, content);
    return h(NavigationHelpersContext.Provider, { value: navigation }, content);
  }
  // each createNavigatorFactory call returns {Navigator, Screen} sharing the component
  const makeNav = createNavigatorFactory(Navigator);

  /**
   * @param {object} spec
   * @param {string[]} spec.initial route names of the initial stack (outer navigator)
   * @param {Record<string, (navigation, route) => void>} [spec.hooks] called as hooks inside a screen
   * @param {Record<string, any>} [spec.listeners] per-screen `listeners` prop
   * @param {{ host: string, id?: string, initial: string[] }} [spec.nested]
   *   screen `host` of the outer navigator renders an inner navigator
   * @param {string} [spec.outerId]
   */
  function mount(spec) {
    const stats = { mounts: {}, unmounts: {}, navs: {}, routesByName: {}, stateChanges: 0 };
    const hooks = spec.hooks || {};
    const listeners = spec.listeners || {};
    const names = new Set(spec.initial);
    ((spec.nested && spec.nested.initial) || []).forEach((n) => names.add(n));
    (spec.extraScreens || []).forEach((n) => names.add(n));

    function makeScreen(name) {
      return function ScreenComponent({ navigation, route }) {
        stats.navs[route.key] = navigation;
        stats.routesByName[name] = route;
        React.useEffect(() => {
          stats.mounts[route.key] = (stats.mounts[route.key] || 0) + 1;
          return () => {
            stats.unmounts[route.key] = (stats.unmounts[route.key] || 0) + 1;
          };
        }, [route.key]);
        if (hooks[name]) hooks[name](navigation, route);
        return null;
      };
    }

    const Outer = makeNav();
    const Inner = makeNav();
    const comps = {};
    const get = (n) => (comps[n] = comps[n] || makeScreen(n));
    const screen = (N, n) =>
      h(N.Screen, { key: n, name: n, component: get(n), listeners: listeners[n] });

    function InnerHost() {
      return h(
        Inner.Navigator,
        { initialRouteName: spec.nested.initial[0], id: spec.nested.id },
        ...spec.nested.initial.map((n) => screen(Inner, n))
      );
    }
    const outerNames = Array.from(new Set(spec.initial.concat(spec.extraScreens || [])));
    const outerChildren = outerNames.map((n) =>
      n === (spec.nested && spec.nested.host)
        ? h(Outer.Screen, { key: n, name: n, component: InnerHost })
        : screen(Outer, n)
    );
    const outerProps = { id: spec.outerId };
    const initialState = {
      routes: spec.initial.map((n) =>
        n === (spec.nested && spec.nested.host)
          ? {
              name: n,
              state: { routes: spec.nested.initial.map((m) => ({ name: m })) },
            }
          : { name: n }
      ),
    };

    const ref = React.createRef();
    let tree;
    const element = (strict) => {
      const root = h(
        BaseNavigationContainer,
        {
          ref,
          initialState,
          onStateChange: () => {
            stats.stateChanges++;
          },
        },
        h(Outer.Navigator, outerProps, ...outerChildren)
      );
      return strict ? h(React.StrictMode, null, root) : root;
    };
    act(() => {
      tree = TestRenderer.create(element(spec.strict));
    });
    stats.stateChanges = 0;

    const api = {
      stats,
      ref,
      state: () => ref.current.getRootState(),
      names: () => ref.current.getRootState().routes.map((r) => r.name),
      keys: () => ref.current.getRootState().routes.map((r) => r.key),
      navOf: (name) => {
        const r = ref.current.getRootState().routes.filter((x) => x.name === name);
        return stats.navs[r[r.length - 1].key];
      },
      navOfKey: (key) => stats.navs[key],
      act,
      sleep,
      resetCount: () => {
        stats.stateChanges = 0;
      },
      unmount: () => act(() => tree.unmount()),
      flush: () => act(async () => { await sleep(0); }),
    };
    return api;
  }

  return { mount };
}

module.exports = { loadCore, createHarness, act, sleep };
