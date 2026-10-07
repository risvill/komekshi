import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

export default function More() {
  const { user, logout, updateUser } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);

  const [editingAccount, setEditingAccount] =
    useState(false);

  const [savingAccount, setSavingAccount] =
    useState(false);

  const [businessName, setBusinessName] =
    useState(user?.business_name || '');

  const [userName, setUserName] =
    useState(user?.name || '');

  const [email, setEmail] =
    useState(user?.email || '');

  const [phone, setPhone] =
    useState(user?.phone || '');

  const sheetAnimation = useRef(
    new Animated.Value(0)
  ).current;

  const backdropAnimation = useRef(
    new Animated.Value(0)
  ).current;

  const [modalVisible, setModalVisible] =
    useState(false);

  const startEditingAccount = () => {
    setBusinessName(
      user?.business_name || ''
    );
    setUserName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');

    sheetAnimation.setValue(0);
    backdropAnimation.setValue(0);

    setModalVisible(true);
    setEditingAccount(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(sheetAnimation, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(backdropAnimation, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const cancelEditingAccount = () => {
    if (savingAccount) {
      return;
    }

    Animated.parallel([
      Animated.timing(sheetAnimation, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(backdropAnimation, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        setEditingAccount(false);

        setBusinessName(
          user?.business_name || ''
        );
        setUserName(user?.name || '');
        setEmail(user?.email || '');
        setPhone(user?.phone || '');
      }
    });
  };

  const saveAccount = async () => {
    if (!userName.trim()) {
      Alert.alert(
        'Ошибка',
        'Введите имя'
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        'Ошибка',
        'Введите email'
      );
      return;
    }

    try {
      setSavingAccount(true);

      await updateUser({
        name: userName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        business_name:
          businessName.trim() || null,
      });

      setSavingAccount(false);

      Animated.parallel([
        Animated.timing(sheetAnimation, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(backdropAnimation, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setModalVisible(false);
          setEditingAccount(false);
        }
      });

      Alert.alert(
        'Готово',
        'Данные аккаунта обновлены'
      );
    } catch (error) {
      console.error(
        'Failed to update account:',
        error
      );

      setSavingAccount(false);

      Alert.alert(
        'Ошибка',
        'Не удалось изменить данные аккаунта'
      );
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
    if (loggingOut) {
      return;
    }

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
          onPress: () =>
            void performLogout(),
        },
      ]
    );
  };

  const getInitials = () => {
    const name =
      user?.name?.trim() ||
      user?.business_name?.trim() ||
      'K';

    const words = name
      .split(/\s+/)
      .filter(Boolean);

    if (words.length >= 2) {
      return (
        words[0][0] +
        words[1][0]
      ).toUpperCase();
    }

    return name
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
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

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials()}
              </Text>
            </View>

            <View style={styles.profileMain}>
              <Text
                style={styles.businessName}
                numberOfLines={1}
              >
                {user?.business_name ||
                  'Komekshi'}
              </Text>

              <Text style={styles.userName}>
                {user?.name ||
                  'Пользователь'}
              </Text>
            </View>

            <Pressable
              style={styles.editButton}
              onPress={startEditingAccount}
              hitSlop={8}
            >
              <Text style={styles.editButtonText}>
                Изменить
              </Text>
            </Pressable>
          </View>

          <View style={styles.profileDivider} />

          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>
              EMAIL
            </Text>

            <Text
              style={styles.contactValue}
              numberOfLines={1}
            >
              {user?.email || '—'}
            </Text>
          </View>

          <View
            style={[
              styles.contactRow,
              styles.contactRowLast,
            ]}
          >
            <Text style={styles.contactLabel}>
              ТЕЛЕФОН
            </Text>

            <Text
              style={styles.contactValue}
              numberOfLines={1}
            >
              {user?.phone || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            УПРАВЛЕНИЕ
          </Text>

          <Text style={styles.sectionHint}>
            KOMEKSHI
          </Text>
        </View>

        <View style={styles.menuCard}>
          <Pressable
            style={styles.menuItem}
            onPress={() =>
              router.push('/accounts')
            }
          >
            <View
              style={[
                styles.menuIcon,
                styles.accountIcon,
              ]}
            >
              <Text style={styles.iconText}>
                ₸
              </Text>
            </View>

            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>
                Счета
              </Text>

              <Text style={styles.menuSubtitle}>
                Счета и оплаты
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() =>
              router.push('/products')
            }
          >
            <View
              style={[
                styles.menuIcon,
                styles.productIcon,
              ]}
            >
              <Text style={styles.iconText}>
                📦
              </Text>
            </View>

            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>
                Товары
              </Text>

              <Text style={styles.menuSubtitle}>
                Товары и цены
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() =>
              router.push('/tasks')
            }
          >
            <View
              style={[
                styles.menuIcon,
                styles.taskIcon,
              ]}
            >
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
        </View>

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
              : 'Выйти из аккаунта'}
          </Text>
        </Pressable>

        <Text style={styles.version}>
          Komekshi
        </Text>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={cancelEditingAccount}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <Animated.View
            style={[
              styles.modalBackdrop,
              {
                opacity:
                  backdropAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.35],
                  }),
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={cancelEditingAccount}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY:
                      sheetAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [700, 0],
                      }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>
                  Данные аккаунта
                </Text>

                <Text style={styles.sheetSubtitle}>
                  Измените информацию о себе
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={cancelEditingAccount}
                disabled={savingAccount}
                hitSlop={8}
              >
                <Text style={styles.closeButtonText}>
                  ×
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.sheetContent
              }
            >
              <Text style={styles.inputLabel}>
                НАЗВАНИЕ БИЗНЕСА
              </Text>

              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Название бизнеса"
                placeholderTextColor="#999999"
                editable={!savingAccount}
              />

              <Text style={styles.inputLabel}>
                ИМЯ
              </Text>

              <TextInput
                style={styles.input}
                value={userName}
                onChangeText={setUserName}
                placeholder="Имя"
                placeholderTextColor="#999999"
                editable={!savingAccount}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>
                EMAIL
              </Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!savingAccount}
              />

              <Text style={styles.inputLabel}>
                ТЕЛЕФОН
              </Text>

              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Телефон"
                placeholderTextColor="#999999"
                keyboardType="phone-pad"
                editable={!savingAccount}
              />

              <View style={styles.editActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={cancelEditingAccount}
                  disabled={savingAccount}
                >
                  <Text
                    style={styles.cancelButtonText}
                  >
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
                    <Text
                      style={styles.saveButtonText}
                    >
                      Сохранить
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
    lineHeight: 38,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 30,
  },

  sectionTitle: {
    marginLeft: 4,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
  },

  profileCard: {
    padding: 20,
    marginBottom: 30,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    marginRight: 14,
  },

  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  profileMain: {
    flex: 1,
    paddingRight: 10,
  },

  businessName: {
    marginBottom: 3,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111111',
  },

  userName: {
    fontSize: 14,
    lineHeight: 19,
    color: '#777777',
  },

  editButton: {
    paddingHorizontal: 2,
    paddingVertical: 5,
  },

  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#208AEF',
  },

  profileDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 18,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 25,
    marginBottom: 8,
  },

  contactRowLast: {
    marginBottom: 0,
  },

  contactLabel: {
    width: 72,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 0.7,
  },

  contactValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: '#444444',
    textAlign: 'right',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },

  sectionHint: {
    marginBottom: 10,
    fontSize: 10,
    fontWeight: '600',
    color: '#C2C2C2',
    letterSpacing: 1,
  },

  menuCard: {
    overflow: 'hidden',
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  menuIcon: {
    width: 42,
    height: 42,
    marginRight: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountIcon: {
    backgroundColor: '#FFFFFF',
  },

  productIcon: {
    backgroundColor: '#FFFFFF',
  },

  taskIcon: {
    backgroundColor: '#FFFFFF',
  },

  iconText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
  },

  menuTextContainer: {
    flex: 1,
  },

  menuTitle: {
    marginBottom: 3,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#111111',
  },

  menuSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#777777',
  },

  arrow: {
    marginLeft: 10,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '300',
    color: '#888888',
  },

  logoutItem: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FCE8E6',
  },

  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B42318',
  },

  logoutItemDisabled: {
    opacity: 0.6,
  },

  version: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 11,
    color: '#C0C0C0',
    letterSpacing: 0.8,
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },

  bottomSheet: {
    maxHeight: '90%',
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: 20,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  sheetHeaderText: {
    flex: 1,
    paddingRight: 16,
  },

  sheetTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
    color: '#111111',
  },

  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#777777',
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEAEA',
  },

  closeButtonText: {
    marginTop: -2,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '300',
    color: '#555555',
  },

  sheetContent: {
    paddingBottom: 4,
  },

  inputLabel: {
    marginBottom: 7,
    marginLeft: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.6,
  },

  input: {
    height: 50,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#111111',
  },

  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EAEAEA',
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },

  saveButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#111111',
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  disabledButton: {
    opacity: 0.55,
  },

  menuDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: 58,
  },
});