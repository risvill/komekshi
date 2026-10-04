import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { getOrders } from '@/services/ordersService';
import {
  createTask,
  getTasks,
  updateTaskStatus,
} from '@/services/tasksService';
import { Order } from '@/types/order';
import { Task, TaskStatus } from '@/types/task';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTIVE_ORDER_STATUSES = [
  'ACCEPTED',
  'IN_PROGRESS',
];

export default function TasksScreen() {
  const { token } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleCreate = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    const nextValue = !showCreate;

    setShowCreate(nextValue);

    Animated.timing(rotateAnim, {
      toValue: nextValue ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    if (!nextValue) {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  };

  const loadTasks = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const data = await getTasks(token);

      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить задачи'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!token) return;

    try {
      const data = await getOrders(token);

      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
      loadOrders();
    }, [token])
  );

  const activeOrders = orders.filter((order) =>
    ACTIVE_ORDER_STATUSES.includes(order.status)
  );

  const handleCreateTask = async () => {
    if (!token || saving) return;

    if (!title.trim()) {
      Alert.alert(
        'Не указано название',
        'Введите название задачи'
      );
      return;
    }

    try {
      setSaving(true);

      const newTask = await createTask(token, {
        title: title.trim(),
        deadline: deadline
          ? deadline.toISOString()
          : null,
        order_ids: selectedOrderIds,
      });

      setTasks((current) => [
        newTask,
        ...current,
      ]);

      setTitle('');
      setDeadline(null);
      setSelectedOrderIds([]);

      toggleCreate();
    } catch (error) {
      console.error('Failed to create task:', error);

      Alert.alert(
        'Ошибка',
        'Не удалось создать задачу'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    task: Task,
    status: TaskStatus
  ) => {
    if (!token || task.status === status) return;

    try {
      const updatedTask =
        await updateTaskStatus(
          token,
          task.id,
          status
        );

      setTasks((current) =>
        current.map((item) =>
          item.id === updatedTask.id
            ? updatedTask
            : item
        )
      );
    } catch (error) {
      console.error(
        'Failed to update task:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось изменить статус задачи'
      );
    }
  };

  const toggleOrderSelection = (
    orderId: string
  ) => {
    setSelectedOrderIds((current) => {
      if (current.includes(orderId)) {
        return current.filter(
          (id) => id !== orderId
        );
      }

      return [...current, orderId];
    });
  };

  const formatDeadline = (
    value: string | null
  ) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const tomorrow = new Date(today);
    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const targetDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const time = date.toLocaleTimeString(
      'ru-RU',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    if (
      targetDay.getTime() ===
      today.getTime()
    ) {
      return `Сегодня, ${time}`;
    }

    if (
      targetDay.getTime() ===
      tomorrow.getTime()
    ) {
      return `Завтра, ${time}`;
    }

    return `${date.toLocaleDateString(
      'ru-RU',
      {
        day: 'numeric',
        month: 'long',
      }
    )}, ${time}`;
  };

  const formatOrderDate = (
    value: string | null | undefined
  ) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString(
      'ru-RU',
      {
        day: 'numeric',
        month: 'short',
      }
    );
  };

  const formatOrderStatus = (
    status: string
  ) => {
    switch (status) {
      case 'ACCEPTED':
        return 'Принят';

      case 'IN_PROGRESS':
        return 'В процессе';

      default:
        return '';
    }
  };

  const getOrderAmount = (
    order: Order
  ) => {
    const amount = Number(order.total ?? 0);

    return `${amount.toLocaleString(
      'ru-RU'
    )} ₸`;
  };

  const getTaskOrdersText = (
    task: Task
  ) => {
    if (!task.orders?.length) {
      return 'Без привязанных заказов';
    }

    if (task.orders.length === 1) {
      return (
        task.orders[0].client_name ||
        'Без клиента'
      );
    }

    if (task.orders.length === 2) {
      return task.orders
        .map(
          (order) =>
            order.client_name ||
            'Без клиента'
        )
        .join(' · ');
    }

    return `${task.orders.length} связанных заказа`;
  };

  const getStatusLabel = (
    status: TaskStatus
  ) => {
    switch (status) {
      case 'TODO':
        return 'К выполнению';

      case 'IN_PROGRESS':
        return 'В работе';

      case 'DONE':
        return 'Выполнено';

      default:
        return '';
    }
  };

  const renderTask = (
    item: Task
  ) => {
    const deadlineText =
      formatDeadline(item.deadline);

    return (
      <Pressable
        key={item.id}
        style={styles.taskCard}
        onPress={() =>
          router.push({
            pathname: '/task-details',
            params: {
              id: item.id,
            },
          })
        }
      >
        <View style={styles.taskCardTop}>
          <View style={styles.taskCardMain}>
            <Text
              style={styles.taskTitle}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={styles.taskOrders}>
              {getTaskOrdersText(item)}
            </Text>

            {deadlineText && (
              <Text
                style={[
                  styles.taskDeadline,
                  item.status === 'DONE' &&
                    styles.taskDeadlineDone,
                ]}
              >
                {deadlineText}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              item.status === 'TODO' &&
                styles.statusBadgeTodo,
              item.status ===
                'IN_PROGRESS' &&
                styles.statusBadgeProgress,
              item.status === 'DONE' &&
                styles.statusBadgeDone,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                item.status === 'TODO' &&
                  styles.statusBadgeTextTodo,
                item.status ===
                  'IN_PROGRESS' &&
                  styles.statusBadgeTextProgress,
                item.status === 'DONE' &&
                  styles.statusBadgeTextDone,
              ]}
            >
              {getStatusLabel(
                item.status
              )}
            </Text>
          </View>
        </View>

        <View style={styles.statusButtons}>
          <Pressable
            style={[
              styles.statusButton,
              item.status === 'TODO' &&
                styles.statusButtonActive,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void handleStatusChange(
                item,
                'TODO'
              );
            }}
          >
            <Text
              style={[
                styles.statusButtonText,
                item.status === 'TODO' &&
                  styles.statusButtonTextActive,
              ]}
            >
              К выполнению
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statusButton,
              item.status ===
                'IN_PROGRESS' &&
                styles.statusButtonActive,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void handleStatusChange(
                item,
                'IN_PROGRESS'
              );
            }}
          >
            <Text
              style={[
                styles.statusButtonText,
                item.status ===
                  'IN_PROGRESS' &&
                  styles.statusButtonTextActive,
              ]}
            >
              В работе
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statusButton,
              item.status === 'DONE' &&
                styles.statusButtonActive,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void handleStatusChange(
                item,
                'DONE'
              );
            }}
          >
            <Text
              style={[
                styles.statusButtonText,
                item.status === 'DONE' &&
                  styles.statusButtonTextActive,
              ]}
            >
              Готово
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const todoTasks = tasks.filter(
    (task) => task.status === 'TODO'
  );

  const inProgressTasks = tasks.filter(
    (task) =>
      task.status === 'IN_PROGRESS'
  );

  const doneTasks = tasks.filter(
    (task) => task.status === 'DONE'
  );

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Задачи
        </Text>

        <Pressable
          style={[
            styles.addButton,
            showCreate &&
              styles.addButtonOpen,
          ]}
          onPress={toggleCreate}
          accessibilityRole="button"
          accessibilityLabel={
            showCreate
              ? 'Закрыть создание задачи'
              : 'Создать задачу'
          }
        >
          <Animated.Text
            style={[
              styles.addButtonText,
              {
                transform: [
                  {
                    rotate,
                  },
                ],
              },
            ]}
          >
            +
          </Animated.Text>
        </Pressable>
      </View>

      {showCreate && (
        <View style={styles.createBox}>
          <Text style={styles.createTitle}>
            Новая задача
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Что нужно сделать?"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
            editable={!saving}
            autoFocus
          />

          <Text style={styles.fieldLabel}>
            Срок
          </Text>

          <View style={styles.dateRow}>
            <Pressable
              style={styles.dateButton}
              onPress={() =>
                setShowDatePicker(true)
              }
              disabled={saving}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  !deadline &&
                    styles.dateButtonPlaceholder,
                ]}
              >
                {deadline
                  ? deadline.toLocaleDateString(
                      'ru-RU',
                      {
                        day: 'numeric',
                        month: 'long',
                      }
                    )
                  : 'Выбрать дату'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.timeButton}
              onPress={() =>
                setShowTimePicker(true)
              }
              disabled={saving}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  !deadline &&
                    styles.dateButtonPlaceholder,
                ]}
              >
                {deadline
                  ? deadline.toLocaleTimeString(
                      'ru-RU',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )
                  : 'Время'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>
            Привязать к заказам
          </Text>

          <Text style={styles.fieldHint}>
            Можно выбрать несколько активных
            заказов
          </Text>

          {activeOrders.length === 0 ? (
            <View style={styles.noOrdersBox}>
              <Text style={styles.noOrdersTitle}>
                Нет активных заказов
              </Text>

              <Text style={styles.noOrdersText}>
                Задачу можно создать без
                привязки к заказу или сначала
                принять заказ.
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {activeOrders.map((order) => {
                const selected =
                  selectedOrderIds.includes(
                    order.id
                  );

                return (
                  <Pressable
                    key={order.id}
                    style={[
                      styles.orderOption,
                      selected &&
                        styles.selectedOrder,
                    ]}
                    onPress={() =>
                      toggleOrderSelection(
                        order.id
                      )
                    }
                    disabled={saving}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selected &&
                          styles.checkboxSelected,
                      ]}
                    >
                      {selected && (
                        <Text
                          style={
                            styles.checkboxMark
                          }
                        >
                          ✓
                        </Text>
                      )}
                    </View>

                    <View
                      style={
                        styles.orderOptionContent
                      }
                    >
                      <Text
                        style={
                          styles.orderOptionTitle
                        }
                        numberOfLines={1}
                      >
                        {order.client_name ||
                          'Без клиента'}
                      </Text>

                      <Text
                        style={
                          styles.orderOptionSubtitle
                        }
                      >
                        {formatOrderDate(
                          order.order_date
                        )}
                        {' · '}
                        {getOrderAmount(order)}
                      </Text>

                      <Text
                        style={
                          styles.orderOptionStatus
                        }
                      >
                        {formatOrderStatus(
                          order.status
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            style={[
              styles.createButton,
              saving &&
                styles.createButtonDisabled,
            ]}
            onPress={() =>
              void handleCreateTask()
            }
            disabled={saving}
          >
            <Text
              style={
                styles.createButtonText
              }
            >
              {saving
                ? 'Создание...'
                : 'Создать задачу'}
            </Text>
          </Pressable>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={
            deadline ?? new Date()
          }
          mode="date"
          display="spinner"
          onChange={(event, date) => {
            setShowDatePicker(false);

            if (!date) return;

            const current =
              deadline ?? new Date();

            date.setHours(
              current.getHours(),
              current.getMinutes(),
              0,
              0
            );

            setDeadline(date);
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={
            deadline ?? new Date()
          }
          mode="time"
          display="spinner"
          onChange={(event, date) => {
            setShowTimePicker(false);

            if (!date) return;

            const current =
              deadline ?? new Date();

            current.setHours(
              date.getHours(),
              date.getMinutes(),
              0,
              0
            );

            setDeadline(
              new Date(current)
            );
          }}
        />
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>
            Загружаем задачи...
          </Text>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Задач пока нет
          </Text>

          <Text style={styles.emptyDescription}>
            Создай первую задачу, чтобы не
            держать рабочие дела в голове.
          </Text>

          {!showCreate && (
            <Pressable
              style={styles.emptyCreateButton}
              onPress={toggleCreate}
            >
              <Text
                style={
                  styles.emptyCreateButtonText
                }
              >
                Создать задачу
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View>
          {todoTasks.length > 0 && (
            <View style={styles.section}>
              <Text
                style={styles.sectionHeader}
              >
                К ВЫПОЛНЕНИЮ
              </Text>

              {todoTasks.map(renderTask)}
            </View>
          )}

          {inProgressTasks.length > 0 && (
            <View style={styles.section}>
              <Text
                style={styles.sectionHeader}
              >
                В РАБОТЕ
              </Text>

              {inProgressTasks.map(
                renderTask
              )}
            </View>
          )}

          {doneTasks.length > 0 && (
            <View style={styles.section}>
              <Text
                style={styles.sectionHeader}
              >
                ВЫПОЛНЕННЫЕ
              </Text>

              {doneTasks.map(renderTask)}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  title: {
    fontSize: 32,
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

  addButtonOpen: {
    backgroundColor: '#EAEAEA',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
  },

  createBox: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    marginBottom: 28,
  },

  createTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111111',
    marginBottom: 18,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },

  fieldHint: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 10,
  },

  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },

  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },

  timeButton: {
    width: 110,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },

  dateButtonText: {
    color: '#111111',
    fontSize: 15,
  },

  dateButtonPlaceholder: {
    color: '#999999',
  },

  ordersList: {
    marginBottom: 16,
  },

  orderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E4',
    marginBottom: 8,
  },

  selectedOrder: {
    borderColor: '#111111',
    backgroundColor: '#F1F1F1',
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#BBBBBB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  checkboxSelected: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },

  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  orderOptionContent: {
    flex: 1,
  },

  orderOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },

  orderOptionSubtitle: {
    fontSize: 13,
    color: '#777777',
    marginTop: 4,
  },

  orderOptionStatus: {
    fontSize: 12,
    color: '#555555',
    marginTop: 4,
    fontWeight: '500',
  },

  noOrdersBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E4',
    marginBottom: 16,
  },

  noOrdersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },

  noOrdersText: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 18,
  },

  createButton: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  createButtonDisabled: {
    opacity: 0.55,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  section: {
    marginBottom: 20,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  taskCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },

  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  taskCardMain: {
    flex: 1,
    paddingRight: 12,
  },

  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
    lineHeight: 22,
    marginBottom: 7,
  },

  taskOrders: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 5,
  },

  taskDeadline: {
    fontSize: 13,
    color: '#777777',
  },

  taskDeadlineDone: {
    color: '#999999',
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  statusBadgeTodo: {
    backgroundColor: '#EAEAEA',
  },

  statusBadgeProgress: {
    backgroundColor: '#E8F1FA',
  },

  statusBadgeDone: {
    backgroundColor: '#E8F3EC',
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  statusBadgeTextTodo: {
    color: '#555555',
  },

  statusBadgeTextProgress: {
    color: '#286090',
  },

  statusBadgeTextDone: {
    color: '#287044',
  },

  statusButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },

  statusButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#EAEAEA',
  },

  statusButtonActive: {
    backgroundColor: '#111111',
  },

  statusButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555555',
  },

  statusButtonTextActive: {
    color: '#FFFFFF',
  },

  loadingBox: {
    paddingTop: 30,
  },

  emptyText: {
    textAlign: 'center',
    color: '#777777',
    fontSize: 15,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 45,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },

  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#777777',
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 20,
  },

  emptyCreateButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});