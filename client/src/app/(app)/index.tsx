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
import { getTasks } from '@/services/tasksService';
import { Order } from '@/types/order';
import { Task } from '@/types/task';

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return formatDateKey(new Date());
}

function isToday(dateString: string | null | undefined, today: string) {
  if (!dateString) {
    return false;
  }

  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
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

function getTaskStatusLabel(status: string) {
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

export default function Today() {
  const { token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [visibleOrdersCount, setVisibleOrdersCount] = useState(3);
  const [visibleTasksCount, setVisibleTasksCount] = useState(3);
  const [loading, setLoading] = useState(true);

  const today = getTodayDate();

  const loadToday = async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);

      const [ordersData, tasksData] = await Promise.all([
        getOrders(token),
        getTasks(token),
      ]);

      const todayOrders = ordersData.filter((order) =>
        isToday(order.order_date, today)
      );

      const todayTasks = tasksData.filter((task) => {
        if (!task.deadline) {
          return false;
        }

        const taskDate = new Date(task.deadline);

        const year = taskDate.getFullYear();
        const month = String(taskDate.getMonth() + 1).padStart(2, '0');
        const day = String(taskDate.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}` === today;
      });

      setOrders(todayOrders);
      setTasks(todayTasks);
      setVisibleOrdersCount(3);
      setVisibleTasksCount(3);
    } catch (error) {
      console.error('Failed to load today:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [token])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const visibleOrders = orders.slice(0, visibleOrdersCount);
  const visibleTasks = tasks.slice(0, visibleTasksCount);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Сегодня</Text>

      <Text style={styles.date}>
        {getDateLabel()}
      </Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Заказы</Text>
          <Pressable onPress={() => router.push('/orders')}>
            <Text style={styles.linkText}>Все →</Text>
          </Pressable>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Нет заказов</Text>
            <Text style={styles.emptyText}>
              На сегодня заказов пока нет
            </Text>
          </View>
        ) : (
          <>
            {visibleOrders.map((order) => (
              <Pressable
                key={order.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/order-details',
                    params: {
                      id: order.id,
                    },
                  })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>
                    {order.client_name || 'Без клиента'}
                  </Text>

                  <Text style={styles.price}>{order.total} ₸</Text>
                </View>

                <Text style={styles.cardStatus}>
                  {getOrderStatusLabel(order.status)}
                </Text>

                {order.order_time && (
                  <Text style={styles.cardInfo}>
                    Время: {order.order_time}
                  </Text>
                )}

                {order.items.length > 0 && (
                  <Text style={styles.cardInfo}>
                    Товаров: {order.items.length}
                  </Text>
                )}
              </Pressable>
            ))}

            {orders.length > 3 && visibleOrdersCount < orders.length && (
              <Pressable
                style={styles.expandButton}
                onPress={() =>
                  setVisibleOrdersCount((current) =>
                    Math.min(current + 2, orders.length)
                  )
                }
              >
                <Text style={styles.expandButtonText}>↓</Text>
              </Pressable>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Задачи</Text>
          <Pressable onPress={() => router.push('/tasks')}>
            <Text style={styles.linkText}>Все →</Text>
          </Pressable>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Нет задач</Text>
            <Text style={styles.emptyText}>
              На сегодня задач нет
            </Text>
          </View>
        ) : (
          <>
            {visibleTasks.map((task) => (
              <Pressable
                key={task.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/task-details',
                    params: {
                      id: task.id,
                    },
                  })
                }
              >
                <Text style={styles.cardTitle}>{task.title}</Text>

                <Text style={styles.cardStatus}>
                  {getTaskStatusLabel(task.status)}
                </Text>

                {task.deadline && (
                  <Text style={styles.cardInfo}>
                    Дедлайн:{' '}
                    {new Date(task.deadline).toLocaleTimeString(
                      'ru-RU',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </Text>
                )}

                {task.orders.length > 0 && (
                  <Text style={styles.cardInfo}>
                    Связанных заказов: {task.orders.length}
                  </Text>
                )}
              </Pressable>
            ))}

            {tasks.length > 3 && visibleTasksCount < tasks.length && (
              <Pressable
                style={styles.expandButton}
                onPress={() =>
                  setVisibleTasksCount((current) =>
                    Math.min(current + 2, tasks.length)
                  )
                }
              >
                <Text style={styles.expandButtonText}>↓</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
  },

  date: {
    marginTop: 6,
    fontSize: 16,
    opacity: 0.6,
    textTransform: 'capitalize',
  },

  section: {
    marginTop: 32,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#208AEF',
  },

  expandButton: {
    marginTop: 8,
    alignItems: 'center',
  },

  expandButtonText: {
    fontSize: 24,
    color: '#208AEF',
  },

  card: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },

  price: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },

  cardStatus: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.7,
  },

  cardInfo: {
    marginTop: 5,
    fontSize: 14,
    opacity: 0.6,
  },

  emptyCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 18,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 14,
    opacity: 0.6,
  },
});