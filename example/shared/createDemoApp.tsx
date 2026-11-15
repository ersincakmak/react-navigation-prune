// Version-agnostic demo. Never imports @react-navigation: App.tsx passes in the
// version-specific pieces (NavigationContainer + createStackNavigator).
import * as React from 'react';
import {
  createPruneListeners,
  navigateAndPrune,
  pruneStack,
  usePruneOnMount,
} from 'react-navigation-stack-pruner';
import { Button, Frame } from './ui';

export interface DemoConfig {
  /** Label shown on every screen, e.g. "v7". */
  version: string;
  NavigationContainer: React.ComponentType<any>;
  createStackNavigator: () => any;
  /** true on v6/v7 (navigator `id` prop and `navigatorId` option). */
  supportsNavigatorId: boolean;
}

type Mode = 'navigate' | 'hook' | 'listener' | 'imperative' | 'inclusive' | 'keep' | 'dup' | 'nested';

const pruneListeners = createPruneListeners({ from: 'Cart' });

export function createDemoApp(config: DemoConfig): React.ComponentType {
  const { version, NavigationContainer, supportsNavigatorId } = config;
  const Outer = config.createStackNavigator();
  const Inner = config.createStackNavigator();

  const frame = (p: any, children?: React.ReactNode) => (
    <Frame version={version} navigation={p.navigation} route={p.route}>
      {children}
    </Frame>
  );

  function Home(p: any) {
    const go = (testID: string, title: string, mode: Mode) => (
      <Button
        testID={testID}
        title={title}
        onPress={() => p.navigation.push('Cart', { mode })}
      />
    );
    return frame(
      p,
      <>
        {go('btn-s1-navigate', '1. navigateAndPrune checkout', 'navigate')}
        {go('btn-s2-hook', '2. usePruneOnMount', 'hook')}
        {go('btn-s3-listener', '3. createPruneListeners', 'listener')}
        {go('btn-s4-imperative', '4. imperative pruneStack', 'imperative')}
        {go('btn-s5-duplicates', '5. duplicates (nearest / farthest)', 'dup')}
        {go('btn-s6-inclusive', '6a. inclusive: true', 'inclusive')}
        {go('btn-s6-keep', "6b. keep: ['Address']", 'keep')}
        {go('btn-s7-nested', '7. nested navigator', 'nested')}
      </>
    );
  }

  function Cart(p: any) {
    const { mode, round } = p.route.params ?? {};
    const next =
      mode === 'dup'
        ? () => p.navigation.push('Step', { mode, n: round ?? 1 })
        : () => p.navigation.push('Address', { mode });
    return frame(p, <Button testID="btn-next" title="Next" onPress={next} />);
  }

  function Step(p: any) {
    const { mode, n } = p.route.params ?? {};
    const next =
      n === 1
        ? () => p.navigation.push('Cart', { mode, round: 2 })
        : () => p.navigation.push('Done', { mode });
    return frame(p, <Button testID="btn-next" title="Next" onPress={next} />);
  }

  function Done(p: any) {
    return frame(
      p,
      <>
        <Button
          testID="btn-prune-nearest"
          title="prune nearest (match)"
          onPress={() => pruneStack(p.navigation, { from: 'Cart', match: 'nearest' })}
        />
        <Button
          testID="btn-prune-farthest"
          title="prune farthest (match)"
          onPress={() => pruneStack(p.navigation, { from: 'Cart', match: 'farthest' })}
        />
      </>
    );
  }

  function Address(p: any) {
    const { mode } = p.route.params ?? {};
    const next =
      mode === 'nested'
        ? () => p.navigation.push('Nested')
        : () => p.navigation.push('Payment', { mode });
    return frame(p, <Button testID="btn-next" title="Next" onPress={next} />);
  }

  function Payment(p: any) {
    const nav = p.navigation;
    const mode: Mode = p.route.params?.mode;
    const params = { mode };
    let pay: () => void;
    switch (mode) {
      case 'navigate':
        pay = () => navigateAndPrune(nav, { name: 'Success', params }, { from: 'Cart' });
        break;
      case 'inclusive':
        pay = () =>
          navigateAndPrune(nav, { name: 'Success', params }, { from: 'Cart', inclusive: true });
        break;
      case 'keep':
        pay = () =>
          navigateAndPrune(nav, { name: 'Success', params }, { from: 'Cart', keep: ['Address'] });
        break;
      default: // hook, listener, imperative: plain push, pruning happens elsewhere
        pay = () => nav.push('Success', params);
    }
    return frame(
      p,
      <>
        <Button testID="btn-pay" title="Pay" onPress={pay} />
        {mode === 'imperative' && (
          <Button
            testID="btn-prune"
            title="pruneStack({ from: 'Cart' })"
            onPress={() => pruneStack(nav, { from: 'Cart' })}
          />
        )}
      </>
    );
  }

  function Success(p: any) {
    const mode: Mode = p.route.params?.mode;
    usePruneOnMount(
      p.navigation,
      { from: 'Cart', anchorKey: p.route.key },
      { enabled: mode === 'hook' }
    );
    return frame(p);
  }

  function InnerA(p: any) {
    return frame(
      p,
      <Button testID="btn-next" title="Next (inner)" onPress={() => p.navigation.push('InnerB')} />
    );
  }

  function InnerB(p: any) {
    return frame(
      p,
      <>
        <Button
          testID="btn-prune-auto"
          title="pruneStack({ from: 'Cart' }) (auto parent)"
          onPress={() => pruneStack(p.navigation, { from: 'Cart' })}
        />
        {supportsNavigatorId && (
          <Button
            testID="btn-prune-id"
            title="pruneStack({ from: 'Cart', navigatorId: 'root' })"
            onPress={() => pruneStack(p.navigation, { from: 'Cart', navigatorId: 'root' })}
          />
        )}
      </>
    );
  }

  function Nested() {
    return (
      <Inner.Navigator screenOptions={{ headerShown: false }}>
        <Inner.Screen name="InnerA" component={InnerA} />
        <Inner.Screen name="InnerB" component={InnerB} />
      </Inner.Navigator>
    );
  }

  return function DemoApp() {
    return (
      <NavigationContainer>
        <Outer.Navigator
          id={supportsNavigatorId ? 'root' : undefined}
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Outer.Screen name="Home" component={Home} />
          <Outer.Screen name="Cart" component={Cart} />
          <Outer.Screen name="Step" component={Step} />
          <Outer.Screen name="Done" component={Done} />
          <Outer.Screen name="Address" component={Address} />
          <Outer.Screen name="Payment" component={Payment} />
          <Outer.Screen
            name="Success"
            component={Success}
            listeners={(lp: any) =>
              lp.route.params?.mode === 'listener' ? pruneListeners(lp) : {}
            }
          />
          <Outer.Screen name="Nested" component={Nested} />
        </Outer.Navigator>
      </NavigationContainer>
    );
  };
}
