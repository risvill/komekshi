import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
        }}
      />

      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
      name="new-product"
      options={{
        href: null,
      }}
    />

    <Tabs.Screen
      name="order-details"
      options={{
        href: null,
      }}
    />

    <Tabs.Screen
      name="new-order"
      options={{
        href: null,
      }}
    />

    <Tabs.Screen
      name="new-client"
      options={{
        href: null,
      }}
    />

    <Tabs.Screen
      name="client-details"
      options={{
        href: null,
      }}
    />

    <Tabs.Screen
      name="edit-client"
      options={{
        href: null,
      }}
    />
    <Tabs.Screen name="tasks" options={{ href: null, }} />

    <Tabs.Screen
      name="task-details"
      options={{
        href: null,
      }}
    />
    </Tabs>
    
  );
}