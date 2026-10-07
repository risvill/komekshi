import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
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

function formatOrderDate(
  dateString: string | null | undefined
) {
  if (!dateString) {
    return '';
  }

  const match = dateString.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (match) {
    const [, year, month, day] = match;

    return `${day}.${month}.${year}`;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatOrderTime(
  timeString: string | null | undefined
) {
  if (!timeString) {
    return '';
  }

  const match = timeString.match(
    /^(\d{1,2}):(\d{2})/
  );

  if (match) {
    const hour = match[1].padStart(2, '0');
    const minute = match[2];

    return `${hour}:${minute}`;
  }

  return timeString;
}

function getOrderTimestamp(order: Order) {
  const date = order.order_date || '9999-12-31';
  const time = order.order_time || '00:00';

  return new Date(
    `${date.slice(0, 10)}T${time.slice(0, 5)}:00`
  ).getTime();
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

function getStatusColors(status: string) {
  switch (status) {
    case 'DRAFT':
      return {
        backgroundColor: '#EAEAEA',
        color: '#555555',
      };

    case 'ACCEPTED':
    case 'IN_PROGRESS':
      return {
        backgroundColor: '#E8F1FA',
        color: '#286090',
      };

    case 'AWAITING_PICKUP':
      return {
        backgroundColor: '#F4EFE2',
        color: '#806A2F',
      };

    case 'COMPLETED':
      return {
        backgroundColor: '#E8F3EC',
        color: '#287044',
      };

    case 'CANCELLED':
      return {
        backgroundColor: '#F3E8E8',
        color: '#A33A3A',
      };

    default:
      return {
        backgroundColor: '#EAEAEA',
        color: '#555555',
      };
  }
}

export default function Orders() {
  const { token } = useAuth();

  const { from } = useLocalSearchParams<{
    from?: string;
  }>();

  const showBack = from === 'today';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] =
    useState<OrderTab>('accepted');

  const [sortAscending, setSortAscending] =
    useState(true);

  const loadOrders = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await getOrders(token);
      setOrders(data);
    } catch (error) {
      console.error(
        'Failed to load orders:',
        error
      );
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
        (order) => order.status === 'COMPLETED'
      );
    }

    const searchValue =
      search.trim().toLowerCase();

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

    result = [...result].sort((a, b) => {
      const dateA = getOrderTimestamp(a);
      const dateB = getOrderTimestamp(b);

      return sortAscending
        ? dateA - dateB
        : dateB - dateA;
    });

    return result;
  }, [
    orders,
    activeTab,
    search,
    sortAscending,
  ]);

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
      <View style={showBack ? styles.todayHeader : styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.todayBackButton}
        >
          <Text style={styles.todayBackButtonText}>
            ←
          </Text>
        </Pressable>
      ) : null}

      <View
        style={
          showBack
            ? styles.todayHeaderText
            : styles.headerLeft
        }
      >
        <Text
          style={
            showBack
              ? styles.todayTitle
              : styles.title
          }
        >
          Заказы
        </Text>

        <Text
          style={
            showBack
              ? styles.todayCount
              : styles.count
          }
        >
          Заказов: {orders.length}
        </Text>
      </View>

      <Pressable
        style={styles.addButton}
        onPress={() => router.push('/new-order')}
        hitSlop={8}
      >
        <Text style={styles.addButtonText}>
          +
        </Text>
      </Pressable>
    </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Поиск по клиенту или товару"
        placeholderTextColor="#999"
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

        <Pressable
          style={styles.sortButton}
          onPress={() =>
            setSortAscending((value) => !value)
          }
          hitSlop={8}
        >
          <Text style={styles.sortIcon}>
            {sortAscending ? '↑' : '↓'}
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
          filteredOrders.map((order) => {
            const visibleItems =
              (order.items ?? []).slice(0, 2);

            const formattedDate =
              formatOrderDate(order.order_date);

            const formattedTime =
              formatOrderTime(order.order_time);

            const statusColors =
              getStatusColors(order.status);

            return (
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
                  <Text
                    style={styles.clientName}
                    numberOfLines={1}
                  >
                    {order.client_name ||
                      'Без клиента'}
                  </Text>

                  <Text style={styles.total}>
                    {order.total} ₸
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        statusColors.backgroundColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          statusColors.color,
                      },
                    ]}
                  >
                    {getStatusLabel(
                      order.status
                    )}
                  </Text>
                </View>

                <View style={styles.items}>
                  {visibleItems.map((item) => (
                    <Text
                      key={item.id}
                      style={styles.itemDetails}
                      numberOfLines={1}
                    >
                      {item.name} — {item.quantity} ×{' '}
                      {item.price} ₸
                    </Text>
                  ))}

                  {(order.items ?? []).length > 2 && (
                    <Text style={styles.moreItems}>
                      ...
                    </Text>
                  )}
                </View>

                {(formattedDate ||
                  formattedTime) && (
                  <Text style={styles.date}>
                    {formattedDate}
                    {formattedTime
                      ? ` • ${formattedTime}`
                      : ''}
                  </Text>
                )}
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
    flexGrow: 1,
    padding: 24,
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  // ==========================================
  // HEADER ЧЕРЕЗ TODAY
  // ==========================================

  todayHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  todayBackButtonText: {
    fontSize: 20,
    lineHeight: 30,
    color: '#111111',
  },

  todayHeaderText: {
    flex: 1,
    alignItems: 'center',
  },

  todayTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
  },

  todayCount: {
    marginTop: 5,
    fontSize: 15,
    color: '#777777',
    textAlign: 'center',
  },

  // ==========================================
  // ОБЫЧНЫЙ HEADER ЧЕРЕЗ TAB
  // ==========================================

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
  },

  count: {
    marginTop: 8,
    fontSize: 14,
    color: '#777777',
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },

  // ==========================================
  // SEARCH
  // ==========================================

  searchInput: {
    marginTop: 24,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    fontSize: 15,
    color: '#111111',
  },

  // ==========================================
  // TABS
  // ==========================================

  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
  },

  tabText: {
    fontSize: 14,
    color: '#777777',
  },

  tabTextActive: {
    color: '#111111',
    fontWeight: '600',
  },

  sortButton: {
    width: 32,
    height: 32,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sortIcon: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
  },

  // ==========================================
  // LIST
  // ==========================================

  list: {
    marginTop: 8,
  },

  orderCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  clientName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },

  total: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  items: {
    marginTop: 10,
  },

  itemDetails: {
    marginTop: 5,
    fontSize: 14,
    color: '#666666',
  },

  moreItems: {
    marginTop: 4,
    fontSize: 14,
    color: '#999999',
    letterSpacing: 1,
  },

  date: {
    marginTop: 12,
    fontSize: 13,
    color: '#888888',
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888888',
  },
});