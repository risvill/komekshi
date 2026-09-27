import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAuth } from '@/context/AuthContext';

import { getClients } from '@/services/clientsService';
import { Client } from '@/types/client';

import { getProducts } from '@/services/productsService';
import { Product } from '@/types/product';

import {
  createOrder,
} from '@/services/ordersService';

import { OrderItem } from '@/types/orderItem';

export default function NewOrder() {
  const { token } = useAuth();

  const { clientId } = useLocalSearchParams<{
    clientId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<
    string | undefined
  >();

  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const [items, setItems] = useState<OrderItem[]>([]);

const [orderDate, setOrderDate] = useState('');
const [orderTime, setOrderTime] = useState('');

const [discountType, setDiscountType] = useState<
  'PERCENT' | 'FIXED' | null
>(null);

const [discountValue, setDiscountValue] =
  useState('');

const [showDatePicker, setShowDatePicker] =
  useState(false);

const [showTimePicker, setShowTimePicker] =
  useState(false);

  const loadData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const clientsData = await getClients(token);
      const productsData = await getProducts(token);

      setClients(clientsData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить данные'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [token])
  );

  useEffect(() => {
    if (!clientId || clients.length === 0) {
        return;
    }

    const clientExists = clients.some(
        (client) => client.id === clientId
    );

    if (clientExists) {
        setSelectedClientId(clientId);
    }
    }, [clientId, clients]);

  const addProductToOrder = (product: Product) => {
    setItems((current) => {
      const existingItem = current.find(
        (item) => item.product_id === product.id
      );

      if (existingItem) {
        return current.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          price: Number(product.price),
          unit: product.unit,
        },
      ];
    });
  };

  const changeItemQuantity = (
    productId: string,
    change: number
    ) => {
    setItems((current) =>
        current
        .map((item) => {
            if (item.product_id !== productId) {
            return item;
            }

            const newQuantity =
            item.quantity + change;

            return {
            ...item,
            quantity: newQuantity,
            };
        })
        .filter((item) => item.quantity > 0)
    );
    };

  const removeProductFromOrder = (productId: string) => {
    setItems((current) =>
      current.filter(
        (item) => item.product_id !== productId
      )
    );
  };

  const orderTotal = items.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  const discountAmount =
    discountType === 'PERCENT'
      ? orderTotal *
        (Number(discountValue) / 100)
      : discountType === 'FIXED'
        ? Number(discountValue)
        : 0;

  const finalTotal = Math.max(
    0,
    orderTotal - discountAmount
  );

  const handleCreateOrder = async () => {
    if (!token) {
      return;
    }

    if (!orderTotal || orderTotal <= 0) {
      Alert.alert(
        'Ошибка',
        'Добавьте хотя бы один товар'
      );
      return;
    }

    try {
      setCreating(true);

      const newOrder = await createOrder(token, {
        client_id: selectedClientId,

        order_date: orderDate || undefined,
        order_time: orderTime || undefined,
        discount_type:
          discountType || undefined,
        discount_value:
          discountType
            ? Number(discountValue) || 0
            : undefined,
        items: items.map((item) => ({
          product_id: item.product_id ?? undefined,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
        })),
      });

      console.log('created order:', newOrder);

      Alert.alert(
        'Готово',
        'Заказ создан',
        [
          {
            text: 'Открыть заказ',
            onPress: () =>
              router.replace({
                pathname: '/order-details',
                params: {
                  id: newOrder.id,
                },
              }),
          },
        ]
      );
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Ошибка',
        'Не удалось создать заказ'
      );
    } finally {
      setCreating(false);
    }
  };

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
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.backButton}>
            ←
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Новый заказ
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>
          Клиент
        </Text>

        <Pressable
          style={styles.clientSelector}
          onPress={() =>
            setClientPickerOpen(
              !clientPickerOpen
            )
          }
        >
          <Text>
            {selectedClientId
              ? clients.find(
                  (client) =>
                    client.id ===
                    selectedClientId
                )?.name
              : 'Без клиента'}
          </Text>

          <Text>⌄</Text>
        </Pressable>

        {clientPickerOpen && (
          <View style={styles.clientPicker}>
            <Pressable
              style={styles.clientOption}
              onPress={() => {
                setSelectedClientId(undefined);
                setClientPickerOpen(false);
              }}
            >
              <Text>
                Без клиента
              </Text>
            </Pressable>

            {clients.map((client) => (
              <Pressable
                key={client.id}
                style={styles.clientOption}
                onPress={() => {
                  setSelectedClientId(
                    client.id
                  );

                  setClientPickerOpen(false);
                }}
              >
                <Text>
                  {client.name}
                </Text>
              </Pressable>
            ))}

            <Pressable
            style={styles.createClientOption}
            onPress={() => {
                setClientPickerOpen(false);

                router.push({
                pathname: '/new-client',
                params: {
                    fromOrder: 'true',
                },
                });
            }}
            >
            <Text>
                + Создать клиента
            </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>
            Товары
        </Text>

        {products.map((product) => (
          <Pressable
            key={product.id}
            style={styles.productOption}
            onPress={() =>
              addProductToOrder(product)
            }
          >
            <Text style={styles.productName}>
              {product.name}
            </Text>

            <Text style={styles.productPrice}>
              {product.price} ₸ /{' '}
              {product.unit === 'piece'
                ? 'шт.'
                : 'порция'}
            </Text>
          </Pressable>
        ))}

        {items.length > 0 && (
          <View style={styles.items}>
            <Text style={styles.label}>
              В заказе
            </Text>

            {items.map((item) => (
              <View key={item.product_id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                    {item.name}
                    </Text>

                    <Text style={styles.itemDetails}>
                    {item.price} ₸ /{' '}
                    {item.unit === 'piece'
                        ? 'шт.'
                        : 'порция'}
                    </Text>
                </View>

                <View style={styles.quantityControls}>
                    <Pressable
                    style={styles.quantityButton}
                    onPress={() =>
                        changeItemQuantity(
                        item.product_id!,
                        -1
                        )
                    }
                    >
                    <Text style={styles.quantityButtonText}>
                        −
                    </Text>
                    </Pressable>

                    <Text style={styles.quantity}>
                    {item.quantity}
                    </Text>

                    <Pressable
                    style={styles.quantityButton}
                    onPress={() =>
                        changeItemQuantity(
                        item.product_id!,
                        1
                        )
                    }
                    >
                    <Text style={styles.quantityButtonText}>
                        +
                    </Text>
                    </Pressable>
                </View>
                </View>
            ))}

          </View>

        )}

        <Text style={styles.label}>
          Дата заказа
        </Text>

        <Pressable
        style={styles.dateInput}
        onPress={() => setShowDatePicker(true)}
        >
        <Text>
            {orderDate || 'Выберите дату'}
        </Text>
        </Pressable>

        {showDatePicker && (
        <DateTimePicker
            value={
            orderDate
                ? new Date(orderDate)
                : new Date()
            }
            mode="date"
            display="spinner"
            onChange={(event, date) => {
            setShowDatePicker(false);

            if (!date) {
                return;
            }

            const year = date.getFullYear();
            const month = String(
                date.getMonth() + 1
            ).padStart(2, '0');
            const day = String(
                date.getDate()
            ).padStart(2, '0');

            setOrderDate(
                `${year}-${month}-${day}`
            );
            }}
        />
        )}

        <Text style={styles.label}>
          Время
        </Text>

        <Pressable
        style={styles.dateInput}
        onPress={() => setShowTimePicker(true)}
        >
        <Text>
            {orderTime || 'Выберите время'}
        </Text>
        </Pressable>

        {showTimePicker && (
        <DateTimePicker
            value={new Date()}
            mode="time"
            display="spinner"
            onChange={(event, date) => {
            setShowTimePicker(false);

            if (!date) {
                return;
            }

            const hours = String(
                date.getHours()
            ).padStart(2, '0');

            const minutes = String(
                date.getMinutes()
            ).padStart(2, '0');

            setOrderTime(
                `${hours}:${minutes}`
            );
            }}
        />
        )}

        <Text style={styles.label}>
          Скидка
        </Text>

        <View style={styles.discountTypes}>
          <Pressable
            style={[
              styles.discountTypeButton,
              discountType === null &&
                styles.discountTypeButtonActive,
            ]}
            onPress={() => {
              setDiscountType(null);
              setDiscountValue('');
            }}
          >
            <Text
              style={[
                styles.discountTypeText,
                discountType === null &&
                  styles.discountTypeTextActive,
              ]}
            >
              Нет
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.discountTypeButton,
              discountType === 'PERCENT' &&
                styles.discountTypeButtonActive,
            ]}
            onPress={() =>
              setDiscountType('PERCENT')
            }
          >
            <Text
              style={[
                styles.discountTypeText,
                discountType === 'PERCENT' &&
                  styles.discountTypeTextActive,
              ]}
            >
              %
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.discountTypeButton,
              discountType === 'FIXED' &&
                styles.discountTypeButtonActive,
            ]}
            onPress={() =>
              setDiscountType('FIXED')
            }
          >
            <Text
              style={[
                styles.discountTypeText,
                discountType === 'FIXED' &&
                  styles.discountTypeTextActive,
              ]}
            >
              ₸
            </Text>
          </Pressable>
        </View>

        {discountType !== null && (
          <View style={styles.discountInputRow}>
            <TextInput
              style={styles.discountInput}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="numeric"
              placeholder={
                discountType === 'PERCENT'
                  ? 'Например, 10'
                  : 'Например, 2000'
              }
            />

            <Text style={styles.discountSuffix}>
              {discountType === 'PERCENT'
                ? '%'
                : '₸'}
            </Text>
          </View>
        )}

        <View style={styles.totalBlock}>
          <View style={styles.totalRow}>
            <Text>Сумма</Text>

            <Text>
              {orderTotal} ₸
            </Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>Скидка</Text>

              <Text>
                −{discountAmount} ₸
              </Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.finalTotalLabel}>
              Итого
            </Text>

            <Text style={styles.finalTotal}>
              {finalTotal} ₸
            </Text>
          </View>
        </View>

        <Pressable
          style={[
            styles.button,
            creating &&
              styles.buttonDisabled,
          ]}
          onPress={handleCreateOrder}
          disabled={creating}
        >
          <Text style={styles.buttonText}>
            {creating
              ? 'Создаём...'
              : 'Создать заказ'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },

  itemInfo: {
    flex: 1,
    marginRight: 12,
    },

    quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    },

    quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
    },

    quantityButtonText: {
    fontSize: 22,
    lineHeight: 24,
    },

    quantity: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    fontSize: 28,
  },

  headerSpacer: {
    width: 28,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
  },

  form: {
    marginTop: 24,
  },

  label: {
    marginBottom: 8,
    fontWeight: '600',
  },

  clientSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },

  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  clientPicker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },

  clientOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  createClientOption: {
    padding: 14,
  },

  productOption: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 8,
  },

  productName: {
    fontSize: 16,
    fontWeight: '600',
  },

  productPrice: {
    marginTop: 4,
    opacity: 0.6,
  },

  items: {
    marginTop: 16,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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

  removeText: {
    color: '#d33',
  },

  discountTypes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  discountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
  },

  discountTypeButtonActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },

  discountTypeText: {
    fontSize: 16,
    fontWeight: '600',
  },

  discountTypeTextActive: {
    color: '#fff',
  },

  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },

  discountSuffix: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },

  totalBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },

  finalTotal: {
    fontSize: 20,
    fontWeight: '700',
  },

  button: {
    marginTop: 24,
    backgroundColor: '#208AEF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});