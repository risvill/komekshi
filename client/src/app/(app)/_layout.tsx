import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="task-details" />
      <Stack.Screen name="order-details" />
      <Stack.Screen name="new-order" />
      <Stack.Screen name="new-task" />
      <Stack.Screen name="new-client" />
      <Stack.Screen name="client-details" />
      <Stack.Screen name="edit-client" />
      <Stack.Screen name="products" />
      <Stack.Screen name="accounts" />
      <Stack.Screen name="new-product" />
      <Stack.Screen name="select-client" />
      <Stack.Screen name="select-product" />
    </Stack>
  );
}