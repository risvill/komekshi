import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import {
  getTasks,
  updateTaskStatus,
} from '@/services/tasksService';
import { Task, TaskStatus } from '@/types/task';

export default function TasksScreen() {
  const { token } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

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

  useFocusEffect(
    useCallback(() => {
      loadTasks();
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

      Alert.alert(
        'Ошибка',
        'Не удалось изменить статус задачи'
      );
    }
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
              item.status === 'IN_PROGRESS' &&
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
                item.status === 'IN_PROGRESS' &&
                  styles.statusBadgeTextProgress,
                item.status === 'DONE' &&
                  styles.statusBadgeTextDone,
              ]}
            >
              {getStatusLabel(item.status)}
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
              item.status === 'IN_PROGRESS' &&
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
                item.status === 'IN_PROGRESS' &&
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButtonContainer}
        >
          <Text style={styles.backButton}>
            ←
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Задачи
        </Text>

        <Pressable
          style={styles.addButton}
          onPress={() =>
            router.push('/new-task')
          }
          accessibilityRole="button"
          accessibilityLabel="Создать задачу"
        >
          <Text style={styles.addButtonText}>
            +
          </Text>
        </Pressable>
      </View>

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

          <Pressable
            style={styles.emptyCreateButton}
            onPress={() =>
              router.push('/new-task')
            }
          >
            <Text
              style={
                styles.emptyCreateButtonText
              }
            >
              Создать задачу
            </Text>
          </Pressable>
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
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 28,
    minHeight: 44,
  },

  backButtonContainer: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
  },

  backButton: {
    fontSize: 20,
    lineHeight: 30,
    color: '#111111',
  },

  title: {
    fontSize: 24,
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
    position: 'absolute',
    right: 0,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
  },

  section: {
    marginBottom: 10,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 15,
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