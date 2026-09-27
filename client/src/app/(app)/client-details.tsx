import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import {
  ClientDetails,
  getClientDetails,
} from '@/services/clientsService';

export default function ClientDetailsScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [data, setData] =
    useState<ClientDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const loadClient = async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }

    try {
      const result = await getClientDetails(
        token,
        id
      );

      setData(result);
    } catch (error) {
      console.error(
        'Failed to load client details:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClient();
    }, [token, id])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>
          Не удалось загрузить клиента
        </Text>
      </View>
    );
  }

  const { client, orders, latest_address } =
    data;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Клиент
        </Text>

        <Pressable
        onPress={() =>
            router.push({
            pathname: '/edit-client',
            params: {
                id: client.id,
            },
            })
        }
        >
        <Text style={styles.edit}>
            ✎
        </Text>
        </Pressable>
      </View>

      <View style={styles.profile}>
        <Text style={styles.name}>
          {client.name}
        </Text>

        {client.phone && (
          <Text style={styles.phone}>
            {client.phone}
          </Text>
        )}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>
        Контактная информация
      </Text>

      <View style={styles.infoBlock}>
        <Text style={styles.infoLabel}>
          Последний адрес
        </Text>

        <Text style={styles.infoValue}>
          {latest_address ||
            'Адрес ещё не указан'}
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.orderCount}>
        {orders.length} заказов
      </Text>

      <Text style={styles.sectionTitle}>
        История заказов
      </Text>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Заказов пока нет
          </Text>

          <Text style={styles.emptyText}>
            Когда появится заказ, он будет
            отображаться здесь
          </Text>
        </View>
      ) : (
        <View style={styles.ordersList}>
          {orders.map((order) => (
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
              <View
                style={styles.orderHeader}
              >
                <Text style={styles.orderDate}>
                  {formatOrderDate(
                    order.order_date,
                    order.created_at
                  )}
                </Text>

                <Text style={styles.orderTotal}>
                  {order.total} ₸
                </Text>
              </View>

              <View style={styles.items}>
                {order.items.map(
                  (item) => (
                    <Text
                      key={item.id}
                      style={styles.item}
                    >
                      {item.name}
                      {' · '}
                      {item.quantity}{' '}
                      {item.unit === 'portion'
                        ? 'порц.'
                        : 'шт.'}
                    </Text>
                  )
                )}
              </View>

              <Text style={styles.status}>
                {getStatusLabel(
                  order.status
                )}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function formatOrderDate(
  orderDate: string | null,
  createdAt: string
) {
  const date = new Date(
    orderDate || createdAt
  );

  return date.toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
    }
  );
}

function getStatusLabel(
  status: string
) {
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
    padding: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  back: {
    fontSize: 38,
    lineHeight: 38,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  edit: {
    fontSize: 24,
  },

  profile: {
    marginTop: 28,
  },

  name: {
    fontSize: 28,
    fontWeight: '700',
  },

  phone: {
    marginTop: 8,
    fontSize: 16,
    opacity: 0.6,
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 24,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },

  infoBlock: {
    marginTop: 18,
  },

  infoLabel: {
    fontSize: 13,
    opacity: 0.5,
  },

  infoValue: {
    marginTop: 6,
    fontSize: 16,
  },

  orderCount: {
    fontSize: 22,
    fontWeight: '700',
  },

  ordersList: {
    marginTop: 14,
  },

  orderCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    marginBottom: 10,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  orderDate: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  orderTotal: {
    fontSize: 15,
    fontWeight: '600',
  },

  items: {
    marginTop: 8,
  },

  item: {
    fontSize: 14,
    opacity: 0.65,
    marginTop: 3,
  },

  status: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.55,
  },

  emptyState: {
    marginTop: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.5,
  },
});