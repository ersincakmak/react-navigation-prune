// Version-agnostic demo. App.tsx passes in the version-specific runtime pieces
// (NavigationContainer + createStackNavigator); this file only imports their
// types, so it is type-checked against each version's own declarations.
import * as React from "react";
import type { NavigationContainer as NavigationContainerType } from "@react-navigation/native";
import type { createStackNavigator as createStackNavigatorType } from "@react-navigation/stack";
import { pruneListeners, pushAndPrune, prune, usePrune } from "react-navigation-prune";
import type { Mode, NestedScreenProps, NestedStackParamList, RootScreenProps, RootStackParamList } from "./navigation";
import type { DemoNavigation, DemoRoute } from "./navUtils";
import { Button, Frame } from "./ui";

export interface DemoConfig {
  /** Label shown on every screen, e.g. "v7". */
  version: string;
  NavigationContainer: typeof NavigationContainerType;
  createStackNavigator: typeof createStackNavigatorType;
  /** true on v6/v7 (navigator `id` prop and `navigatorId` option). */
  supportsNavigatorId: boolean;
}

// Not tied to a navigation object, so the param list is passed explicitly.
const cartListeners = pruneListeners<RootStackParamList>({ after: "Cart" });

export function createDemoApp(config: DemoConfig): React.ComponentType {
  const { version, NavigationContainer, supportsNavigatorId } = config;
  const Outer = config.createStackNavigator<RootStackParamList>();
  const Inner = config.createStackNavigator<NestedStackParamList>();

  const frame = (p: { navigation: DemoNavigation; route: DemoRoute }, children?: React.ReactNode) => (
    <Frame version={version} navigation={p.navigation} route={p.route}>
      {children}
    </Frame>
  );

  function Home(p: RootScreenProps<"Home">) {
    const go = (testID: string, title: string, mode: Mode) => (
      <Button testID={testID} title={title} onPress={() => p.navigation.push("Cart", { mode })} />
    );
    return frame(
      p,
      <>
        {go("btn-s1-navigate", "1. pushAndPrune checkout", "navigate")}
        {go("btn-s2-hook", "2. usePrune", "hook")}
        {go("btn-s3-listener", "3. pruneListeners", "listener")}
        {go("btn-s4-imperative", "4. imperative prune", "imperative")}
        {go("btn-s5-duplicates", "5. duplicates (nearest / farthest)", "dup")}
        {go("btn-s6-inclusive", "6a. from (removes Cart too)", "inclusive")}
        {go("btn-s6-keep", "6b. keep: ['Address']", "keep")}
        {go("btn-s7-nested", "7. nested navigator", "nested")}
      </>,
    );
  }

  function Cart(p: RootScreenProps<"Cart">) {
    const { mode, round } = p.route.params;
    const next =
      mode === "dup"
        ? () => p.navigation.push("Step", { mode, n: round ?? 1 })
        : () => p.navigation.push("Address", { mode });
    return frame(p, <Button testID="btn-next" title="Next" onPress={next} />);
  }

  function Step(p: RootScreenProps<"Step">) {
    const { mode, n } = p.route.params;
    const next =
      n === 1 ? () => p.navigation.push("Cart", { mode, round: 2 }) : () => p.navigation.push("Done", { mode });
    return frame(p, <Button testID="btn-next" title="Next" onPress={next} />);
  }

  function Done(p: RootScreenProps<"Done">) {
    return frame(
      p,
      <>
        <Button
          testID="btn-prune-nearest"
          title="prune nearest (match)"
          onPress={() => prune(p.navigation, { after: "Cart", match: "nearest" })}
        />
        <Button
          testID="btn-prune-farthest"
          title="prune farthest (match)"
          onPress={() => prune(p.navigation, { after: "Cart", match: "farthest" })}
        />
      </>,
    );
  }

  function Address(p: RootScreenProps<"Address">) {
    const { mode } = p.route.params;
    const next = mode === "nested" ? () => p.navigation.push("Nested") : () => p.navigation.push("Payment", { mode });
    return frame(p, <Button testID="btn-next" title="Next" onPress={next} />);
  }

  function Payment(p: RootScreenProps<"Payment">) {
    const nav = p.navigation;
    const { mode } = p.route.params;
    const params = { mode };
    let pay: () => void;
    switch (mode) {
      case "navigate":
        pay = () => pushAndPrune<RootStackParamList>(nav, { name: "Success", params }, { after: "Cart" });
        break;
      case "inclusive":
        pay = () => pushAndPrune<RootStackParamList>(nav, { name: "Success", params }, { from: "Cart" });
        break;
      case "keep":
        pay = () =>
          pushAndPrune<RootStackParamList>(nav, { name: "Success", params }, { after: "Cart", keep: ["Address"] });
        break;
      default: // hook, listener, imperative: plain push, pruning happens elsewhere
        pay = () => nav.push("Success", params);
    }
    return frame(
      p,
      <>
        <Button testID="btn-pay" title="Pay" onPress={pay} />
        {mode === "imperative" && (
          <Button testID="btn-prune" title="prune({ after: 'Cart' })" onPress={() => prune(nav, { after: "Cart" })} />
        )}
      </>,
    );
  }

  function Success(p: RootScreenProps<"Success">) {
    usePrune(p.navigation, { after: "Cart", anchorKey: p.route.key }, { enabled: p.route.params.mode === "hook" });
    return frame(p);
  }

  function InnerA(p: NestedScreenProps<"InnerA">) {
    return frame(p, <Button testID="btn-next" title="Next (inner)" onPress={() => p.navigation.push("InnerB")} />);
  }

  function InnerB(p: NestedScreenProps<"InnerB">) {
    // `Cart` lives in the parent (root) stack, not in this navigator, so the
    // root param list is passed explicitly; the parent is found at runtime.
    return frame(
      p,
      <>
        <Button
          testID="btn-prune-auto"
          title="prune({ after: 'Cart' }) (auto parent)"
          onPress={() => prune<RootStackParamList>(p.navigation, { after: "Cart" })}
        />
        {supportsNavigatorId && (
          <Button
            testID="btn-prune-id"
            title="prune({ after: 'Cart', navigatorId: 'root' })"
            onPress={() => prune<RootStackParamList>(p.navigation, { after: "Cart", navigatorId: "root" })}
          />
        )}
      </>,
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

  // `id` exists on v6/v7 navigators only.
  const rootId = supportsNavigatorId ? ({ id: "root" } as {}) : {};

  return function DemoApp() {
    return (
      <NavigationContainer>
        <Outer.Navigator {...rootId} initialRouteName="Home" screenOptions={{ headerShown: false }}>
          <Outer.Screen name="Home" component={Home} />
          <Outer.Screen name="Cart" component={Cart} />
          <Outer.Screen name="Step" component={Step} />
          <Outer.Screen name="Done" component={Done} />
          <Outer.Screen name="Address" component={Address} />
          <Outer.Screen name="Payment" component={Payment} />
          <Outer.Screen
            name="Success"
            component={Success}
            listeners={(lp) => (lp.route.params.mode === "listener" ? cartListeners(lp) : {})}
          />
          <Outer.Screen name="Nested" component={Nested} />
        </Outer.Navigator>
      </NavigationContainer>
    );
  };
}
