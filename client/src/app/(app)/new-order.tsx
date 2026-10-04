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
  consumeSelectedClient,
  consumeSelectedProducts,
} from '@/services/orderSelection';

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

import { createOrder } from '@/services/ordersService';

import { OrderItem } from '@/types/orderItem';

function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');

  let normalized = digits;

  if (normalized.startsWith('8')) {
    normalized = '7' + normalized.slice(1);
  }

  if (normalized.startsWith('7')) {
    normalized = normalized.slice(1);
  }

  if (normalized.length !== 10) {
    return phone;
  }

  return `+7 ${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 8)} ${normalized.slice(8, 10)}`;
}

export default function NewOrder() {
  const { token } = useAuth();

  const { clientId } = useLocalSearchParams<{
    clientId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedClientId, setSelectedClientId] =
    useState<string | undefined>();

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

      const selectedClient =
        consumeSelectedClient();

      if (selectedClient !== undefined) {
        setSelectedClientId(selectedClient);
      }

      const selectedProducts =
        consumeSelectedProducts();

      if (selectedProducts.length > 0) {
        setItems((currentItems) => {
          const existingIds = new Set(
            currentItems.map(
              (item) => item.product_id
            )
          );

          const newItems =
            selectedProducts
              .filter(
                (product) =>
                  !existingIds.has(product.id)
              )
              .map((product) => ({
                product_id: product.id,
                name: product.name,
                quantity: 1,
                price: Number(product.price),
                unit: product.unit,
              }));

          return [
            ...currentItems,
            ...newItems,
          ];
        });
      }
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

  const selectedClient = clients.find(
    (client) =>
      client.id === selectedClientId
  );

  const changeItemQuantity = (
    productId: string,
    change: number
  ) => {
    setItems((current) =>
      current
        .map((item) => {
          if (
            item.product_id !== productId
          ) {
            return item;
          }

          const newQuantity =
            item.quantity + change;

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter(
          (item) => item.quantity > 0
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

      const newOrder = await createOrder(
        token,
        {
          client_id: selectedClientId,

          order_date:
            orderDate || undefined,

          order_time:
            orderTime || undefined,

          discount_type:
            discountType || undefined,

          discount_value:
            discountType
              ? Number(discountValue) || 0
              : undefined,

          items: items.map((item) => ({
            product_id:
              item.product_id ?? undefined,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
          })),
        }
      );

      console.log(
        'created order:',
        newOrder
      );

      Alert.alert(
        'Готово',
        'Заказ создан',
        [
          {
            text: 'Открыть заказ',
            onPress: () =>
              router.replace({
                pathname:
                  '/order-details',
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.replace('/orders')
          }
          hitSlop={8}
          style={styles.backButtonContainer}
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

        {/* КЛИЕНТ */}

        <Text style={styles.sectionLabel}>
  КЛИЕНТ
</Text>

<Pressable
  style={styles.selector}
  onPress={() =>
    router.push({
      pathname: '/select-client',
      params: {
        selectedClientId:
          selectedClientId || '',
      },
    })
  }
>
  <View style={styles.selectorContent}>
    <Text
      style={[
        styles.selectorText,
        !selectedClient &&
          styles.placeholderText,
      ]}
    >
      {selectedClient
        ? selectedClient.name
        : 'Выберите клиента'}
    </Text>

    {selectedClient?.phone && (
      <Text style={styles.selectorSubtext}>
        {formatPhoneNumber(selectedClient.phone)}
      </Text>
    )}
  </View>

  <Text style={styles.chevron}>
    ›
  </Text>
</Pressable>

        {/* ТОВАРЫ */}

        <Text
          style={[
            styles.sectionLabel,
            styles.productsSectionLabel,
          ]}
        >
          ТОВАРЫ
        </Text>

        <Pressable
          style={styles.addProductsButton}
          onPress={() =>
            router.push({
              pathname: '/select-product',
              params: {
                selectedProductIds:
                  items
                    .map(
                      (item) =>
                        item.product_id
                    )
                    .join(','),
              },
            })
          }
        >
          <View
            style={styles.addProductsIcon}
          >
            <Text
              style={styles.addProductsIconText}
            >
              +
            </Text>
          </View>

          <View
            style={styles.addProductsContent}
          >
            <Text
              style={styles.addProductsTitle}
            >
              Добавить товары
            </Text>

            <Text
              style={styles.addProductsSubtitle}
            >
              {items.length > 0
                ? `${items.length} ${
                    items.length === 1
                      ? 'товар'
                      : items.length < 5
                        ? 'товара'
                        : 'товаров'
                  } в заказе`
                : 'Выберите товары для заказа'}
            </Text>
          </View>

          <Text style={styles.chevron}>
            ›
          </Text>
        </Pressable>

        {/* В ЗАКАЗЕ */}

        {items.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionLabel}>
              В ЗАКАЗЕ
            </Text>

            <View
              style={styles.selectedItemsCard}
            >
              {items.map(
                (item, index) => (
                  <View
                    key={item.product_id}
                    style={[
                      styles.itemRow,
                      index ===
                        items.length - 1 &&
                        styles.itemRowLast,
                    ]}
                  >
                    <View
                      style={styles.itemInfo}
                    >
                      <Text
                        style={styles.itemName}
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={
                          styles.itemDetails
                        }
                      >
                        {item.price} ₸ /{' '}
                        {item.unit ===
                        'piece'
                          ? 'шт.'
                          : 'порция'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.quantityControls
                      }
                    >
                      <Pressable
                        style={
                          styles.quantityButton
                        }
                        onPress={() =>
                          changeItemQuantity(
                            item.product_id!,
                            -1
                          )
                        }
                      >
                        <Text
                          style={
                            styles.quantityButtonText
                          }
                        >
                          −
                        </Text>
                      </Pressable>

                      <Text
                        style={styles.quantity}
                      >
                        {item.quantity}
                      </Text>

                      <Pressable
                        style={
                          styles.quantityButton
                        }
                        onPress={() =>
                          changeItemQuantity(
                            item.product_id!,
                            1
                          )
                        }
                      >
                        <Text
                          style={
                            styles.quantityButtonText
                          }
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )
              )}
            </View>
          </View>
        )}

        {/* ДАТА И ВРЕМЯ */}

        <View
          style={styles.dateTimeSection}
        >
          <View style={styles.dateTimeColumn}>
            <Text style={styles.sectionLabel}>
              ДАТА
            </Text>

            <Pressable
              style={styles.dateTimeButton}
              onPress={() =>
                setShowDatePicker(true)
              }
            >
              <Text
                style={[
                  styles.dateTimeText,
                  !orderDate &&
                    styles.placeholderText,
                ]}
              >
                {orderDate ||
                  'Выберите дату'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.dateTimeColumn}>
            <Text style={styles.sectionLabel}>
              ВРЕМЯ
            </Text>

            <Pressable
              style={styles.dateTimeButton}
              onPress={() =>
                setShowTimePicker(true)
              }
            >
              <Text
                style={[
                  styles.dateTimeText,
                  !orderTime &&
                    styles.placeholderText,
                ]}
              >
                {orderTime ||
                  'Выберите время'}
              </Text>
            </Pressable>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={
              orderDate
                ? new Date(
                    `${orderDate}T00:00:00`
                  )
                : new Date()
            }
            mode="date"
            display="spinner"
            onChange={(event, date) => {
              setShowDatePicker(false);

              if (!date) {
                return;
              }

              const year =
                date.getFullYear();

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

        {/* СКИДКА */}

        <Text
          style={[
            styles.sectionLabel,
            styles.discountSectionLabel,
          ]}
        >
          СКИДКА
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
          <View
            style={styles.discountInputContainer}
          >
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
              placeholderTextColor="#999999"
            />

            <Text
              style={styles.discountSuffix}
            >
              {discountType === 'PERCENT'
                ? '%'
                : '₸'}
            </Text>
          </View>
        )}

        {/* ИТОГО */}

        <View style={styles.totalCard}>
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Сумма товаров
              </Text>

              <Text style={styles.totalValue}>
                {orderTotal} ₸
              </Text>
            </View>
          )}

          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Скидка
              </Text>

              <Text
                style={styles.discountValueText}
              >
                −{discountAmount} ₸
              </Text>
            </View>
          )}

          <View
            style={[
              styles.totalRow,
              discountAmount > 0 &&
                styles.finalTotalRow,
            ]}
          >
            <Text
              style={styles.finalTotalLabel}
            >
              Итого
            </Text>

            <Text
              style={styles.finalTotalValue}
            >
              {finalTotal} ₸
            </Text>
          </View>
        </View>

        {/* СОЗДАТЬ */}

        <Pressable
          style={[
            styles.createButton,
            creating &&
              styles.createButtonDisabled,
          ]}
          onPress={handleCreateOrder}
          disabled={creating}
        >
          <Text style={styles.createButtonText}>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButtonContainer: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backButton: {
    fontSize: 20,
    lineHeight: 30,
    color: '#111111',
  },

  headerSpacer: {
    width: 32,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },

  form: {
    marginTop: 28,
  },

  sectionLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#777777',
  },

  selector: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectorContent: {
    flex: 1,
    marginRight: 12,
  },

  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  selectorSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#888888',
  },

  placeholderText: {
    color: '#999999',
    fontWeight: '500',
  },

  chevron: {
    fontSize: 28,
    lineHeight: 30,
    color: '#777777',
    fontWeight: '300',
  },

  productsSectionLabel: {
    marginTop: 20,
  },

  addProductsButton: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  addProductsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addProductsIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '300',
  },

  addProductsContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  addProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  addProductsSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#888888',
  },

  selectedSection: {
    marginTop: 20,
  },

  selectedItemsCard: {
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  itemRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },

  itemRowLast: {
    borderBottomWidth: 0,
  },

  itemInfo: {
    flex: 1,
    marginRight: 12,
  },

  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  itemDetails: {
    marginTop: 4,
    fontSize: 13,
    color: '#888888',
  },

  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    fontSize: 21,
    lineHeight: 24,
    color: '#111111',
  },

  quantity: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  dateTimeSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  dateTimeColumn: {
    flex: 1,
  },

  dateTimeButton: {
    minHeight: 52,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  dateTimeText: {
    fontSize: 15,
    color: '#111111',
  },

  discountSectionLabel: {
    marginTop: 20,
  },

  discountTypes: {
    flexDirection: 'row',
    gap: 8,
  },

  discountTypeButton: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  discountTypeButtonActive: {
    backgroundColor: '#111111',
  },

  discountTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },

  discountTypeTextActive: {
    color: '#FFFFFF',
  },

  discountInputContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  discountInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    fontSize: 16,
    color: '#111111',
  },

  discountSuffix: {
    width: 36,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
    textAlign: 'center',
  },

  totalCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  finalTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E2E2',
  },

  totalLabel: {
    fontSize: 14,
    color: '#777777',
  },

  totalValue: {
    fontSize: 14,
    color: '#555555',
  },

  discountValueText: {
    fontSize: 14,
    color: '#A33A3A',
  },

  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },

  finalTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },

  createButton: {
    marginTop: 16,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});