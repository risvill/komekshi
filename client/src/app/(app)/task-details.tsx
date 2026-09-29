import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
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
      return 'Выполнена';
    default:
      return status;
  }
}

export default function TaskDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadTask = async () => {
      if (!token || !id) {
        return;
      }

      try {
        setLoading(true);

        const data = await getTask(token, id);

        setTask(data);
      } catch (error) {
        console.error('Failed to load task:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [token, id]);

  const handleStatusChange = async (status: TaskStatus) => {
    if (!token || !task) {
      return;
    }

    try {
      setUpdatingStatus(true);

      const updatedTask = await updateTaskStatus(
        token,
        task.id,
        status
        );

        setTask({
        ...task,
        ...updatedTask,
        orders: updatedTask.orders.length > 0
            ? updatedTask.orders
            : task.orders,
        });
    } catch (error) {
      console.error('Failed to update task status:', error);

      Alert.alert(
        'Ошибка',
        'Не удалось изменить статус задачи'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const confirmTaskDelete = async () => {
    if (!token || !task || deleting) {
      return;
    }

    try {
      setDeleting(true);
      await deleteTask(token, task.id);
      router.back();
    } catch (error) {
      console.error('Failed to delete task:', error);

      if (Platform.OS === 'web') {
        globalThis.alert('Не удалось удалить задачу');
      } else {
        Alert.alert('Ошибка', 'Не удалось удалить задачу');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!token || !task || deleting) {
      return;
    }

    const message = 'Задача будет удалена без возможности восстановления.';

    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Удалить задачу?\n${message}`)) {
        void confirmTaskDelete();
      }
      return;
    }

    Alert.alert(
      'Удалить задачу?',
      message,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => void confirmTaskDelete(),
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
        <Text>Задача не найдена</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Задача
      </Text>

      <Text style={styles.taskTitle}>
        {task.title}
      </Text>

      <Text style={styles.status}>
        {getStatusLabel(task.status)}
      </Text>

      {task.deadline && (
        <Text style={styles.info}>
          📅 {new Date(task.deadline).toLocaleString()}
        </Text>
      )}

      {task.status === 'TODO' && (
        <Pressable
          style={styles.statusButton}
          onPress={() =>
            handleStatusChange('IN_PROGRESS')
          }
          disabled={updatingStatus}
        >
          <Text style={styles.statusButtonText}>
            {updatingStatus
              ? 'Сохранение...'
              : 'Начать выполнение'}
          </Text>
        </Pressable>
      )}

      {task.status === 'IN_PROGRESS' && (
        <Pressable
          style={styles.statusButton}
          onPress={() =>
            handleStatusChange('DONE')
          }
          disabled={updatingStatus}
        >
          <Text style={styles.statusButtonText}>
            {updatingStatus
              ? 'Сохранение...'
              : 'Завершить задачу'}
          </Text>
        </Pressable>
      )}

      {task.status === 'DONE' && (
        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            handleStatusChange('TODO')
          }
          disabled={updatingStatus}
        >
          <Text style={styles.secondaryButtonText}>
            Вернуть в работу
          </Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>
        Связанные заказы
      </Text>

      {task.orders.length === 0 ? (
        <Text style={styles.emptyText}>
          Задача не связана с заказами
        </Text>
      ) : (
        task.orders.map((order) => (
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
            <View>
              <Text style={styles.orderTitle}>
                Заказ
              </Text>

              <Text style={styles.orderClient}>
                {order.client_name || 'Без клиента'}
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>
        ))
      )}

      <Pressable
        style={[
          styles.deleteButton,
          deleting && styles.deleteButtonDisabled,
        ]}
        onPress={handleDelete}
        disabled={deleting}
      >
        <Text style={styles.deleteButtonText}>
          {deleting ? 'Удаление...' : 'Удалить задачу'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
  },

  taskTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '600',
  },

  status: {
    marginTop: 8,
    fontSize: 15,
    opacity: 0.6,
  },

  info: {
    marginTop: 10,
    fontSize: 15,
    opacity: 0.7,
  },

  statusButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#208AEF',
    alignSelf: 'flex-start',
  },

  statusButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  secondaryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    alignSelf: 'flex-start',
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  sectionTitle: {
    marginTop: 32,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
  },

  emptyText: {
    opacity: 0.6,
  },

  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#F7F7F7',
  },

  orderTitle: {
    fontSize: 14,
    opacity: 0.6,
  },

  orderClient: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
  },

  arrow: {
    fontSize: 28,
    color: '#777',
  },

  deleteButton: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#208AEF',
    alignSelf: 'flex-start',
  },

  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  deleteButtonDisabled: {
    opacity: 0.6,
  },
});