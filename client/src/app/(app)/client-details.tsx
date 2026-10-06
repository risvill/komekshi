import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';

import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
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

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

import {
  ClientDetails,
  getClientDetails,
  updateClient,
} from '@/services/clientsService';

export default function ClientDetailsScreen() {
  const { token } = useAuth();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [data, setData] =
    useState<ClientDetails | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [editingClient, setEditingClient] =
    useState(false);

  const [savingClient, setSavingClient] =
    useState(false);

  const [clientName, setClientName] =
    useState('');

  const [clientPhone, setClientPhone] =
    useState('');

  const loadClient = async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }

    try {
      const result = await getClientDetails(
        token,
        id
      );

      setData(result);
    } catch (error) {
      console.error(
        'Failed to load client details:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClient();
    }, [token, id])
  );

  const openEditModal = () => {
    if (!data) {
      return;
    }

    setClientName(data.client.name);
    setClientPhone(data.client.phone || '');
    setEditingClient(true);
  };

  const closeEditModal = () => {
    if (savingClient) {
      return;
    }

    setEditingClient(false);
  };

  const saveClient = async () => {
    if (!token || !data) {
      return;
    }

    if (!clientName.trim()) {
      Alert.alert(
        'Ошибка',
        'Введите имя клиента'
      );
      return;
    }

    try {
      setSavingClient(true);

      const updatedClient =
        await updateClient(
          token,
          data.client.id,
          {
            name: clientName.trim(),
            phone:
              clientPhone.trim() ||
              undefined,
          }
        );

      setData((currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          client: updatedClient,
        };
      });

      setEditingClient(false);
    } catch (error) {
      console.error(
        'Failed to update client:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось изменить данные клиента'
      );
    } finally {
      setSavingClient(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Не удалось загрузить клиента
        </Text>
      </View>
    );
  }

  const {
    client,
    orders,
    latest_address,
  } = data;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
            hitSlop={8}
          >
            <Text style={styles.backIcon}>
              ←
            </Text>
          </Pressable>

          <Pressable
            style={styles.editButton}
            onPress={openEditModal}
          >
            <Text style={styles.editText}>
              Изменить
            </Text>
          </Pressable>
        </View>

        <View style={styles.profileHeader}>
          <Text style={styles.title}>
            {client.name}
          </Text>

          {client.phone && (
            <Text style={styles.phone}>
              {client.phone}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          КОНТАКТНАЯ ИНФОРМАЦИЯ
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>
            ПОСЛЕДНИЙ АДРЕС
          </Text>

          <Text style={styles.infoValue}>
            {latest_address ||
              'Адрес ещё не указан'}
          </Text>
        </View>

        <View style={styles.ordersHeader}>
          <Text style={styles.sectionTitle}>
            ИСТОРИЯ ЗАКАЗОВ
          </Text>

          <Text style={styles.orderCount}>
            {orders.length}
          </Text>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Заказов пока нет
            </Text>

            <Text style={styles.emptyText}>
              Когда появится заказ, он будет
              отображаться здесь
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() =>
                  router.push({
                    pathname: '/order-details',
                    params: {
                      id: order.id,
                    },
                  })
                }
              >
                <View style={styles.orderTop}>
                  <View style={styles.orderMain}>
                    <Text style={styles.orderDate}>
                      {formatOrderDate(
                        order.order_date,
                        order.created_at
                      )}
                    </Text>

                    <Text style={styles.orderId}>
                      Заказ #
                      {order.id
                        .slice(0, 8)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.orderTotal}>
                    {order.total} ₸
                  </Text>
                </View>

                <View style={styles.items}>
                  {order.items.map(
                    (item) => (
                      <Text
                        key={item.id}
                        style={styles.item}
                      >
                        {item.name}
                        {' · '}
                        {item.quantity}{' '}
                        {item.unit === 'portion'
                          ? 'порц.'
                          : 'шт.'}
                      </Text>
                    )
                  )}
                </View>

                <View style={styles.orderBottom}>
                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(
                        order.status
                      ),
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        getStatusTextStyle(
                          order.status
                        ),
                      ]}
                    >
                      {getStatusLabel(
                        order.status
                      )}
                    </Text>
                  </View>

                  <Text style={styles.arrow}>
                    ›
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={editingClient}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={closeEditModal}
          />

          <View
            pointerEvents="none"
            style={styles.bottomWhiteSpace}
          />

          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Изменить клиента
              </Text>

              <Pressable
                style={styles.closeButton}
                onPress={closeEditModal}
                disabled={savingClient}
                hitSlop={8}
              >
                <Text style={styles.closeText}>
                  ×
                </Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>
              ИМЯ
            </Text>

            <TextInput
              style={styles.input}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Имя клиента"
              placeholderTextColor="#999999"
              editable={!savingClient}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>
              ТЕЛЕФОН
            </Text>

            <TextInput
              style={styles.input}
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="+7 777 123 45 67"
              placeholderTextColor="#999999"
              keyboardType="phone-pad"
              editable={!savingClient}
            />

            <View style={styles.sheetActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={closeEditModal}
                disabled={savingClient}
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
                  savingClient &&
                    styles.buttonDisabled,
                ]}
                onPress={() =>
                  void saveClient()
                }
                disabled={savingClient}
              >
                {savingClient ? (
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function formatOrderDate(
  orderDate: string | null,
  createdAt: string
) {
  const date = new Date(
    orderDate || createdAt
  );

  return date.toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
    }
  );
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case 'DRAFT':
      return 'Черновик';

    case 'ACCEPTED':
      return 'Принят';

    case 'IN_PROGRESS':
      return 'В работе';

    case 'AWAITING_PICKUP':
      return 'Ожидает клиента';

    case 'COMPLETED':
      return 'Завершён';

    case 'CANCELLED':
      return 'Отменён';

    default:
      return status;
  }
}

