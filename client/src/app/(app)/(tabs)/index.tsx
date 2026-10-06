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

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return formatDateKey(new Date());
}

function isToday(
  dateString: string | null | undefined,
  today: string
) {
  if (!dateString) {
    return false;
  }

  const dateKey =
    /^\d{4}-\d{2}-\d{2}$/.test(dateString)
      ? dateString
      : formatDateKey(new Date(dateString));

  return dateKey === today;
}

function getDateLabel() {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(
  time: string | null | undefined
) {
  if (!time) {
    return '';
  }

  const match = time.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return time;
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function formatDeadline(deadline: string) {
  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
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

function getTaskStatusLabel(status: TaskStatus) {
  switch (status) {
    case 'TODO':
      return 'К выполнению';

    case 'IN_PROGRESS':
      return 'В работе';

    case 'DONE':
      return 'Выполнено';

    default:
      return status;
  }
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

export default function Today() {
  const { token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [visibleOrdersCount, setVisibleOrdersCount] =
    useState(2);

  const [visibleTasksCount, setVisibleTasksCount] =
    useState(2);

  const [loading, setLoading] = useState(true);

  const today = getTodayDate();

  const loadToday = async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);

      const [ordersData, tasksData] =
        await Promise.all([
          getOrders(token),
          getTasks(token),
        ]);

      const todayOrders = ordersData.filter(
        (order) =>
          isToday(order.order_date, today)
      );

      const todayTasks = tasksData.filter(
        (task) => {
          if (!task.deadline) {
            return false;
          }

          const taskDate = new Date(
            task.deadline
          );

          return (
            formatDateKey(taskDate) === today
          );
        }
      );

      setOrders(todayOrders);
      setTasks(todayTasks);

      setVisibleOrdersCount(2);
      setVisibleTasksCount(2);
    } catch (error) {
      console.error(
        'Failed to load today:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [token])
  );

  const handleTaskStatusChange = async (
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
        'Failed to update task status:',
        error
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const visibleOrders = orders.slice(
    0,
    visibleOrdersCount
  );

  const visibleTasks = tasks.slice(
    0,
    visibleTasksCount
  );

  const canExpandOrders =
    orders.length > visibleOrdersCount;

  const canExpandTasks =
    tasks.length > visibleTasksCount;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Сегодня
      </Text>

      <Text style={styles.date}>
        {getDateLabel()}
      </Text>

      {/* ЗАКАЗЫ */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Заказы
          </Text>

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/orders',
                params: { from: 'today' },
              })
            }
            hitSlop={8}
          >
            <Text style={styles.linkText}>
              Все →
            </Text>
          </Pressable>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Нет заказов
            </Text>

            <Text style={styles.emptyText}>
              На сегодня заказов пока нет
            </Text>
          </View>
        ) : (
          <>
            {visibleOrders.map(
              (order, index) => {
                const visibleItems =
                  order.items.slice(0, 2);

                const hasMoreItems =
                  order.items.length > 2;

                const remainingItems =
                  order.items.length - 2;

                return (
                  <View
                    key={order.id}
                    style={[
                      styles.cardContainer,
                      index < visibleOrders.length - 1 &&
                        styles.cardContainerGap,
                    ]}
                  >
                  <Pressable
                    style={styles.orderItem}
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
                      style={
                        styles.orderTop
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

                      <Text
                        style={[
                          styles.orderStatus,
                          getOrderStatusStyle(
                            order.status
                          ),
                        ]}
                      >
                        {getOrderStatusLabel(
                          order.status
                        )}
                      </Text>
                    </View>

                    {visibleItems.length >
                      0 && (
                      <View
                        style={
                          styles.productsList
                        }
                      >
                        {visibleItems.map(
                          (
                            item,
                            itemIndex
                          ) => (
                            <View
                              key={`${item.product_id}-${itemIndex}`}
                              style={
                                styles.productRow
                              }
                            >
                              <Text
                                style={
                                  styles.productName
                                }
                                numberOfLines={
                                  1
                                }
                              >
                                {item.name}
                              </Text>

                              <Text
                                style={
                                  styles.productQuantity
                                }
                              >
                                ×{' '}
                                {
                                  item.quantity
                                }
                              </Text>
                            </View>
                          )
                        )}

                        {hasMoreItems && (
                          <View
                            style={
                              styles.moreProductsRow
                            }
                          >
                            <Text
                              style={
                                styles.moreProductsText
                              }
                            >
                              + ещё{' '}
                              {
                                remainingItems
                              }{' '}
                              {remainingItems ===
                              1
                                ? 'товар'
                                : remainingItems >=
                                    2 &&
                                  remainingItems <=
                                    4
                                ? 'товара'
                                : 'товаров'}
                            </Text>

                            <Text
                              style={
                                styles.moreProductsArrow
                              }
                            >
                              ›
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View
                      style={
                        styles.orderBottom
                      }
                    >
                      <Text
                        style={
                          styles.orderTime
                        }
                      >
                        {order.order_time
                          ? formatTime(
                              order.order_time
                            )
                          : 'Время не указано'}
                      </Text>

                      <Text
                        style={
                          styles.orderPrice
                        }
                      >
                        {Number(
                          order.total ?? 0
                        ).toLocaleString(
                          'ru-RU'
                        )}{' '}
                        ₸
                      </Text>
                    </View>
                  </Pressable>
                  </View>
                );
              }
            )}

            {canExpandOrders && (
              <Pressable
                style={styles.expandButton}
                onPress={() =>
                  setVisibleOrdersCount(
                    orders.length
                  )
                }
                hitSlop={8}
              >
                <Text
                  style={
                    styles.expandButtonText
                  }
                >
                  ↓
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>

      {/* ЗАДАЧИ */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Задачи
          </Text>

          <Pressable
            onPress={() =>
              router.push('/tasks')
            }
            hitSlop={8}
          >
            <Text style={styles.linkText}>
              Все →
            </Text>
          </Pressable>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Нет задач
            </Text>

            <Text style={styles.emptyText}>
              На сегодня задач нет
            </Text>
          </View>
        ) : (
          <>
            {visibleTasks.map(
              (task, index) => {
                const deadlineText =
                  task.deadline
                    ? formatDeadline(
                        task.deadline
                      )
                    : '';

                return (
                  <Pressable
                    key={task.id}
                    style={[
                      styles.taskCard,
                      index !==
                        visibleTasks.length -
                          1 &&
                        styles.taskItemBorder,
                    ]}
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
                      style={
                        styles.taskCardTop
                      }
                    >
                      <View
                        style={
                          styles.taskCardMain
                        }
                      >
                        <Text
                          style={
                            styles.taskTitle
                          }
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
                          {getTaskStatusLabel(
                            task.status
                          )}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.statusButtons
                      }
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

                          void handleTaskStatusChange(
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

                          void handleTaskStatusChange(
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

                          void handleTaskStatusChange(
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
              }
            )}

            {canExpandTasks && (
              <Pressable
                style={styles.expandButton}
                onPress={() =>
                  setVisibleTasksCount(
                    tasks.length
                  )
                }
                hitSlop={8}
              >
                <Text
                  style={
                    styles.expandButtonText
                  }
                >
                  ↓
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function getOrderStatusStyle(
  status: string
) {
  switch (status) {
    case 'ACCEPTED':
    case 'IN_PROGRESS':
      return styles.statusBlue;

    case 'AWAITING_PICKUP':
      return styles.statusYellow;

    case 'COMPLETED':
      return styles.statusGreen;

    case 'CANCELLED':
      return styles.statusRed;

    case 'DRAFT':
    default:
      return styles.statusGray;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
  },

  date: {
    marginTop: 6,
    fontSize: 16,
    color: '#666666',
    textTransform: 'capitalize',
  },

  section: {
    marginTop: 25,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    
  },
  cardContainer: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingVertical: 3,
    paddingHorizontal: 16,
  },

  cardContainerGap: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },

  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#208AEF',
  },

  /*
   * ЗАКАЗЫ
   */

  orderItem: {
    paddingVertical: 14,
  },

  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  orderClient: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginRight: 12,
  },

  orderStatus: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },

  productsList: {
    marginTop: 10,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },

  productName: {
    flex: 1,
    fontSize: 14,
    color: '#444444',
    marginRight: 12,
  },

  productQuantity: {
    fontSize: 14,
    color: '#777777',
  },

  moreProductsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },

  moreProductsText: {
    fontSize: 14,
    color: '#888888',
  },

  moreProductsArrow: {
    fontSize: 22,
    lineHeight: 24,
    color: '#555555',
  },

  orderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  orderTime: {
    fontSize: 14,
    color: '#777777',
  },

  orderPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  statusGray: {
    backgroundColor: '#EAEAEA',
    color: '#555555',
  },

  statusBlue: {
    backgroundColor: '#E8F1FA',
    color: '#286090',
  },

  statusYellow: {
    backgroundColor: '#F4EFE2',
    color: '#806A2F',
  },

  statusGreen: {
    backgroundColor: '#E8F3EC',
    color: '#287044',
  },

  statusRed: {
    backgroundColor: '#F3E8E8',
    color: '#A33A3A',
  },

  /*
   * ЗАДАЧИ
   */

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

  taskItemBorder: {
    marginBottom: 10,
  },

  /*
   * ОБЩЕЕ
   */

  emptyCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 18,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 14,
    color: '#777777',
  },

  expandButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    marginTop: 2,
  },

  expandButtonText: {
    fontSize: 24,
    lineHeight: 28,
    color: '#208AEF',
  },
});