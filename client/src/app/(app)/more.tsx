import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';

export default function More() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const businessName = user?.business_name || 'Komekshi';
  const userName = user?.name || 'Пользователь';
  const email = user?.email || '';

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
      Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;

    if (Platform.OS === 'web') {
      if (window.confirm('Вы действительно хотите выйти из аккаунта?')) {
        void performLogout();
      }
      return;
    }

    Alert.alert('Выйти из аккаунта?', 'Вы действительно хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => void performLogout(),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Ещё</Text>

      <Text style={styles.sectionTitle}>АККАУНТ</Text>
      <View style={styles.accountCard}>
        <Text style={styles.businessName}>{businessName}</Text>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <Text style={styles.sectionTitle}>УПРАВЛЕНИЕ</Text>
      <Pressable
        style={styles.menuItem}
        onPress={() => router.push('/accounts')}
      >
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>₸</Text>
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Счета</Text>
          <Text style={styles.menuSubtitle}>
            Управление счетами и оплатами
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={styles.menuItem}
        onPress={() => router.push('/products')}
      >
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>Т</Text>
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Товары</Text>
          <Text style={styles.menuSubtitle}>
            Управление товарами и ценами
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={styles.menuItem}
        onPress={() => router.push('/tasks')}
      >
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Задачи</Text>
          <Text style={styles.menuSubtitle}>Задачи и сроки</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={[styles.logoutItem, loggingOut && styles.logoutItemDisabled]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Text style={styles.logoutText}>
          {loggingOut ? 'Выходим...' : 'Выйти'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  accountCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#777777',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 19,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#777777',
  },
  arrow: {
    fontSize: 26,
    color: '#777777',
  },
  logoutItem: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FCE8E6',
  },
  logoutText: {
    color: '#B42318',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutItemDisabled: {
    opacity: 0.6,
  },
});
