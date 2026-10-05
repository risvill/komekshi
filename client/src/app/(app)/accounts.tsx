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
import { router, useFocusEffect } from 'expo-router';

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

  // CREATE
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('KASPI');

  // EDIT
  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null);

  const [editingName, setEditingName] = useState('');

  const [editingType, setEditingType] =
    useState<AccountType>('KASPI');

  const [saving, setSaving] = useState(false);

  // DELETE
  const [deletingAccount, setDeletingAccount] =
    useState<Account | null>(null);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [showCreateReplacement, setShowCreateReplacement] =
    useState(false);

  const [replacementName, setReplacementName] = useState('');

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

  // -----------------------------
  // CREATE ACCOUNT
  // -----------------------------

  const openCreateModal = () => {
    setName('');
    setType('KASPI');
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    if (saving) return;

    setShowCreate(false);
    setName('');
    setType('KASPI');
  };

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

      setShowCreate(false);
      setName('');
      setType('KASPI');
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

  // -----------------------------
  // EDIT ACCOUNT
  // -----------------------------

  const openEditModal = (
    account: Account
  ) => {
    setEditingAccount(account);
    setEditingName(account.name);
    setEditingType(account.type);
  };

  const closeEditModal = () => {
    if (saving) return;

    setEditingAccount(null);
    setEditingName('');
    setEditingType('KASPI');
  };

  const handleUpdate = async () => {
    if (!token || !editingAccount) {
      return;
    }

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
        editingAccount.id,
        {
          name: editingName.trim(),
          type: editingType,
        }
      );

      setAccounts((current) =>
        current.map((account) =>
          account.id === editingAccount.id
            ? updated
            : account
        )
      );

      setEditingAccount(null);
      setEditingName('');
      setEditingType('KASPI');
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

  // -----------------------------
  // DELETE ACCOUNT
  // -----------------------------

  const startDelete = (
    account: Account
  ) => {
    const otherAccounts =
      accounts.filter(
        (item) =>
          item.id !== account.id
      );

    if (otherAccounts.length === 0) {
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
              openCreateModal();
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

  const otherAccounts =
    accounts.filter(
      (account) =>
        account.id !==
        deletingAccount?.id
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.replace('/more')
            }
            hitSlop={8}
            style={styles.backButtonContainer}
          >
            <Text style={styles.backButton}>
              ←
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Счета
          </Text>

          <Pressable
            style={styles.addButton}
            onPress={openCreateModal}
            accessibilityRole="button"
            accessibilityLabel="Добавить счёт"
          >
            <Text style={styles.addButtonText}>
              +
            </Text>
          </Pressable>
        </View>

        {/* TOTAL */}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            Всего на счетах
          </Text>

          <Text style={styles.totalAmount}>
            {totalBalance.toLocaleString(
              'ru-RU'
            )}{' '}
            ₸
          </Text>
        </View>

        {/* ACCOUNTS */}

        <Text style={styles.sectionTitle}>
          МОИ СЧЕТА
        </Text>

        {loading ? (
          <ActivityIndicator
            style={styles.loader}
          />
        ) : accounts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Счетов пока нет
            </Text>

            <Text style={styles.emptyText}>
              Добавьте первый счёт, чтобы
              учитывать поступления и оплаты.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={openCreateModal}
            >
              <Text
                style={styles.emptyButtonText}
              >
                Добавить счёт
              </Text>
            </Pressable>
          </View>
        ) : (
          accounts.map((account) => (
            <View
              key={account.id}
              style={styles.accountRow}
            >
              <View
                style={
                  styles.accountSummary
                }
              >
                <View
                  style={
                    styles.accountDetails
                  }
                >
                  <Text
                    style={
                      styles.accountName
                    }
                  >
                    {account.name}
                  </Text>

                  <Text
                    style={
                      styles.accountType
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
                    styles.accountBalance
                  }
                >
                  {Number(
                    account.balance || 0
                  ).toLocaleString(
                    'ru-RU'
                  )}{' '}
                  ₸
                </Text>
              </View>

              <View
                style={
                  styles.accountActions
                }
              >
                <Pressable
                  onPress={() =>
                    openEditModal(account)
                  }
                  style={
                    styles.smallAction
                  }
                >
                  <Text
                    style={styles.editText}
                  >
                    Изменить
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    startDelete(account)
                  }
                  style={
                    styles.smallAction
                  }
                >
                  <Text
                    style={styles.deleteText}
                  >
                    Удалить
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ================================= */}
      {/* CREATE ACCOUNT BOTTOM SHEET       */}
      {/* ================================= */}

      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={
          closeCreateModal
        }
      >
        <View
          style={
            styles.bottomSheetOverlay
          }
        >
          <Pressable
            style={
              styles.bottomSheetBackdrop
            }
            onPress={closeCreateModal}
            disabled={saving}
          />

          <View
            style={styles.bottomSheet}
          >
            <View
              style={styles.sheetHandle}
            />

            <View
              style={styles.sheetHeader}
            >
              <View>
                <Text
                  style={styles.sheetTitle}
                >
                  Новый счёт
                </Text>

                <Text
                  style={styles.sheetSubtitle}
                >
                  Добавьте счёт для учёта оплат
                </Text>
              </View>

              <Pressable
                style={
                  styles.sheetCloseButton
                }
                onPress={closeCreateModal}
                disabled={saving}
              >
                <Text
                  style={
                    styles.sheetCloseText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <Text
              style={styles.inputLabel}
            >
              НАЗВАНИЕ СЧЁТА
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Например, Kaspi Business"
              placeholderTextColor="#999999"
              value={name}
              onChangeText={setName}
              editable={!saving}
              autoCapitalize="sentences"
              autoFocus
            />

            <Text
              style={[
                styles.inputLabel,
                styles.typeLabel,
              ]}
            >
              ТИП СЧЁТА
            </Text>

            <View
              style={styles.typeRow}
            >
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
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Создать счёт
                </Text>
              )}
            </Pressable>

            <Pressable
              style={
                styles.sheetCancelButton
              }
              onPress={closeCreateModal}
              disabled={saving}
            >
              <Text
                style={
                  styles.sheetCancelText
                }
              >
                Отмена
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================================= */}
      {/* EDIT ACCOUNT BOTTOM SHEET         */}
      {/* ================================= */}

      <Modal
        visible={editingAccount !== null}
        transparent
        animationType="slide"
        onRequestClose={
          closeEditModal
        }
      >
        <View
          style={
            styles.bottomSheetOverlay
          }
        >
          <Pressable
            style={
              styles.bottomSheetBackdrop
            }
            onPress={closeEditModal}
            disabled={saving}
          />

          <View
            style={styles.bottomSheet}
          >
            <View
              style={styles.sheetHandle}
            />

            <View
              style={styles.sheetHeader}
            >
              <View>
                <Text
                  style={styles.sheetTitle}
                >
                  Изменить счёт
                </Text>

                <Text
                  style={styles.sheetSubtitle}
                >
                  Измените название или тип счёта
                </Text>
              </View>

              <Pressable
                style={
                  styles.sheetCloseButton
                }
                onPress={closeEditModal}
                disabled={saving}
              >
                <Text
                  style={
                    styles.sheetCloseText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <Text
              style={styles.inputLabel}
            >
              НАЗВАНИЕ СЧЁТА
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Название счёта"
              placeholderTextColor="#999999"
              value={editingName}
              onChangeText={setEditingName}
              editable={!saving}
              autoCapitalize="sentences"
              autoFocus
            />

            <Text
              style={[
                styles.inputLabel,
                styles.typeLabel,
              ]}
            >
              ТИП СЧЁТА
            </Text>

            <View
              style={styles.typeRow}
            >
              {(
                ['KASPI', 'CASH'] as const
              ).map((accountType) => {
                const selected =
                  editingType ===
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
              })}
            </View>

            <Pressable
              style={[
                styles.saveButton,
                saving &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                void handleUpdate()
              }
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Сохранить изменения
                </Text>
              )}
            </Pressable>

            <Pressable
              style={
                styles.sheetCancelButton
              }
              onPress={closeEditModal}
              disabled={saving}
            >
              <Text
                style={
                  styles.sheetCancelText
                }
              >
                Отмена
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================================= */}
      {/* DELETE ACCOUNT MODAL              */}
      {/* ================================= */}

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={
          closeDeleteModal
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={styles.deleteModal}
          >
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
                  style={
                    styles.modalSectionTitle
                  }
                >
                  Перенести на существующий
                  счёт
                </Text>

                {otherAccounts.map(
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
                  style={
                    styles.modalSectionTitle
                  }
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
                  placeholderTextColor="#999999"
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
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    position: 'relative',
  },

  backButtonContainer: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backButton: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '300',
    color: '#111111',
  },

  headerTitle: {
    position: 'absolute',
    left: 44,
    right: 44,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 26,
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
    fontWeight: '300',
  },

  totalCard: {
    padding: 20,
    marginBottom: 30,
    borderRadius: 16,
    backgroundColor: '#111111',
  },

  totalLabel: {
    color: '#AAAAAA',
    fontSize: 13,
    marginBottom: 6,
  },

  totalAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
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

  loader: {
    marginTop: 36,
  },

  emptyCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  emptyTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#777777',
    marginBottom: 18,
  },

  emptyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#111111',
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  accountRow: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  accountSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountDetails: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  accountName: {
    color: '#111111',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },

  accountType: {
    marginTop: 4,
    color: '#777777',
    fontSize: 14,
    lineHeight: 19,
  },

  accountBalance: {
    color: '#111111',
    fontSize: 19,
    lineHeight: 21,
    fontWeight: '700',
  },

  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 14,
  },

  smallAction: {
    marginLeft: 18,
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

  inputLabel: {
    marginBottom: 7,
    marginLeft: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.7,
  },

  typeLabel: {
    marginTop: 15,
  },

  input: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#111111',
  },

  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 18,
  },

  typeButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EAEAEA',
  },

  typeButtonSelected: {
    backgroundColor: '#A33A3A',
  },

  typeButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
  },

  typeButtonTextSelected: {
    color: '#FFFFFF',
  },

  saveButton: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#111111',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.55,
  },

  /* BOTTOM SHEETS */

  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  bottomSheetBackdrop: {
    flex: 1,
  },

  bottomSheet: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: 22,
    borderRadius: 2,
    backgroundColor: '#D5D5D5',
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  sheetTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#111111',
  },

  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#777777',
  },

  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEAEA',
  },

  sheetCloseText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '300',
    color: '#555555',
  },

  sheetCancelButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  sheetCancelText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },

  /* DELETE MODAL */

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
    lineHeight: 27,
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
    lineHeight: 18,
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
    backgroundColor: '#111111',
    alignItems: 'center',
    marginBottom: 8,
  },

  createReplacementText: {
    color: '#FFFFFF',
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