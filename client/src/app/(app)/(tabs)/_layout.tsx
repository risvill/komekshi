import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function FloatingTabBar() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Today',
      route: '/',
      icon: 'home-outline' as const,
      activeIcon: 'home' as const,
    },
    {
      name: 'Orders',
      route: '/orders',
      icon: 'receipt-outline' as const,
      activeIcon: 'receipt' as const,
    },
    {
      name: 'Calendar',
      route: '/calendar',
      icon: 'calendar-outline' as const,
      activeIcon: 'calendar' as const,
    },
    {
      name: 'Clients',
      route: '/clients',
      icon: 'people-outline' as const,
      activeIcon: 'people' as const,
    },
    {
      name: 'More',
      route: '/more',
      icon: 'ellipsis-horizontal' as const,
      activeIcon: 'ellipsis-horizontal' as const,
    },
  ];

  const isActive = (route: string) => {
    if (route === '/') {
      return pathname === '/' || pathname === '/index';
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const handlePress = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const active = isActive(tab.route);

        return (
          <Pressable
            key={tab.name}
            onPress={() => handlePress(tab.route)}
            hitSlop={4}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.tabContent,
                active && styles.activeTab,
              ]}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? '#FFFFFF' : '#6F6F73'}
              />

              <Text
                style={[
                  styles.label,
                  active && styles.activeLabel,
                ]}
              >
                {tab.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: false,

            tabBarStyle: {
              display: 'none',
            },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="orders" />
          <Tabs.Screen name="calendar" />
          <Tabs.Screen name="clients" />
          <Tabs.Screen name="more" />
        </Tabs>

        <View style={styles.bottomArea}>
          <FloatingTabBar />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  bottomArea: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,

    paddingBottom: 0,
  },

  bar: {
    width: '100%',
    height: 85,

    paddingHorizontal: 6,
    paddingTop: 15,
    paddingBottom: 30,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    backgroundColor: '#FFFFFF',

    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,

    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.14,
    shadowRadius: 12,

    elevation: 10,
  },

  tab: {
    flex: 1,
    height: 60,

    alignItems: 'center',
    justifyContent: 'center',
  },

  tabContent: {
    minWidth: 58,
    height: 52,

    paddingHorizontal: 9,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTab: {
    backgroundColor: '#111111',
  },

  label: {
    marginTop: 2,

    fontSize: 9,
    lineHeight: 12,
    fontWeight: '500',

    color: '#6F6F73',
  },

  activeLabel: {
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.7,
  },
});