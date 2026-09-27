import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { getOrders } from '@/services/ordersService';
import { Order } from '@/types/order';

type OrderTab = 'accepted' | 'drafts' | 'completed';

export default function Orders() {
  const { token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] =
    useState<OrderTab>('accepted');

  const loadOrders = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await getOrders(token);
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [token])
  );

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab === 'accepted') {
      result = result.filter(
        (order) =>
          order.status === 'ACCEPTED' ||
          order.status === 'IN_PROGRESS' ||
          order.status === 'AWAITING_PICKUP'
      );
    }

    if (activeTab === 'drafts') {
      result = result.filter(
        (order) => order.status === 'DRAFT'
      );
    }

    if (activeTab === 'completed') {
      result = result.filter(
        (order) =>
          order.status === 'COMPLETED'
      );
    }

    const searchValue = search.trim().toLowerCase();

    if (searchValue) {
      result = result.filter((order) => {
        const clientName =
          order.client_name?.toLowerCase() || '';

        const itemsText = (order.items ?? [])
          .map((item) => item.name.toLowerCase())
          .join(' ');

        return (
          clientName.includes(searchValue) ||
          itemsText.includes(searchValue)
        );
      });
    }

    return result;
  }, [orders, activeTab, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Заказы
          </Text>

          <Text style={styles.count}>
            Заказов: {orders.length}
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() =>
            router.push('/new-order')
          }
        >
          <Text style={styles.addButtonText}>
            +
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Поиск по клиенту или товару"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'accepted' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setActiveTab('accepted')
          }
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'accepted' &&
                styles.tabTextActive,
            ]}
          >
            Принятые
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === 'drafts' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setActiveTab('drafts')
          }
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'drafts' &&
                styles.tabTextActive,
            ]}
          >
            Черновики
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === 'completed' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setActiveTab('completed')
          }
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' &&
                styles.tabTextActive,
            ]}
          >
            Завершённые
          </Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Заказов нет
            </Text>

            <Text style={styles.emptyText}>
              В этом разделе пока нет заказов
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
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
              <View style={styles.cardHeader}>
                <Text style={styles.clientName}>
                  {order.client_name ||
                    'Без клиента'}
                </Text>

                <Text style={styles.total}>
                  {order.total} ₸
                </Text>
              </View>

              <Text style={styles.status}>
                {getStatusLabel(order.status)}
              </Text>

              {(order.items ?? []).map(
                (item) => (
                  <Text
                    key={item.id}
                    style={styles.itemDetails}
                  >
                    {item.name} —{' '}
                    {item.quantity} ×{' '}
                    {item.price} ₸
                  </Text>
                )
              )}

              {order.order_date && (
                <Text style={styles.date}>
                  {order.order_date}
                  {order.order_time
                    ? ' • ' +
                      order.order_time
                    : ''}
                </Text>
              )}
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function getStatusLabel(status: string) {
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
  },

  count: {
    marginTop: 8,
    opacity: 0.6,
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addButtonText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
  },

  searchInput: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },

  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#208AEF',
  },

  tabText: {
    fontSize: 14,
    opacity: 0.6,
  },

  tabTextActive: {
    opacity: 1,
    fontWeight: '600',
  },

  list: {
    marginTop: 12,
  },

  orderCard: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  clientName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },

  total: {
    fontSize: 16,
    fontWeight: '600',
  },

  status: {
    marginTop: 6,
    opacity: 0.6,
  },

  itemDetails: {
    marginTop: 6,
    opacity: 0.6,
  },

  date: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.5,
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  emptyText: {
    marginTop: 8,
    opacity: 0.5,
  },
});