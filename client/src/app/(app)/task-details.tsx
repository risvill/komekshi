import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  deleteTask,
  getTask,
  updateTaskStatus,
} from '@/services/tasksService';
import { Task, TaskStatus } from '@/types/task';

function getStatusLabel(status: TaskStatus) {
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

function getStatusColors(status: TaskStatus) {
  switch (status) {
    case 'TODO':
      return {
        background: '#EAEAEA',
        text: '#555555',
      };

    case 'IN_PROGRESS':
      return {
        background: '#E8F1FA',
        text: '#286090',
      };

    case 'DONE':
      return {
        background: '#E8F3EC',
        text: '#287044',
      };

    default:
      return {
        background: '#EAEAEA',
        text: '#555555',
      };
  }
}

function getOrderDisplayName(
  order: Task['orders'][number]
) {
  return (
    order.client_name?.trim() ||
    order.clientName?.trim() ||
    order.client?.name?.trim() ||
    order.name?.trim() ||
    `Заказ #${order.id.slice(0, 8)}`
  );
}

function formatDeadline(
  value: string | null
) {
  if (!value) {
    return null;
  }

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
}

export default function TaskDetails() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const { token } = useAuth();

  const [task, setTask] =
    useState<Task | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  useEffect(() => {
    const loadTask = async () => {
      if (!token || !id) {
        return;
      }

      try {
        setLoading(true);

        const data =
          await getTask(token, id);

        setTask(data);
      } catch (error) {
        console.error(
          'Failed to load task:',
          error
        );

        Alert.alert(
          'Ошибка',
          'Не удалось загрузить задачу'
        );
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [token, id]);

  const handleStatusChange = async (
    status: TaskStatus
  ) => {
    if (
      !token ||
      !task ||
      updatingStatus
    ) {
      return;
    }

    try {
      setUpdatingStatus(true);

      const updatedTask =
        await updateTaskStatus(
          token,
          task.id,
          status
        );

      setTask({
        ...task,
        ...updatedTask,
        orders:
          updatedTask.orders?.length > 0
            ? updatedTask.orders
            : task.orders,
      });
    } catch (error) {
      console.error(
        'Failed to update task status:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось изменить статус задачи'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const confirmTaskDelete =
    async () => {
      if (
        !token ||
        !task ||
        deleting
      ) {
        return;
      }

      try {
        setDeleting(true);

        await deleteTask(
          token,
          task.id
        );

        router.replace('/tasks');
      } catch (error) {
        console.error(
          'Failed to delete task:',
          error
        );

        if (Platform.OS === 'web') {
          globalThis.alert(
            'Не удалось удалить задачу'
          );
        } else {
          Alert.alert(
            'Ошибка',
            'Не удалось удалить задачу'
          );
        }
      } finally {
        setDeleting(false);
      }
    };

  const handleDelete = () => {
    if (
      !token ||
      !task ||
      deleting
    ) {
      return;
    }

    const message =
      'Задача будет удалена без возможности восстановления.';

    if (Platform.OS === 'web') {
      if (
        globalThis.confirm(
          `Удалить задачу?\n${message}`
        )
      ) {
        void confirmTaskDelete();
      }

      return;
    }

    Alert.alert(
      'Удалить задачу?',
      message,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () =>
            void confirmTaskDelete(),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundTitle}>
          Задача не найдена
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.replace('/tasks')
          }
        >
          <Text style={styles.backButtonText}>
            ← Вернуться к задачам
          </Text>
        </Pressable>
      </View>
    );
  }

  const statusColors =
    getStatusColors(task.status);

  const deadlineText =
    formatDeadline(task.deadline);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
    >
      {/* BACK */}

      <Pressable
        style={styles.backButton}
        onPress={() =>
          router.back()
        }
      >
        <Text style={styles.backButtonText}>
          ← 
        </Text>
      </Pressable>

      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.pageLabel}>
            ЗАДАЧА
          </Text>

          <Text style={styles.title}>
            {task.title}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusColors.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              {
                color: statusColors.text,
              },
            ]}
          >
            {getStatusLabel(task.status)}
          </Text>
        </View>
      </View>

      {/* DEADLINE */}

      {deadlineText && (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>
            СРОК
          </Text>

          <Text style={styles.infoValue}>
            {deadlineText}
          </Text>
        </View>
      )}

      {/* STATUS ACTION */}

      <View style={styles.actionSection}>
        {task.status === 'TODO' && (
          <Pressable
            style={[
              styles.primaryButton,
              updatingStatus &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              void handleStatusChange(
                'IN_PROGRESS'
              )
            }
            disabled={updatingStatus}
          >
            <Text
              style={styles.primaryButtonText}
            >
              {updatingStatus
                ? 'Сохранение...'
                : 'Начать выполнение'}
            </Text>
          </Pressable>
        )}

        {task.status === 'IN_PROGRESS' && (
          <Pressable
            style={[
              styles.primaryButton,
              updatingStatus &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              void handleStatusChange(
                'DONE'
              )
            }
            disabled={updatingStatus}
          >
            <Text
              style={styles.primaryButtonText}
            >
              {updatingStatus
                ? 'Сохранение...'
                : 'Завершить задачу'}
            </Text>
          </Pressable>
        )}

        {task.status === 'DONE' && (
          <Pressable
            style={[
              styles.secondaryButton,
              updatingStatus &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              void handleStatusChange(
                'TODO'
              )
            }
            disabled={updatingStatus}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              {updatingStatus
                ? 'Сохранение...'
                : 'Вернуть в работу'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ORDERS */}

      <View style={styles.ordersSection}>
        <Text style={styles.sectionHeader}>
          СВЯЗАННЫЕ ЗАКАЗЫ
        </Text>

        {task.orders.length === 0 ? (
          <View style={styles.emptyOrders}>
            <Text
              style={styles.emptyOrdersTitle}
            >
              Нет связанных заказов
            </Text>

            <Text
              style={styles.emptyOrdersText}
            >
              Эта задача выполняется без
              привязки к конкретному заказу.
            </Text>
          </View>
        ) : (
          <View>
            {task.orders.map((order) => (
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
                <View style={styles.orderCardMain}>
                  <Text style={styles.orderLabel}>
                    Заказ #{order.id.slice(0, 8)}
                  </Text>

                  <Text
                    style={styles.orderClient}
                    numberOfLines={1}
                  >
                    {getOrderDisplayName(order)}
                  </Text>
                </View>

                <Text
                  style={styles.orderArrow}
                >
                  ›
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* DELETE */}

      <View style={styles.deleteSection}>
        <Pressable
          style={[
            styles.deleteButton,
            deleting &&
              styles.buttonDisabled,
          ]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text
            style={styles.deleteButtonText}
          >
            {deleting
              ? 'Удаление...'
              : 'Удалить задачу'}
          </Text>
        </Pressable>
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },

  backButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555555',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  headerMain: {
    flex: 1,
    paddingRight: 14,
  },

  pageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: '#111111',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 2,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  infoCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    marginBottom: 16,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },

  actionSection: {
    marginBottom: 30,
  },

  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#333333',
    fontSize: 15,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  ordersSection: {
    marginBottom: 5,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  emptyOrders: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  emptyOrdersTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },

  emptyOrdersText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#777777',
  },

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    marginBottom: 10,
  },

  orderCardMain: {
    flex: 1,
    paddingRight: 12,
  },

  orderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 0.7,
    marginBottom: 5,
  },

  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  orderArrow: {
    fontSize: 28,
    lineHeight: 30,
    color: '#777777',
  },

  deleteSection: {
    paddingTop: 4,
  },

  deleteButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3E8E8',
    alignItems: 'center',
  },

  deleteButtonText: {
    color: '#A33A3A',
    fontSize: 14,
    fontWeight: '600',
  },

  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 18,
  },
});