import { useCallback, useState } from 'react';

import { router, useFocusEffect } from 'expo-router';

import DateTimePicker from '@react-native-community/datetimepicker';

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

import { useAuth } from '@/context/AuthContext';

import { SafeAreaView } from 'react-native-safe-area-context';

import { getOrders } from '@/services/ordersService';

import { createTask } from '@/services/tasksService';

import { Order } from '@/types/order';

const ACTIVE_ORDER_STATUSES = [
  'ACCEPTED',
  'IN_PROGRESS',
];

export default function NewTaskScreen() {
  const { token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedOrderIds, setSelectedOrderIds] =
    useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');

  const [deadline, setDeadline] =
    useState<Date | null>(new Date());

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  const loadOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getOrders(token);

      setOrders(data);
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить заказы'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const activeOrders = orders.filter((order) =>
    ACTIVE_ORDER_STATUSES.includes(order.status)
  );

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter(
            (id) => id !== orderId
          )
        : [...current, orderId]
    );
  };

  const handleCreateTask = async () => {
    if (!token) {
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        'Введите название',
        'Укажите название задачи.'
      );

      return;
    }

    try {
      setSaving(true);

      await createTask(token, {
        title: title.trim(),

        deadline: deadline
          ? deadline.toISOString()
          : null,

        order_ids: selectedOrderIds,
      });

      router.replace('/tasks');
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Ошибка',
        'Не удалось создать задачу'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatOrderDay = (
    dateString?: string | null
  ) => {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);

    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
    });
  };

  const formatOrderMonth = (
    dateString?: string | null
  ) => {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);

    return date
      .toLocaleDateString('ru-RU', {
        month: 'short',
      })
      .replace('.', '')
      .toUpperCase();
  };

  const formatOrderTime = (
    timeString?: string | null
  ) => {
    if (!timeString) {
      return '';
    }

    const match = timeString.match(
      /^(\d{1,2}):(\d{2})/
    );

    if (match) {
      const hour = match[1].padStart(2, '0');
      const minute = match[2];

      return `${hour}:${minute}`;
    }

    return timeString;
  };

  const formatAmount = (
    amount?: string | number | null
  ) => {
    if (amount == null || amount === '') {
      return '';
    }

    return `${Number(amount).toLocaleString(
      'ru-RU'
    )} ₸`;
  };

  const formatStatus = (status: string) => {
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return '#777777';

      case 'ACCEPTED':
      case 'IN_PROGRESS':
        return '#286090';

      case 'AWAITING_PICKUP':
        return '#806A2F';

      case 'COMPLETED':
        return '#287044';

      case 'CANCELLED':
        return '#A33A3A';

      default:
        return '#777777';
    }
  };

  const handleDateChange = (
    event: any,
    selectedDate?: Date
  ) => {
    setShowDatePicker(false);

    if (!selectedDate) {
      return;
    }

    const current = deadline || new Date();

    const nextDate = new Date(selectedDate);

    nextDate.setHours(
      current.getHours(),
      current.getMinutes(),
      0,
      0
    );

    setDeadline(nextDate);
  };

  const handleTimeChange = (
    event: any,
    selectedTime?: Date
  ) => {
    setShowTimePicker(false);

    if (!selectedTime) {
      return;
    }

    const current = deadline || new Date();

    const nextDate = new Date(current);

    nextDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );

    setDeadline(nextDate);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/tasks')}
          hitSlop={8}
          style={styles.backButtonContainer}
        >
          <Text style={styles.backButton}>
            ←
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Новая задача
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionLabel}>
          НАЗВАНИЕ ЗАДАЧИ
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Например, подготовить заказ"
            placeholderTextColor="#999999"
          />
        </View>

        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeColumn}>
            <Text style={styles.dateTimeLabel}>
              ДАТА
            </Text>

            <Pressable
              style={styles.dateTimeButton}
              onPress={() =>
                setShowDatePicker(true)
              }
            >
              <Text
                style={[
                  styles.dateTimeText,
                  !deadline &&
                    styles.placeholderText,
                ]}
              >
                {deadline
                  ? formatDate(deadline)
                  : 'Выберите дату'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.dateTimeColumn}>
            <Text style={styles.dateTimeLabel}>
              ВРЕМЯ
            </Text>

            <Pressable
              style={styles.dateTimeButton}
              onPress={() =>
                setShowTimePicker(true)
              }
            >
              <Text
                style={[
                  styles.dateTimeText,
                  !deadline &&
                    styles.placeholderText,
                ]}
              >
                {deadline
                  ? formatTime(deadline)
                  : 'Выберите время'}
              </Text>
            </Pressable>
          </View>
        </View>

        {deadline && (
          <Pressable
            style={styles.clearDeadline}
            onPress={() => setDeadline(null)}
          >
            <Text style={styles.clearDeadlineText}>
              Убрать срок
            </Text>
          </Pressable>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={
              deadline || new Date()
            }
            mode="date"
            display="spinner"
            onChange={handleDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={
              deadline || new Date()
            }
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
          />
        )}

        <Text
          style={[
            styles.sectionLabel,
            styles.ordersSectionLabel,
          ]}
        >
          ПРИВЯЗАТЬ К ЗАКАЗАМ
        </Text>

        <View style={styles.ordersContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator />
            </View>
          ) : activeOrders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Text
                style={styles.emptyOrdersTitle}
              >
                Нет активных заказов
              </Text>

              <Text
                style={styles.emptyOrdersText}
              >
                Здесь появятся заказы, которые
                можно связать с задачей.
              </Text>
            </View>
          ) : (
            activeOrders.map((order) => {
              const selected =
                selectedOrderIds.includes(
                  order.id
                );

              const statusColor =
                getStatusColor(order.status);

              const formattedDay =
                formatOrderDay(
                  order.order_date
                );

              const formattedMonth =
                formatOrderMonth(
                  order.order_date
                );

              const formattedTime =
                formatOrderTime(
                  order.order_time
                );

              return (
                <Pressable
                  key={order.id}
                  onPress={() =>
                    toggleOrder(order.id)
                  }
                  style={[
                    styles.orderCard,
                    selected &&
                      styles.orderCardSelected,
                  ]}
                >
                  <View style={styles.dateBlock}>
                    <Text style={styles.orderDay}>
                      {formattedDay || '—'}
                    </Text>

                    <Text
                      style={styles.orderMonth}
                    >
                      {formattedMonth || '—'}
                    </Text>

                  </View>

                  <View
                    style={styles.verticalDivider}
                  />

                  <View
                    style={styles.orderContent}
                  >
                    <View
                      style={
                        styles.orderTopRow
                      }
                    >
                      <Text
                        style={
                          styles.orderClient
                        }
                        numberOfLines={1}
                      >
                        {order.client_name ||
                          'Без клиента'}
                      </Text>

                      <View
                        style={[
                          styles.selectionBox,
                          selected &&
                            styles.selectionBoxSelected,
                        ]}
                      >
                        {selected && (
                          <Text
                            style={
                              styles.selectionCheck
                            }
                          >
                            ✓
                          </Text>
                        )}
                      </View>
                    </View>

                    <View
                      style={
                        styles.statusRow
                      }
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              statusColor,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              statusColor,
                          },
                        ]}
                      >
                        {formatStatus(
                          order.status
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.orderBottomRow
                      }
                    >
                      {formattedTime ? (
                        <Text
                          style={
                            styles.orderTimeBottom
                          }
                        >
                          Заказ на{' '}
                          {formattedTime}
                        </Text>
                      ) : (
                        <View />
                      )}

                      {order.total != null && (
                        <Text
                          style={
                            styles.orderAmount
                          }
                        >
                          {formatAmount(
                            order.total
                          )}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <Pressable
          style={[
            styles.createButton,
            saving &&
              styles.createButtonDisabled,
          ]}
          onPress={handleCreateTask}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={styles.createButtonText}
            >
              Создать задачу
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text
            style={styles.cancelButtonText}
          >
            Отмена
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  contentContainer: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButtonContainer: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backButton: {
    fontSize: 20,
    lineHeight: 30,
    color: '#111111',
  },

  headerSpacer: {
    width: 32,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },

  form: {
    marginTop: 28,
  },

  sectionLabel: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#777777',
  },

  inputContainer: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
  },

  input: {
    minHeight: 52,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },

  dateTimeColumn: {
    marginTop: 15,
    flex: 1,
  },

  dateTimeLabel: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#999999',
  },

  dateTimeButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  dateTimeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
  },

  placeholderText: {
    color: '#999999',
  },

  clearDeadline: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },

  clearDeadlineText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A33A3A',
  },

  ordersSectionLabel: {
    marginTop: 28,
    marginBottom: 15,
  },

  ordersContainer: {
    marginBottom: 5,
  },

  loadingContainer: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
  },

  emptyOrders: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
  },

  emptyOrdersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 5,
  },

  emptyOrdersText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#888888',
  },

  orderCard: {
  minHeight: 80,
  marginBottom: 10,
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderRadius: 18,
  backgroundColor: '#F7F7F7',
  borderWidth: 1,
  borderColor: '#F7F7F7',
  flexDirection: 'row',
},

orderCardSelected: {
  backgroundColor: '#F1F1F1',
  borderColor: '#E2E2E2',
},
  dateBlock: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderDay: {
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: '#111111',
  },

  orderMonth: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#888888',
  },

  orderTime: {
    marginTop: 9,
    fontSize: 11,
    fontWeight: '600',
    color: '#555555',
  },

  verticalDivider: {
    width: 1,
    marginVertical: 4,
    marginHorizontal: 15,
    backgroundColor: '#DEDEDE',
  },

  orderContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  orderClient: {
    flex: 1,
    paddingRight: 10,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
    color: '#111111',
  },

  selectionBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C8C8C8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectionBoxSelected: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },

  selectionCheck: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '700',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  orderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  orderTimeBottom: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999999',
  },

  orderAmount: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: '#111111',
  },

  createButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
});
