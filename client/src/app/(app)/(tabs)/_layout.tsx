import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function TabsLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF',}} edges={['top']}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Today' }}
        />

        <Tabs.Screen
  name="orders"
  options={{ title: 'Orders' }}
  listeners={{
    tabPress: (event) => {
      event.preventDefault();

      router.replace('/orders');
    },
  }}
/>

        <Tabs.Screen
          name="calendar"
          options={{ title: 'Calendar' }}
        />

        <Tabs.Screen
          name="clients"
          options={{ title: 'Clients' }}
        />

        <Tabs.Screen
          name="more"
          options={{ title: 'More' }}
        />
      </Tabs>
    </SafeAreaView>
  );
}