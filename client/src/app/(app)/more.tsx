import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';

export default function More() {
  const { user, logout, updateUser } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const [businessName, setBusinessName] = useState(
    user?.business_name || ''
  );
  const [userName, setUserName] = useState(
    user?.name || ''
  );
  const [email, setEmail] = useState(
    user?.email || ''
  );
  const [phone, setPhone] = useState(
    user?.phone || ''
  );

  const startEditingAccount = () => {
    setBusinessName(user?.business_name || '');
    setUserName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setEditingAccount(true);
  };

  const cancelEditingAccount = () => {
    setBusinessName(user?.business_name || '');
    setUserName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setEditingAccount(false);
  };

  const saveAccount = async () => {
    if (!userName.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Ошибка', 'Введите email');
      return;
    }

    try {
      setSavingAccount(true);

      await updateUser({
        name: userName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        business_name: businessName.trim() || null,
      });

      setEditingAccount(false);

      Alert.alert(
        'Готово',
        'Данные аккаунта обновлены'
      );
    } catch (error) {
      console.error(
        'Failed to update account:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось изменить данные аккаунта'
      );
    } finally {
      setSavingAccount(false);
    }
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error(
        'Failed to log out:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось выйти из аккаунта'
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;

    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Вы действительно хотите выйти из аккаунта?'
        )
      ) {
        void performLogout();
      }

      return;
    }

    Alert.alert(
      'Выйти из аккаунта?',
      'Вы действительно хотите выйти?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: () => void performLogout(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Ещё
      </Text>

      <Text style={styles.sectionTitle}>
        АККАУНТ
      </Text>

      <View style={styles.accountCard}>
        {!editingAccount ? (
          <>
            <View style={styles.accountHeader}>
              <View style={styles.accountInfo}>
                <Text style={styles.businessName}>
                  {user?.business_name ||
                    'Komekshi'}
                </Text>

                <Text style={styles.userName}>
                  {user?.name ||
                    'Пользователь'}
                </Text>

                <Text style={styles.email}>
                  {user?.email || ''}
                </Text>

                {user?.phone && (
                  <Text style={styles.phone}>
                    {user.phone}
                  </Text>
                )}
              </View>

              <Pressable
                style={styles.editButton}
                onPress={startEditingAccount}
              >
                <Text style={styles.editButtonText}>
                  Изменить
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.inputLabel}>
              Название бизнеса
            </Text>

            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Название бизнеса"
              editable={!savingAccount}
            />

            <Text style={styles.inputLabel}>
              Имя
            </Text>

            <TextInput
              style={styles.input}
              value={userName}
              onChangeText={setUserName}
              placeholder="Имя"
              editable={!savingAccount}
            />

            <Text style={styles.inputLabel}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!savingAccount}
            />

            <Text style={styles.inputLabel}>
              Телефон
            </Text>

            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Телефон"
              keyboardType="phone-pad"
              editable={!savingAccount}
            />

            <View style={styles.editActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={cancelEditingAccount}
                disabled={savingAccount}
              >
                <Text style={styles.cancelButtonText}>
                  Отмена
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  savingAccount &&
                    styles.disabledButton,
                ]}
                onPress={() =>
                  void saveAccount()
                }
                disabled={savingAccount}
              >
                {savingAccount ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Сохранить
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>
        УПРАВЛЕНИЕ
      </Text>

      <Pressable
        style={styles.menuItem}
        onPress={() =>
          router.push('/accounts')
        }
      >
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>
            ₸
          </Text>
        </View>

        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>
            Счета
          </Text>

          <Text style={styles.menuSubtitle}>
            Управление счетами и оплатами
          </Text>
        </View>

        <Text style={styles.arrow}>
          ›
        </Text>
      </Pressable>

      <Pressable
        style={styles.menuItem}
        onPress={() =>
          router.push('/products')
        }
      >
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>
            Т
          </Text>
        </View>

        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>
            Товары
          </Text>

          <Text style={styles.menuSubtitle}>
            Управление товарами и ценами
          </Text>
        </View>

        <Text style={styles.arrow}>
          ›
        </Text>
      </Pressable>

      <Pressable
        style={styles.menuItem}
        onPress={() =>
          router.push('/tasks')
        }
      >
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>
            ✓
          </Text>
        </View>

        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>
            Задачи
          </Text>

          <Text style={styles.menuSubtitle}>
            Задачи и сроки
          </Text>
        </View>

        <Text style={styles.arrow}>
          ›
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.logoutItem,
          loggingOut &&
            styles.logoutItemDisabled,
        ]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Text style={styles.logoutText}>
          {loggingOut
            ? 'Выходим...'
            : 'Выйти'}
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

  accountHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  accountInfo: {
    flex: 1,
    paddingRight: 12,
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

  phone: {
    marginTop: 4,
    fontSize: 14,
    color: '#777777',
  },

  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },

  editButtonText: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '600',
  },

  inputLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },

  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#EAEAEA',
  },

  cancelButtonText: {
    color: '#333333',
    fontWeight: '600',
  },

  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#208AEF',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.6,
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