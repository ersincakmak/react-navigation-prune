import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createDemoApp } from '../shared';

const Demo = createDemoApp({
  version: 'v7',
  NavigationContainer,
  createStackNavigator,
  supportsNavigatorId: true,
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Demo />
    </GestureHandlerRootView>
  );
}
