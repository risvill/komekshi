import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import * as Clipboard from 'expo-clipboard';
import { getOrders, updateOrderStatus } from '@/services/ordersService';
import { Order } from '@/types/order';
import { useEffect, useState } from 'react';

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

export default function OrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!token || !id) {
        return;
      }

      try {
        const orders = await getOrders(token);

        const foundOrder = orders.find(
          (item) => item.id === id
        );

        setOrder(foundOrder ?? null);
      } catch (error) {
        console.error('Failed to load order:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [token, id]);

    const handleStatusChange = async (status: string) => {
    if (!token || !order) {
    return;
    }

    try {
    setUpdatingStatus(true);

    const updatedOrder = await updateOrderStatus(
    token,
    order.id,
    status
    );

    setOrder({
    ...order,
    ...updatedOrder,
    });
    } catch (error) {
    console.error('Failed to update order status:', error);
    Alert.alert('Ошибка', 'Не удалось изменить статус заказа');
    } finally {
    setUpdatingStatus(false);
    }
    };

    const handleCopyOffer = async () => {
if (!order) {
return;
}

const itemsText = order.items
.map(
(item) =>
item.name +
' — ' +
item.quantity +
' × ' +
item.price +
' ₸'
)
.join('\n');

const offerText =
'Заказ для ' +
(order.client_name || 'клиента') +
'\n\n' +
itemsText +
'\n\nИтого: ' +
order.total +
' ₸';

await Clipboard.setStringAsync(offerText);

Alert.alert('Готово', 'Предложение скопировано');
};

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Заказ не найден</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Заказ
      </Text>

      <Text style={styles.client}>
        {order.client_name || 'Без клиента'}
      </Text>

      <Text style={styles.status}>
        {getStatusLabel(order.status)}
        </Text>

       {order.status === 'DRAFT' && (
        <Pressable
        style={styles.statusButton}
        onPress={() => handleStatusChange('ACCEPTED')}
        disabled={updatingStatus}
        >
        <Text style={styles.statusButtonText}>
        {updatingStatus ? 'Сохранение...' : 'Принять заказ'}
        </Text>
        </Pressable>
        )}

        {order.status === 'ACCEPTED' && (
        <Pressable
        style={styles.statusButton}
        onPress={() => handleStatusChange('IN_PROGRESS')}
        disabled={updatingStatus}
        >
        <Text style={styles.statusButtonText}>
        {updatingStatus ? 'Сохранение...' : 'Начать выполнение'}
        </Text>
        </Pressable>
        )}

        {order.status === 'IN_PROGRESS' && (
        <Pressable
        style={styles.statusButton}
        onPress={() => handleStatusChange('AWAITING_PICKUP')}
        disabled={updatingStatus}
        >
        <Text style={styles.statusButtonText}>
        {updatingStatus ? 'Сохранение...' : 'Заказ готов'}
        </Text>
        </Pressable>
        )}

        {order.status === 'AWAITING_PICKUP' && (
        <Pressable
        style={styles.statusButton}
        onPress={() => handleStatusChange('COMPLETED')}
        disabled={updatingStatus}
        >
        <Text style={styles.statusButtonText}>
        {updatingStatus ? 'Сохранение...' : 'Завершить заказ'}
        </Text>
        </Pressable>
        )}

        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
        <Pressable
        style={styles.cancelButton}
        onPress={() => {
        Alert.alert(
        'Отменить заказ?',
        'После отмены заказ больше не будет двигаться по статусам.',
        [
        {
        text: 'Нет',
        style: 'cancel',
        },
        {
        text: 'Отменить',
        style: 'destructive',
        onPress: () => handleStatusChange('CANCELLED'),
        },
        ]
        );
        }}
        disabled={updatingStatus}
        >
        <Text style={styles.cancelButtonText}>
        Отменить заказ
        </Text>
        </Pressable>
        )}

        <Pressable
        style={styles.copyButton}
        onPress={handleCopyOffer}
        >
        <Text style={styles.copyButtonText}>
        Скопировать предложение
        </Text>
        </Pressable>
      {order.order_date && (
        <Text style={styles.info}>
        📅 {order.order_date}
        {order.order_time ? ' • ' + order.order_time : ''}
        </Text>
        )}

        {order.address && (
        <Text style={styles.info}>
        📍 {order.address}
        </Text>
        )}

        {order.wishes && (
        <Text style={styles.info}>
        📝 {order.wishes}
        </Text>
        )}

      <Text style={styles.sectionTitle}>
        Товары
      </Text>

      {order.items.map((item) => (
        <View key={item.id} style={styles.item}>
          <View>
            <Text style={styles.itemName}>
              {item.name}
            </Text>

            <Text style={styles.itemDetails}>
              {item.quantity} × {item.price} ₸
            </Text>
          </View>

          <Text style={styles.itemTotal}>
            {Number(item.quantity) * Number(item.price)} ₸
          </Text>
        </View>
      ))}

      <View style={styles.totalBlock}>
        <View>
        <Text style={styles.summaryLabel}>
        Сумма товаров
        </Text>

        <Text style={styles.summaryLabel}>
        {order.subtotal} ₸
        </Text>

        {order.discount_type && order.discount_value && (
        <Text style={styles.summaryLabel}>
        Скидка: {order.discount_type === 'PERCENT'
        ? order.discount_value + '%'
        : order.discount_value + ' ₸'}
        </Text>
        )}
        </View>

        <View style={styles.totalRight}>
        <Text style={styles.totalLabel}>
        Итого
        </Text>

        <Text style={styles.total}>
        {order.total} ₸
        </Text>
        </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({

    info: {
marginTop: 8,
fontSize: 15,
opacity: 0.7,
},

cancelButton: {
marginTop: 12,
paddingVertical: 12,
paddingHorizontal: 18,
borderRadius: 10,
borderWidth: 1,
borderColor: '#ddd',
alignSelf: 'flex-start',
},

cancelButtonText: {
fontSize: 15,
fontWeight: '600',
color: '#666',
},
copyButton: {
marginTop: 12,
paddingVertical: 12,
paddingHorizontal: 18,
borderRadius: 10,
backgroundColor: '#f2f2f2',
alignSelf: 'flex-start',
},

copyButtonText: {
fontSize: 15,
fontWeight: '600',
},
statusButton: {
marginTop: 16,
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

  client: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '600',
  },

  status: {
    marginTop: 6,
    opacity: 0.6,
  },

  sectionTitle: {
    marginTop: 32,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
  },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },

  itemDetails: {
    marginTop: 4,
    opacity: 0.6,
  },

  itemTotal: {
    fontWeight: '600',
  },

  totalBlock: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    marginBottom: 6,
    opacity: 0.7,
    },

    totalRight: {
    alignItems: 'flex-end',
    },

  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },

  total: {
    fontSize: 22,
    fontWeight: '700',
  },
});