import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mountCountFor, recordMount, resetMounts } from './mounts';
import { collectKeys, getAncestors, getNavState, routeNames } from './navUtils';
import type { DemoNavigation, DemoRoute } from './navUtils';

export function Button(props: { testID: string; title: string; onPress: () => void }) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityLabel={props.testID}
      onPress={props.onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.buttonText}>{props.title}</Text>
    </Pressable>
  );
}

function useStackInfo(navigation: DemoNavigation) {
  const read = React.useCallback(() => {
    const chain = getAncestors(navigation);
    const root = chain[chain.length - 1];
    const rootState = getNavState(root);
    return {
      stack: routeNames(rootState).join(' › '),
      local: chain.length > 1 ? routeNames(getNavState(navigation)).join(' › ') : null,
      mounts: collectKeys(rootState)
        .map((k) => `${k.name}=${mountCountFor(k.key)}`)
        .join(' '),
    };
  }, [navigation]);

  const [info, setInfo] = React.useState(read);
  React.useEffect(() => {
    const update = () => setInfo(read());
    update();
    const unsubs = getAncestors(navigation).flatMap((nav) => [
      nav.addListener('state', update),
      nav.addListener('focus', update),
    ]);
    return () => unsubs.forEach((u) => u());
  }, [navigation, read]);
  return { info, refresh: () => setInfo(read()) };
}

export function Frame(props: {
  version: string;
  navigation: DemoNavigation;
  route: DemoRoute;
  children?: React.ReactNode;
}) {
  const { version, navigation, route } = props;
  const { info, refresh } = useStackInfo(navigation);

  // Count real component instances, not effect runs: some stacks keep hidden
  // screens in React <Activity>, which re-runs effects without remounting.
  React.useState(() => {
    recordMount(route.key, route.name);
    return true;
  });
  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chain = getAncestors(navigation);
  const root = chain[chain.length - 1]!;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text testID="version-label" style={styles.version}>
        RN Nav {version}
      </Text>
      <Text testID="screen-name" style={styles.title}>
        {route.name}
      </Text>
      <Text testID="stack-readout" style={styles.mono}>
        Stack: {info.stack}
      </Text>
      {info.local !== null && (
        <Text testID="local-readout" style={styles.mono}>
          Local: {info.local}
        </Text>
      )}
      <Text testID="mount-count" style={styles.mono}>
        Mounts (this screen): {mountCountFor(route.key)}
      </Text>
      <Text testID="mount-log" style={styles.mono}>
        Mounts (all): {info.mounts}
      </Text>
      <View style={styles.buttons}>
        {props.children}
        <Button testID="btn-back" title="Back" onPress={() => navigation.goBack()} />
        <Button
          testID="btn-reset"
          title="Reset demo"
          onPress={() => {
            resetMounts();
            // Same action `navigation.reset()` dispatches, without its per-navigator typing.
            root.dispatch({ type: 'RESET', payload: { index: 0, routes: [{ name: 'Home' }] } });
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 40, gap: 6 },
  version: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  mono: { fontFamily: 'Menlo', fontSize: 13, color: '#111827' },
  buttons: { marginTop: 16, gap: 10 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  pressed: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: '600' },
});
