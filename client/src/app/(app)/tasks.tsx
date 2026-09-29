import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { getOrders } from '@/services/ordersService';
import {
  createTask,
  getTasks,
  updateTaskStatus,
} from '@/services/tasksService';
import { Order } from '@/types/order';
import { Task, TaskStatus } from '@/types/task';

export default function TasksScreen() {
  const { token } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadTasks = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await getTasks(token);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
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

  const handleCreateTask = async () => {
    if (!token) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Enter a task title');
      return;
    }

    try {
      const newTask = await createTask(token, {
        title: title.trim(),
        deadline: deadline ? deadline.toISOString() : null,
        order_ids: selectedOrderIds,
      });

      setDeadline(null);
      setSelectedOrderIds([]);

      setTasks((current) => [newTask, ...current]);
      setTitle('');
      setShowCreate(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleStatusChange = async (
    task: Task,
    status: TaskStatus
  ) => {
    if (!token) return;

    try {
      const updatedTask = await updateTaskStatus(
        token,
        task.id,
        status
      );

      setTasks((current) =>
        current.map((item) =>
          item.id === updatedTask.id ? updatedTask : item
        )
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const renderTask = (item: Task) => {
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
        <Text style={styles.taskTitle}>{item.title}</Text>

        <Text style={styles.status}>
          {item.status === 'TODO'
            ? 'To do'
            : item.status === 'IN_PROGRESS'
            ? 'In progress'
            : 'Done'}
        </Text>

        {item.deadline && (
          <Text style={styles.deadline}>
            Deadline: {new Date(item.deadline).toLocaleString()}
          </Text>
        )}

        {item.orders.length > 0 && (
          <Text style={styles.orders}>
            Orders: {item.orders.length}
          </Text>
        )}

        <View style={styles.statusButtons}>
          <Pressable
            style={[
              styles.statusButton,
              item.status === 'TODO' && styles.activeButton,
            ]}
            onPress={() => handleStatusChange(item, 'TODO')}
          >
            <Text>To do</Text>
          </Pressable>

          <Pressable
            style={[
              styles.statusButton,
              item.status === 'IN_PROGRESS' &&
                styles.activeButton,
            ]}
            onPress={() =>
              handleStatusChange(item, 'IN_PROGRESS')
            }
          >
            <Text>In progress</Text>
          </Pressable>

          <Pressable
            style={[
              styles.statusButton,
              item.status === 'DONE' && styles.activeButton,
            ]}
            onPress={() => handleStatusChange(item, 'DONE')}
          >
            <Text>Done</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>

        <Pressable
          style={styles.addButton}
          onPress={() => setShowCreate((current) => !current)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {showCreate && (
        <View style={styles.createBox}>
          <TextInput
            style={styles.input}
            placeholder="Task title"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <Pressable
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            >
            <Text>
                {deadline
                ? deadline.toLocaleDateString()
                : 'Choose deadline date'}
            </Text>
            </Pressable>

            <Pressable
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
            >
            <Text>
                {deadline
                ? deadline.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    })
                : 'Choose deadline time'}
            </Text>
            </Pressable>

          <Text style={styles.sectionTitle}>Link to order</Text>

          {orders.map((order) => {
            const selected = selectedOrderIds.includes(order.id);

            return (
              <Pressable
                key={order.id}
                style={[
                  styles.orderOption,
                  selected && styles.selectedOrder,
                ]}
                onPress={() => {
                  setSelectedOrderIds((current) =>
                    selected
                      ? current.filter((id) => id !== order.id)
                      : [...current, order.id]
                  );
                }}
              >
                <Text style={styles.orderOptionTitle}>
                  Order #{order.id.slice(0, 8)}
                </Text>
                <Text style={styles.orderOptionSubtitle}>
                  {order.client_name || 'No client'}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            style={styles.createButton}
            onPress={handleCreateTask}
          >
            <Text style={styles.createButtonText}>
              Create task
            </Text>
          </Pressable>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
            value={deadline ?? new Date()}
            mode="date"
            display="spinner"
            onChange={(event, date) => {
            setShowDatePicker(false);

            if (!date) {
                return;
            }

            const current = deadline ?? new Date();

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
            value={deadline ?? new Date()}
            mode="time"
            display="spinner"
            onChange={(event, date) => {
            setShowTimePicker(false);

            if (!date) {
                return;
            }

            const current = deadline ?? new Date();

            current.setHours(
                date.getHours(),
                date.getMinutes(),
                0,
                0
            );

            setDeadline(current);
            }}
        />
        )}

      {loading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : tasks.length === 0 ? (
        <Text style={styles.emptyText}>
          No tasks yet
        </Text>
      ) : (
        tasks.map(renderTask)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 30,
    flexGrow: 1,
  },
  
  dateButton: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 12,
  padding: 14,
  marginBottom: 10,
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
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
  },

  createBox: {
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },

  orderOption: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    marginBottom: 8,
  },

  selectedOrder: {
    backgroundColor: '#E5E5E5',
  },

  orderOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },

  orderOptionSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 3,
  },

  createButton: {
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  taskCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },

  status: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },

  deadline: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },

  orders: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },

  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },

  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EAEAEA',
  },

  activeButton: {
    backgroundColor: '#D8D8D8',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 40,
    fontSize: 16,
  },
});