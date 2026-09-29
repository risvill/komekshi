import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

export default function More() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>

      <Pressable
        style={styles.menuItem}
        onPress={() => router.push('/products')}
      >
        <View>
          <Text style={styles.menuTitle}>Products</Text>
          <Text style={styles.menuSubtitle}>
            Manage your products and prices
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={styles.menuItem}
        onPress={() => router.push('/tasks')}
      >
        <View>
          <Text style={styles.menuTitle}>Tasks</Text>
          <Text style={styles.menuSubtitle}>
            Manage your tasks and deadlines
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    marginBottom: 12,
  },

  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },

  menuSubtitle: {
    fontSize: 14,
    color: '#777',
  },

  arrow: {
    fontSize: 28,
    color: '#777',
  },
});