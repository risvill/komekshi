import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import {
  Account,
  AccountType,
  createAccount,
  getAccounts,
} from '@/services/accountsService';

export default function Accounts() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('KASPI');
  const [saving, setSaving] = useState(false);

  const loadAccounts = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setAccounts(await getAccounts(token));
    } catch (error) {
      console.error('Failed to load accounts:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить счета');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [token])
  );

  const handleCreate = async () => {
    if (!token) return;
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название счёта');
      return;
    }

    try {
      setSaving(true);
      const account = await createAccount(token, {
        name: name.trim(),
        type,
      });
      setAccounts((current) => [account, ...current]);
      setName('');
      setType('KASPI');
      setShowCreate(false);
    } catch (error) {
      console.error('Failed to create account:', error);
      Alert.alert('Ошибка', 'Не удалось создать счёт');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Счета</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowCreate((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={showCreate ? 'Закрыть форму' : 'Добавить счёт'}
        >
          <Text style={styles.addButtonText}>{showCreate ? '×' : '+'}</Text>
        </Pressable>
      </View>

      {showCreate && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Название счёта"
            value={name}
            onChangeText={setName}
            editable={!saving}
          />
          <View style={styles.typeRow}>
            {(['KASPI', 'CASH'] as const).map((accountType) => {
              const selected = type === accountType;
              return (
                <Pressable
                  key={accountType}
                  style={[styles.typeButton, selected && styles.typeButtonSelected]}
                  onPress={() => setType(accountType)}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      selected && styles.typeButtonTextSelected,
                    ]}
                  >
                    {accountType === 'KASPI' ? 'Kaspi' : 'Наличные'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleCreate}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Сохранение...' : 'Создать счёт'}
            </Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : accounts.length === 0 ? (
        <Text style={styles.emptyText}>Счетов пока нет</Text>
      ) : (
        accounts.map((account) => (
          <View key={account.id} style={styles.accountRow}>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountType}>
                {account.type === 'KASPI' ? 'Kaspi' : 'Наличные'}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                !account.is_active && styles.statusDotInactive,
              ]}
            />
          </View>
        ))
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111111',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
  },
  form: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
  },
  input: {
    padding: 13,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EAEAEA',
  },
  typeButtonSelected: {
    backgroundColor: '#111111',
  },
  typeButtonText: {
    color: '#333333',
    fontWeight: '600',
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
  },
  saveButton: {
    alignItems: 'center',
    padding: 13,
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
  loader: {
    marginTop: 36,
  },
  emptyText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#777777',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    marginTop: 4,
    color: '#777777',
    fontSize: 14,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#248A52',
  },
  statusDotInactive: {
    backgroundColor: '#BBBBBB',
  },
});
