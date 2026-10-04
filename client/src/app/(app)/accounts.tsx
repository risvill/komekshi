import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  deleteAccount,
  getAccounts,
  updateAccount,
} from '@/services/accountsService';

export default function Accounts() {
  const { token } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] =
    useState(false);

  const [name, setName] = useState('');
  const [type, setType] =
    useState<AccountType>('KASPI');

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editingName, setEditingName] =
    useState('');

  const [editingType, setEditingType] =
    useState<AccountType>('KASPI');

  const [deletingAccount, setDeletingAccount] =
    useState<Account | null>(null);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [showCreateReplacement, setShowCreateReplacement] =
    useState(false);

  const [replacementName, setReplacementName] =
    useState('');

  const [replacementType, setReplacementType] =
    useState<AccountType>('KASPI');

  const [processingDelete, setProcessingDelete] =
    useState(false);

  const loadAccounts = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getAccounts(token);

      setAccounts(data);
    } catch (error) {
      console.error(
        'Failed to load accounts:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить счета'
      );
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
      Alert.alert(
        'Ошибка',
        'Введите название счёта'
      );

      return;
    }

    try {
      setSaving(true);

      const account = await createAccount(
        token,
        {
          name: name.trim(),
          type,
        }
      );

      setAccounts((current) => [
        account,
        ...current,
      ]);

      setName('');
      setType('KASPI');
      setShowCreate(false);
    } catch (error) {
      console.error(
        'Failed to create account:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось создать счёт'
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (
    account: Account
  ) => {
    setEditingId(account.id);
    setEditingName(account.name);
    setEditingType(account.type);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
    setEditingType('KASPI');
  };

  const handleUpdate = async (
    accountId: string
  ) => {
    if (!token) return;

    if (!editingName.trim()) {
      Alert.alert(
        'Ошибка',
        'Введите название счёта'
      );

      return;
    }

    try {
      setSaving(true);

      const updated = await updateAccount(
        token,
        accountId,
        {
          name: editingName.trim(),
          type: editingType,
        }
      );

      setAccounts((current) =>
        current.map((account) =>
          account.id === accountId
            ? updated
            : account
        )
      );

      cancelEditing();
    } catch (error) {
      console.error(
        'Failed to update account:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось изменить счёт'
      );
    } finally {
      setSaving(false);
    }
  };

  const startDelete = (
    account: Account
  ) => {
    const activeOtherAccounts =
      accounts.filter(
        (item) =>
          item.id !== account.id &&
          item.is_active
      );

    if (activeOtherAccounts.length === 0) {
      Alert.alert(
        'Нельзя удалить счёт',
        'Сначала создайте другой счёт, на который можно будет перенести платежи.',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Создать счёт',
            onPress: () => {
              setShowCreate(true);
            },
          },
        ]
      );

      return;
    }

    setDeletingAccount(account);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (processingDelete) return;

    setShowDeleteModal(false);
    setDeletingAccount(null);
    setShowCreateReplacement(false);
    setReplacementName('');
    setReplacementType('KASPI');
  };

  const deleteToExistingAccount = async (
    targetAccountId: string
  ) => {
    if (!token || !deletingAccount) {
      return;
    }

    try {
      setProcessingDelete(true);

      await deleteAccount(
        token,
        deletingAccount.id,
        targetAccountId
      );

      setAccounts((current) =>
        current.filter(
          (account) =>
            account.id !==
            deletingAccount.id
        )
      );

      closeDeleteModal();
    } catch (error) {
      console.error(
        'Failed to delete account:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось удалить счёт'
      );
    } finally {
      setProcessingDelete(false);
    }
  };

  const createReplacementAndDelete =
    async () => {
      if (!token || !deletingAccount) {
        return;
      }

      if (!replacementName.trim()) {
        Alert.alert(
          'Ошибка',
          'Введите название нового счёта'
        );

        return;
      }

      try {
        setProcessingDelete(true);

        const newAccount =
          await createAccount(
            token,
            {
              name:
                replacementName.trim(),
              type: replacementType,
            }
          );

        await deleteAccount(
          token,
          deletingAccount.id,
          newAccount.id
        );

        setAccounts((current) => [
          newAccount,
          ...current.filter(
            (account) =>
              account.id !==
              deletingAccount.id
          ),
        ]);

        closeDeleteModal();
      } catch (error) {
        console.error(
          'Failed to replace account:',
          error
        );

        Alert.alert(
          'Ошибка',
          'Не удалось перенести данные и удалить счёт'
        );
      } finally {
        setProcessingDelete(false);
      }
    };

  const otherActiveAccounts =
    accounts.filter(
      (account) =>
        account.id !==
          deletingAccount?.id &&
        account.is_active
    );

  const totalBalance = accounts.reduce(
    (sum, account) =>
      sum + Number(account.balance || 0),
    0
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Счета
          </Text>

          <Pressable
            style={styles.addButton}
            onPress={() =>
              setShowCreate(
                (current) => !current
              )
            }
            accessibilityRole="button"
            accessibilityLabel={
              showCreate
                ? 'Закрыть форму'
                : 'Добавить счёт'
            }
          >
            <Text style={styles.addButtonText}>
              {showCreate ? '×' : '+'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            Всего на счетах
          </Text>
          <Text style={styles.totalAmount}>
            {totalBalance.toLocaleString('ru-RU')} ₸
          </Text>
        </View>

        {showCreate && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              Новый счёт
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Название счёта"
              value={name}
              onChangeText={setName}
              editable={!saving}
            />

            <View style={styles.typeRow}>
              {(
                ['KASPI', 'CASH'] as const
              ).map((accountType) => {
                const selected =
                  type === accountType;

                return (
                  <Pressable
                    key={accountType}
                    style={[
                      styles.typeButton,
                      selected &&
                        styles.typeButtonSelected,
                    ]}
                    onPress={() =>
                      setType(accountType)
                    }
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        selected &&
                          styles.typeButtonTextSelected,
                      ]}
                    >
                      {accountType ===
                      'KASPI'
                        ? 'Kaspi'
                        : 'Наличные'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.saveButton,
                saving &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                void handleCreate()
              }
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving
                  ? 'Сохранение...'
                  : 'Создать счёт'}
              </Text>
            </Pressable>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            style={styles.loader}
          />
        ) : accounts.length === 0 ? (
          <Text style={styles.emptyText}>
            Счетов пока нет
          </Text>
        ) : (
          accounts.map((account) => {
            const isEditing =
              editingId === account.id;

            return (
              <View
                key={account.id}
                style={styles.accountRow}
              >
                {isEditing ? (
                  <View
                    style={
                      styles.editAccountContainer
                    }
                  >
                    <Text style={styles.formTitle}>
                      Изменить счёт
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Название счёта"
                      value={editingName}
                      onChangeText={
                        setEditingName
                      }
                      editable={!saving}
                    />

                    <View
                      style={styles.typeRow}
                    >
                      {(
                        [
                          'KASPI',
                          'CASH',
                        ] as const
                      ).map(
                        (accountType) => {
                          const selected =
                            editingType ===
                            accountType;

                          return (
                            <Pressable
                              key={
                                accountType
                              }
                              style={[
                                styles.typeButton,
                                selected &&
                                  styles.typeButtonSelected,
                              ]}
                              onPress={() =>
                                setEditingType(
                                  accountType
                                )
                              }
                              disabled={saving}
                            >
                              <Text
                                style={[
                                  styles.typeButtonText,
                                  selected &&
                                    styles.typeButtonTextSelected,
                                ]}
                              >
                                {accountType ===
                                'KASPI'
                                  ? 'Kaspi'
                                  : 'Наличные'}
                              </Text>
                            </Pressable>
                          );
                        }
                      )}
                    </View>

                    <View
                      style={
                        styles.editActions
                      }
                    >
                      <Pressable
                        style={
                          styles.cancelButton
                        }
                        onPress={
                          cancelEditing
                        }
                        disabled={saving}
                      >
                        <Text
                          style={
                            styles.cancelButtonText
                          }
                        >
                          Отмена
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.saveButton,
                          saving &&
                            styles.disabledButton,
                        ]}
                        onPress={() =>
                          void handleUpdate(
                            account.id
                          )
                        }
                        disabled={saving}
                      >
                        <Text
                          style={
                            styles.saveButtonText
                          }
                        >
                          {saving
                            ? 'Сохранение...'
                            : 'Сохранить'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.accountSummary}>
                      <View style={styles.accountDetails}>
                        <Text style={styles.accountName}>
                          {account.name}
                        </Text>

                        <Text style={styles.accountType}>
                          {account.type === 'KASPI'
                            ? 'Kaspi'
                            : 'Наличные'}
                        </Text>
                      </View>

                      <View style={styles.accountRight}>
                        <Text style={styles.accountBalance}>
                          {Number(account.balance || 0).toLocaleString('ru-RU')} ₸
                        </Text>
                        <View
                          style={[
                            styles.statusDot,
                            !account.is_active &&
                              styles.statusDotInactive,
                          ]}
                        />
                      </View>
                    </View>

                    <View
                      style={
                        styles.accountActions
                      }
                    >
                      <Pressable
                        onPress={() =>
                          startEditing(
                            account
                          )
                        }
                        style={
                          styles.smallAction
                        }
                      >
                        <Text
                          style={
                            styles.editText
                          }
                        >
                          Изменить
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          startDelete(
                            account
                          )
                        }
                        style={
                          styles.smallAction
                        }
                      >
                        <Text
                          style={
                            styles.deleteText
                          }
                        >
                          Удалить
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={
          closeDeleteModal
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            {!showCreateReplacement ? (
              <>
                <Text
                  style={styles.modalTitle}
                >
                  Удалить счёт?
                </Text>

                <Text
                  style={styles.modalText}
                >
                  Счёт «
                  {deletingAccount?.name}
                  » будет удалён. Если у него
                  есть платежи, выберите,
                  куда перенести их данные.
                </Text>

                <Text
                  style={styles.modalSectionTitle}
                >
                  Перенести на существующий счёт
                </Text>

                {otherActiveAccounts.map(
                  (account) => (
                    <Pressable
                      key={account.id}
                      style={
                        styles.transferOption
                      }
                      onPress={() =>
                        void deleteToExistingAccount(
                          account.id
                        )
                      }
                      disabled={
                        processingDelete
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.transferName
                          }
                        >
                          {account.name}
                        </Text>

                        <Text
                          style={
                            styles.transferType
                          }
                        >
                          {account.type ===
                          'KASPI'
                            ? 'Kaspi'
                            : 'Наличные'}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.transferArrow
                        }
                      >
                        ›
                      </Text>
                    </Pressable>
                  )
                )}

                <Text
                  style={styles.modalSectionTitle}
                >
                  Или
                </Text>

                <Pressable
                  style={
                    styles.createReplacementButton
                  }
                  onPress={() =>
                    setShowCreateReplacement(
                      true
                    )
                  }
                  disabled={processingDelete}
                >
                  <Text
                    style={
                      styles.createReplacementText
                    }
                  >
                    Создать новый счёт
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.modalCancel}
                  onPress={
                    closeDeleteModal
                  }
                  disabled={processingDelete}
                >
                  <Text
                    style={
                      styles.modalCancelText
                    }
                  >
                    Отмена
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text
                  style={styles.modalTitle}
                >
                  Новый счёт
                </Text>

                <Text
                  style={styles.modalText}
                >
                  Сначала создадим новый счёт,
                  затем перенесём на него
                  платежи и удалим старый.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Название счёта"
                  value={replacementName}
                  onChangeText={
                    setReplacementName
                  }
                  editable={
                    !processingDelete
                  }
                />

                <View
                  style={styles.typeRow}
                >
                  {(
                    ['KASPI', 'CASH'] as const
                  ).map((accountType) => {
                    const selected =
                      replacementType ===
                      accountType;

                    return (
                      <Pressable
                        key={accountType}
                        style={[
                          styles.typeButton,
                          selected &&
                            styles.typeButtonSelected,
                        ]}
                        onPress={() =>
                          setReplacementType(
                            accountType
                          )
                        }
                        disabled={
                          processingDelete
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            selected &&
                              styles.typeButtonTextSelected,
                          ]}
                        >
                          {accountType ===
                          'KASPI'
                            ? 'Kaspi'
                            : 'Наличные'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[
                    styles.saveButton,
                    processingDelete &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    void createReplacementAndDelete()
                  }
                  disabled={processingDelete}
                >
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {processingDelete
                      ? 'Переносим...'
                      : 'Создать и удалить'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.modalCancel}
                  onPress={() =>
                    setShowCreateReplacement(
                      false
                    )
                  }
                  disabled={
                    processingDelete
                  }
                >
                  <Text
                    style={
                      styles.modalCancelText
                    }
                  >
                    Назад
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
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

  totalCard: {
    padding: 20,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: '#111111',
  },

  totalLabel: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 6,
  },

  totalAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
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

  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 12,
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
    justifyContent: 'center',
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
    padding: 16,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
  },

  accountDetails: {
    flex: 1,
    minWidth: 0,
  },

  accountSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },

  accountBalance: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
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

  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'flex-end',
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#248A52',
    marginRight: 12,
  },

  statusDotInactive: {
    backgroundColor: '#BBBBBB',
  },

  smallAction: {
    marginLeft: 14,
  },

  editText: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '600',
  },

  deleteText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '600',
  },

  editAccountContainer: {
    width: '100%',
  },

  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    borderRadius: 8,
    backgroundColor: '#EAEAEA',
  },

  cancelButtonText: {
    color: '#333333',
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },

  deleteModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },

  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
    marginBottom: 20,
  },

  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 8,
  },

  transferOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    marginBottom: 8,
  },

  transferName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  transferType: {
    marginTop: 3,
    fontSize: 13,
    color: '#777777',
  },

  transferArrow: {
    fontSize: 25,
    color: '#777777',
  },

  createReplacementButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    marginBottom: 8,
  },

  createReplacementText: {
    color: '#208AEF',
    fontSize: 15,
    fontWeight: '600',
  },

  modalCancel: {
    padding: 14,
    alignItems: 'center',
  },

  modalCancelText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '600',
  },
});