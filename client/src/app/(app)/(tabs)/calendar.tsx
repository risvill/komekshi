import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { getOrders } from '@/services/ordersService';
import {
  getTasks,
  updateTaskStatus,
} from '@/services/tasksService';
import { Order } from '@/types/order';
import { Task, TaskStatus } from '@/types/task';

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthName(date: Date) {
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function getOrderStatusLabel(status: string) {
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

function getStatusLabel(status: TaskStatus) {
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
}

function getTaskDate(task: Task) {
  if (!task.deadline) {
    return null;
  }

  return formatDate(new Date(task.deadline));
}

function getOrderDate(order: Order) {
  if (!order.order_date) {
    return null;
  }

  return formatDate(new Date(order.order_date));
}

function getDaysInMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
}

function getFirstDayOfMonth(date: Date) {
  const day = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  ).getDay();

  return day === 0 ? 6 : day - 1;
}

function formatOrderTime(
  time: string | null | undefined
) {
  if (!time) {
    return {
      hours: '—',
      minutes: '',
    };
  }

  const parts = time.slice(0, 5).split(':');

  return {
    hours: parts[0] || '—',
    minutes: parts[1] || '',
  };
}

function formatTaskDeadline(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTaskOrdersText(task: Task) {
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
}

export default function Calendar() {
  const { token } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(
    new Date()
  );

  const [selectedDate, setSelectedDate] = useState(
    formatDate(new Date())
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const today = formatDate(new Date());

  const loadCalendar = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [ordersData, tasksData] = await Promise.all([
        getOrders(token),
        getTasks(token),
      ]);

      setOrders(ordersData);
      setTasks(tasksData);
    } catch (error) {
      console.error(
        'Failed to load calendar:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [token])
  );

  const handleStatusChange = async (
    task: Task,
    status: TaskStatus
  ) => {
    if (!token || task.status === status) {
      return;
    }

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
    }
  };

  const goToPreviousMonth = () => {
    const previous = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );

    setCurrentMonth(previous);
  };

  const goToNextMonth = () => {
    const next = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );

    setCurrentMonth(next);
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const selectedOrders = orders.filter(
    (order) =>
      getOrderDate(order) === selectedDate
  );

  const selectedTasks = tasks.filter(
    (task) =>
      getTaskDate(task) === selectedDate
  );

  const getOrderCount = (date: string) => {
    return orders.filter(
      (order) =>
        getOrderDate(order) === date
    ).length;
  };

  const getSelectedDateLabel = () => {
    return new Date(
      selectedDate + 'T00:00:00'
    ).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Календарь
        </Text>
      </View>

      <View style={styles.monthHeader}>
        <Pressable
          style={styles.monthButton}
          onPress={goToPreviousMonth}
        >
          <Text style={styles.monthButtonText}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.monthTitle}>
          {getMonthName(currentMonth)}
        </Text>

        <Pressable
          style={styles.monthButton}
          onPress={goToNextMonth}
        >
          <Text style={styles.monthButtonText}>
            ›
          </Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {[
          'Пн',
          'Вт',
          'Ср',
          'Чт',
          'Пт',
          'Сб',
          'Вс',
        ].map((day) => (
          <Text
            key={day}
            style={styles.weekDay}
          >
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return (
              <View
                key={`empty-${index}`}
                style={styles.dayCell}
              />
            );
          }

          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          );

          const dateString = formatDate(date);

          const isToday =
            dateString === today;

          const isSelected =
            dateString === selectedDate;

          const orderCount =
            getOrderCount(dateString);

          const dotsCount = Math.min(
            orderCount,
            5
          );

          return (
            <Pressable
              key={dateString}
              style={styles.dayCell}
              onPress={() =>
                setSelectedDate(dateString)
              }
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday &&
                    styles.todayCircle,
                  isSelected &&
                    styles.selectedDayCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday &&
                      styles.todayText,
                    isSelected &&
                      styles.selectedDayText,
                  ]}
                >
                  {day}
                </Text>
              </View>

              {dotsCount > 0 && (
                <View style={styles.dotRow}>
                  {Array.from({
                    length: dotsCount,
                  }).map(
                    (_, dotIndex) => (
                      <View
                        key={`${dateString}-dot-${dotIndex}`}
                        style={styles.orderDot}
                      />
                    )
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectedSection}>
        <Text style={styles.selectedDate}>
          {getSelectedDateLabel()}
        </Text>

        {/* ЗАКАЗЫ */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Заказы
          </Text>

          {selectedOrders.length > 0 && (
            <Text style={styles.sectionCount}>
              {selectedOrders.length}
            </Text>
          )}
        </View>

        {selectedOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              На этот день заказов нет
            </Text>
          </View>
        ) : (
          selectedOrders.map((order) => {
            const time =
              formatOrderTime(
                order.order_time
              );

            return (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() =>
                  router.push({
                    pathname:
                      '/order-details',
                    params: {
                      id: order.id,
                    },
                  })
                }
              >
                <View
                  style={styles.orderTimeBlock}
                >
                  <Text
                    style={styles.orderHour}
                  >
                    {time.hours}
                  </Text>

                  {time.minutes && (
                    <Text
                      style={
                        styles.orderMinutes
                      }
                    >
                      {time.minutes}
                    </Text>
                  )}
                </View>

                <View
                  style={
                    styles.orderDivider
                  }
                />

                <View
                  style={styles.orderInfo}
                >
                  <Text
                    style={styles.orderClient}
                    numberOfLines={1}
                  >
                    {order.client_name ||
                      'Без клиента'}
                  </Text>

                  <View
                    style={styles.statusRow}
                  >
                    <View
                      style={
                        styles.statusDot
                      }
                    />

                    <Text
                      style={
                        styles.orderStatus
                      }
                    >
                      {getOrderStatusLabel(
                        order.status
                      )}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.orderPrice}
                >
                  {order.total} ₸
                </Text>
              </Pressable>
            );
          })
        )}

        {/* ЗАДАЧИ */}

        <View
          style={styles.sectionHeaderTasks}
        >
          <Text style={styles.sectionTitle}>
            Задачи
          </Text>

          {selectedTasks.length > 0 && (
            <Text style={styles.sectionCount}>
              {selectedTasks.length}
            </Text>
          )}
        </View>

        {selectedTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              На этот день задач нет
            </Text>
          </View>
        ) : (
          selectedTasks.map((task) => {
            const deadlineText =
              formatTaskDeadline(
                task.deadline
              );

            return (
              <Pressable
                key={task.id}
                style={styles.taskCard}
                onPress={() =>
                  router.push({
                    pathname:
                      '/task-details',
                    params: {
                      id: task.id,
                    },
                  })
                }
              >
                <View
                  style={styles.taskCardTop}
                >
                  <View
                    style={
                      styles.taskCardMain
                    }
                  >
                    <Text
                      style={styles.taskTitle}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>

                    <Text
                      style={
                        styles.taskOrders
                      }
                    >
                      {getTaskOrdersText(
                        task
                      )}
                    </Text>

                    {deadlineText && (
                      <Text
                        style={[
                          styles.taskDeadline,
                          task.status ===
                            'DONE' &&
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
                      task.status ===
                        'TODO' &&
                        styles.statusBadgeTodo,
                      task.status ===
                        'IN_PROGRESS' &&
                        styles.statusBadgeProgress,
                      task.status ===
                        'DONE' &&
                        styles.statusBadgeDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        task.status ===
                          'TODO' &&
                          styles.statusBadgeTextTodo,
                        task.status ===
                          'IN_PROGRESS' &&
                          styles.statusBadgeTextProgress,
                        task.status ===
                          'DONE' &&
                          styles.statusBadgeTextDone,
                      ]}
                    >
                      {getStatusLabel(
                        task.status
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.statusButtons}
                >
                  <Pressable
                    style={[
                      styles.statusButton,
                      task.status ===
                        'TODO' &&
                        styles.statusButtonActive,
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();

                      void handleStatusChange(
                        task,
                        'TODO'
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        task.status ===
                          'TODO' &&
                          styles.statusButtonTextActive,
                      ]}
                    >
                      К выполнению
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.statusButton,
                      task.status ===
                        'IN_PROGRESS' &&
                        styles.statusButtonActive,
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();

                      void handleStatusChange(
                        task,
                        'IN_PROGRESS'
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        task.status ===
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
                      task.status ===
                        'DONE' &&
                        styles.statusButtonActive,
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();

                      void handleStatusChange(
                        task,
                        'DONE'
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        task.status ===
                          'DONE' &&
                          styles.statusButtonTextActive,
                      ]}
                    >
                      Готово
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
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
    paddingBottom: 50,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#111111',
  },

  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthButtonText: {
    fontSize: 28,
    lineHeight: 30,
    color: '#111111',
    fontWeight: '400',
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  weekDay: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
    position: 'relative',
  },

  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayText: {
    fontSize: 15,
    color: '#111111',
    fontWeight: '500',
  },

  todayCircle: {
    backgroundColor: '#000000',
  },

  todayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  selectedDayCircle: {
    backgroundColor: '#B83A3A',
  },

  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  dotRow: {
    height: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 2,
  },

  orderDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9B9B9B',
  },

  selectedSection: {
    marginTop: 30,
  },

  selectedDate: {
    fontSize: 21,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: '#111111',
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },

  sectionHeaderTasks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    gap: 7,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#8A8A8A',
  },

  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
  },

  /*
   * КАРТОЧКА ЗАКАЗА
   *
   * Вид:
   *
   * 17 | Имя клиента
   * 45 | ● В работе              12 000 ₸
   */

  orderCard: {
    minHeight: 76,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  orderTimeBlock: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderHour: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    color: '#111111',
  },

  orderMinutes: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: '#777777',
  },

  orderDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#D8D8D8',
    marginHorizontal: 12,
  },

  orderInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8A8A8A',
    marginRight: 7,
  },

  orderStatus: {
    fontSize: 13,
    color: '#777777',
  },

  orderPrice: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
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

  emptyCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
  },

  emptyText: {
    fontSize: 14,
    color: '#999999',
  },
});