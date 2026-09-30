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

function getTaskDate(task: Task) {
  if (!task.deadline) {
    return null;
  }

  return formatDate(new Date(task.deadline));
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

  // JS: Sunday = 0
  // Наш календарь: Monday = 0
  return day === 0 ? 6 : day - 1;
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
      console.error('Failed to load calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [token])
  );

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
(order) => {
if (!order.order_date) {
return false;
}

const date = new Date(order.order_date);

const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');

return `${year}-${month}-${day}` === selectedDate;

}
);

  const selectedTasks = tasks.filter(
    (task) => getTaskDate(task) === selectedDate
  );

  const hasEvent = (date: string) => {
    const hasOrder = orders.some((order) => {
if (!order.order_date) {
return false;
}

const orderDate = new Date(order.order_date);

const year = orderDate.getFullYear();
const month = String(orderDate.getMonth() + 1).padStart(2, '0');
const day = String(orderDate.getDate()).padStart(2, '0');

return `${year}-${month}-${day}` === date;
});

    const hasTask = tasks.some(
      (task) => getTaskDate(task) === date
    );

    return hasOrder || hasTask;
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
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Календарь</Text>
      </View>

      <View style={styles.monthHeader}>
        <Pressable
          style={styles.monthButton}
          onPress={goToPreviousMonth}
        >
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>

        <Text style={styles.monthTitle}>
          {getMonthName(currentMonth)}
        </Text>

        <Pressable
          style={styles.monthButton}
          onPress={goToNextMonth}
        >
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(
          (day) => (
            <Text
              key={day}
              style={styles.weekDay}
            >
              {day}
            </Text>
          )
        )}
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

          const isToday = dateString === today;
          const isSelected = dateString === selectedDate;
          const eventExists = hasEvent(dateString);

          return (
            <Pressable
              key={dateString}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDayCell,
              ]}
              onPress={() => setSelectedDate(dateString)}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && styles.todayCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.todayText,
                  ]}
                >
                  {day}
                </Text>
              </View>

              {eventExists && (
                <View style={styles.eventDot} />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectedSection}>
        <Text style={styles.selectedDate}>
          {new Date(
            selectedDate + 'T00:00:00'
          ).toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>

        <Text style={styles.sectionTitle}>
          Заказы
        </Text>

        {selectedOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Заказов нет
            </Text>
          </View>
        ) : (
          selectedOrders.map((order) => (
            <Pressable
              key={order.id}
              style={styles.eventCard}
              onPress={() =>
                router.push({
                  pathname: '/order-details',
                  params: {
                    id: order.id,
                  },
                })
              }
            >
              <View style={styles.eventTop}>
                <Text style={styles.eventTitle}>
                  {order.client_name || 'Без клиента'}
                </Text>

                <Text style={styles.eventPrice}>
                  {order.total} ₸
                </Text>
              </View>

              <Text style={styles.eventStatus}>
                {getOrderStatusLabel(order.status)}
              </Text>

              {order.order_time && (
                <Text style={styles.eventInfo}>
                  Время: {order.order_time}
                </Text>
              )}
            </Pressable>
          ))
        )}

        <Text style={styles.sectionTitle}>
          Задачи
        </Text>

        {selectedTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Задач нет
            </Text>
          </View>
        ) : (
          selectedTasks.map((task) => (
            <Pressable
              key={task.id}
              style={styles.eventCard}
              onPress={() =>
                router.push({
                  pathname: '/task-details',
                  params: {
                    id: task.id,
                  },
                })
              }
            >
              <Text style={styles.eventTitle}>
                {task.title}
              </Text>

              <Text style={styles.eventStatus}>
                {getTaskStatusLabel(task.status)}
              </Text>

              {task.deadline && (
                <Text style={styles.eventInfo}>
                  Дедлайн:{' '}
                  {new Date(
                    task.deadline
                  ).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}

              {task.orders.length > 0 && (
                <Text style={styles.eventInfo}>
                  Заказов: {task.orders.length}
                </Text>
              )}
            </Pressable>
          ))
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

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  weekDay: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.5,
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  selectedDayCell: {
    backgroundColor: '#F2F2F2',
  },

  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  todayCircle: {
    backgroundColor: '#111',
  },

  dayText: {
    fontSize: 15,
  },

  todayText: {
    color: '#fff',
    fontWeight: '600',
  },

  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#111',
  },

  selectedSection: {
    marginTop: 28,
  },

  selectedDate: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 20,
  },

  eventCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },

  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },

  eventPrice: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },

  eventStatus: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.7,
  },

  eventInfo: {
    marginTop: 5,
    fontSize: 14,
    opacity: 0.6,
  },

  emptyCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
  },

  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
});