function getStatusStyle(
  status: string
) {
  switch (status) {
    case 'DRAFT':
      return {
        backgroundColor: '#EAEAEA',
      };

    case 'ACCEPTED':
    case 'IN_PROGRESS':
      return {
        backgroundColor: '#E8F1FA',
      };

    case 'AWAITING_PICKUP':
      return {
        backgroundColor: '#F4EFE2',
      };

    case 'COMPLETED':
      return {
        backgroundColor: '#E8F3EC',
      };

    case 'CANCELLED':
      return {
        backgroundColor: '#F3E8E8',
      };

    default:
      return {
        backgroundColor: '#EAEAEA',
      };
  }
}

function getStatusTextStyle(
  status: string
) {
  switch (status) {
    case 'DRAFT':
      return {
        color: '#555555',
      };

    case 'ACCEPTED':
    case 'IN_PROGRESS':
      return {
        color: '#286090',
      };

    case 'AWAITING_PICKUP':
      return {
        color: '#806A2F',
      };

    case 'COMPLETED':
      return {
        color: '#287044',
      };

    case 'CANCELLED':
      return {
        color: '#A33A3A',
      };

    default:
      return {
        color: '#555555',
      };
  }
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

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },

  errorText: {
    fontSize: 15,
    color: '#666666',
  },

  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  backIcon: {
    fontSize: 27,
    lineHeight: 32,
    color: '#111111',
    fontWeight: '400',
  },

  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },

  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#208AEF',
  },

  profileHeader: {
    marginTop: 10,
    marginBottom: 30,
  },

  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: '#111111',
  },

  phone: {
    marginTop: 7,
    fontSize: 15,
    color: '#777777',
  },

  sectionTitle: {
    marginLeft: 4,
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: '#888888',
    letterSpacing: 0.6,
  },

  infoCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 18,
    marginBottom: 30,
  },

  infoLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 0.6,
  },

  infoValue: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 21,
    color: '#222222',
  },

  ordersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  orderCount: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },

  ordersList: {
    marginTop: 2,
  },

  orderCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },

  orderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  orderMain: {
    flex: 1,
    paddingRight: 12,
  },

  orderDate: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: '#111111',
  },

  orderId: {
    marginTop: 4,
    fontSize: 12,
    color: '#888888',
  },

  orderTotal: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#111111',
  },

  items: {
    marginTop: 12,
  },

  item: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 19,
    color: '#666666',
  },

  orderBottom: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },

  arrow: {
    fontSize: 25,
    lineHeight: 28,
    color: '#777777',
  },

  emptyState: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#111111',
  },

  emptyText: {
    marginTop: 7,
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#777777',
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  bottomWhiteSpace: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 50,
    backgroundColor: '#FFFFFF',
  },

  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginBottom: 30,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D5D5',
    marginBottom: 20,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111111',
  },

  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
    color: '#555555',
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
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111111',
    marginBottom: 16,
  },

  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },

  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});