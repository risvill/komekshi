import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import * as Clipboard from 'expo-clipboard';

import { useAuth } from '@/context/AuthContext';

import {
  getOrders,
  updateOrderStatus,
  getTasksForOrder,
} from '@/services/ordersService';

import { Order } from '@/types/order';
import { Task } from '@/types/task';

import {
  Account,
  AccountType,
  createAccount,
  getAccounts,
} from '@/services/accountsService';

import {
  createPayment,
  getPaymentsForOrder,
  Payment,
} from '@/services/paymentsService';

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
        background: '#EAEAEA',
        text: '#555555',
      };

    case 'ACCEPTED':
      return {
        background: '#E8F1FA',
        text: '#286090',
      };

    case 'IN_PROGRESS':
      return {
        background: '#E8F1FA',
        text: '#286090',
      };

    case 'AWAITING_PICKUP':
      return {
        background: '#F4EFE2',
        text: '#806A2F',
      };

    case 'COMPLETED':
      return {
        background: '#E8F3EC',
        text: '#287044',
      };

    case 'CANCELLED':
      return {
        background: '#F3E8E8',
        text: '#A33A3A',
      };

    default:
      return {
        background: '#EAEAEA',
        text: '#555555',
      };
  }
}

function formatOrderDate(
  date: string | null | undefined
) {
  if (!date) {
    return '';
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
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
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );

  if (
    targetDay.getTime() ===
    today.getTime()
  ) {
    return 'Сегодня';
  }

  if (
    targetDay.getTime() ===
    tomorrow.getTime()
  ) {
    return 'Завтра';
  }

  return parsedDate.toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
    }
  );
}

function formatOrderTime(
  time: string | null | undefined
) {
  if (!time) {
    return '';
  }

  const parsedDate = new Date(
    `1970-01-01T${time}`
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return time;
  }

  return parsedDate.toLocaleTimeString(
    'ru-RU',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function formatPaymentDate(
  date: string
) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );
}

function formatMoney(
  value: number | string | null | undefined
) {
  return Number(value ?? 0).toLocaleString(
    'ru-RU'
  );
}

function getTaskStatusLabel(
  status: string
) {
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

function getTaskStatusColors(
  status: string
) {
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

export default function OrderDetails() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const { token } = useAuth();

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [paymentModalVisible, setPaymentModalVisible] =
    useState(false);

  const [accountModalVisible, setAccountModalVisible] =
    useState(false);

  const [paymentAmount, setPaymentAmount] =
    useState('');

  const [selectedAccountId, setSelectedAccountId] =
    useState<string | null>(null);

  const [accountName, setAccountName] =
    useState('');

  const [accountType, setAccountType] =
    useState<AccountType>('KASPI');

  const [savingPayment, setSavingPayment] =
    useState(false);

  const [savingAccount, setSavingAccount] =
    useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!token || !id) {
        return;
      }

      try {
        setLoading(true);

        const orders =
          await getOrders(token);

        const foundOrder =
          orders.find(
            (item) => item.id === id
          );

        setOrder(
          foundOrder ?? null
        );

        const orderTasks =
          await getTasksForOrder(
            token,
            id
          );

        setTasks(orderTasks);

        const orderPayments =
          await getPaymentsForOrder(
            token,
            id
          );

        setPayments(
          orderPayments
        );

        const userAccounts =
          await getAccounts(token);

        setAccounts(
          userAccounts
        );
      } catch (error) {
        console.error(
          'Failed to load order:',
          error
        );

        Alert.alert(
          'Ошибка',
          'Не удалось загрузить заказ'
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [token, id]);

  const handleStatusChange =
    async (status: string) => {
      if (
        !token ||
        !order ||
        updatingStatus
      ) {
        return;
      }

      try {
        setUpdatingStatus(true);

        const updatedOrder =
          await updateOrderStatus(
            token,
            order.id,
            status
          );

        setOrder({
          ...order,
          ...updatedOrder,
        });
      } catch (error) {
        console.error(
          'Failed to update order status:',
          error
        );

        Alert.alert(
          'Ошибка',
          'Не удалось изменить статус заказа'
        );
      } finally {
        setUpdatingStatus(false);
      }
    };

  const handleCopyOffer =
    async () => {
      if (!order) {
        return;
      }

      const itemsText =
        order.items
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
        (order.client_name ||
          'клиента') +
        '\n\n' +
        itemsText +
        '\n\nИтого: ' +
        order.total +
        ' ₸';

      await Clipboard.setStringAsync(
        offerText
      );

      Alert.alert(
        'Готово',
        'Предложение скопировано'
      );
    };

  const totalAmount =
    Number(order?.total || 0);

  const paidAmount =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount),
      0
    );

  const remainingAmount =
    Math.max(
      totalAmount -
        paidAmount,
      0
    );

  const openPaymentModal =
    () => {
      setPaymentAmount('');

      setSelectedAccountId(
        accounts.length > 0
          ? accounts[0].id
          : null
      );

      setPaymentModalVisible(
        true
      );
    };

  const handleCreatePayment =
    async () => {
      if (
        !token ||
        !order ||
        savingPayment
      ) {
        return;
      }

      if (!selectedAccountId) {
        Alert.alert(
          'Выберите счёт',
          'Укажите, на какой счёт поступили деньги'
        );

        return;
      }

      const amount =
        Number(
          paymentAmount.replace(
            ',',
            '.'
          )
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        Alert.alert(
          'Ошибка',
          'Введите корректную сумму'
        );

        return;
      }

      try {
        setSavingPayment(
          true
        );

        const newPayment =
          await createPayment(
            token,
            order.id,
            {
              account_id:
                selectedAccountId,
              amount,
            }
          );

        setPayments(
          (current) => [
            newPayment,
            ...current,
          ]
        );

        setPaymentAmount('');

        setPaymentModalVisible(
          false
        );
      } catch (error) {
        console.error(
          'Failed to create payment:',
          error
        );

        Alert.alert(
          'Ошибка',
          'Не удалось добавить оплату'
        );
      } finally {
        setSavingPayment(
          false
        );
      }
    };

  const handleCreateAccount =
    async () => {
      if (
        !token ||
        savingAccount
      ) {
        return;
      }

      if (!accountName.trim()) {
        Alert.alert(
          'Ошибка',
          'Введите название счёта'
        );

        return;
      }

      try {
        setSavingAccount(
          true
        );

        const newAccount =
          await createAccount(
            token,
            {
              name:
                accountName.trim(),
              type: accountType,
            }
          );

        setAccounts(
          (current) => [
            ...current,
            newAccount,
          ]
        );

        setSelectedAccountId(
          newAccount.id
        );

        setAccountName('');

        setAccountType(
          'KASPI'
        );

        setAccountModalVisible(
          false
        );
      } catch (error) {
        console.error(
          'Failed to create account:',
          error
        );

        Alert.alert(
          'Ошибка',
          'Не удалось создать счёт'
        );
      } finally {
        setSavingAccount(
          false
        );
      }
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
        <Text
          style={
            styles.notFoundTitle
          }
        >
          Заказ не найден
        </Text>

        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.replace(
              '/orders'
            )
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ← Вернуться к заказам
          </Text>
        </Pressable>
      </View>
    );
  }

  const statusColors =
    getStatusColors(
      order.status
    );

  const orderDate =
    formatOrderDate(
      order.order_date
    );

  const orderTime =
    formatOrderTime(
      order.order_time
    );

  const hasAdditionalInfo =
    Boolean(
      orderDate ||
      order.address ||
      order.wishes
    );

  const hasDiscount =
    Boolean(
      order.discount_type &&
      order.discount_value
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <Pressable
        style={styles.backButton}
        onPress={() =>
          router.replace(
            '/orders'
          )
        }
      >
        <Text
          style={
            styles.backButtonText
          }
        >
          ←
        </Text>
      </Pressable>

      {/* HEADER */}

      <View style={styles.header}>
        <View
          style={
            styles.headerMain
          }
        >
          <View
            style={
              styles.orderHeaderRow
            }
          >
            <Text
              style={
                styles.pageLabel
              }
            >
              ЗАКАЗ #{order.id.slice(0, 8)}
            </Text>

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
                    color:
                      statusColors.text,
                  },
                ]}
              >
                {getStatusLabel(
                  order.status
                )}
              </Text>
            </View>
          </View>

          <Text
            style={styles.client}
          >
            {order.client_name ||
              'Без клиента'}
          </Text>
        </View>
      </View>

      {/* ADDITIONAL INFORMATION */}

      <View
        style={
          styles.additionalInfoSection
        }
      >

        {!hasAdditionalInfo ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyCardText
              }
            >
              Дополнительная информация
              отсутствует
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.infoCard
            }
          >
            <Text
              style={
                styles.additionalInfoTitle
              }
            >
              Дополнительная информация:
            </Text>

            {orderDate && (
              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  ДАТА И ВРЕМЯ
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {orderDate}
                  {orderTime
                    ? `, ${orderTime}`
                    : ''}
                </Text>
              </View>
            )}

            {order.address && (
              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  АДРЕС
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {order.address}
                </Text>
              </View>
            )}

            {order.wishes && (
              <View
                style={
                  styles.infoRowLast
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  ПОЖЕЛАНИЯ
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {order.wishes}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ACTIONS */}

      <View
        style={
          styles.actionRow
        }
      >
        {order.status === 'DRAFT' && (
          <Pressable
            style={[
              styles.primaryActionButton,
              updatingStatus &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              void handleStatusChange(
                'ACCEPTED'
              )
            }
            disabled={
              updatingStatus
            }
          >
            <Text
              style={
                styles.primaryActionText
              }
            >
              {updatingStatus
                ? 'Сохранение...'
                : 'Принять заказ'}
            </Text>
          </Pressable>
        )}

        {order.status === 'ACCEPTED' && (
          <Pressable
            style={[
              styles.primaryActionButton,
              updatingStatus &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              void handleStatusChange(
                'IN_PROGRESS'
              )
            }
            disabled={
              updatingStatus
            }
          >
            <Text
              style={
                styles.primaryActionText
              }
            >
              {updatingStatus
                ? 'Сохранение...'
                : 'Начать выполнение'}
            </Text>
          </Pressable>
        )}

        {order.status === 'IN_PROGRESS' && (
          <Pressable
            style={[
              styles.primaryActionButton,
              updatingStatus &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              void handleStatusChange(
                'AWAITING_PICKUP'
              )
            }
            disabled={
              updatingStatus
            }
          >
            <Text
              style={
                styles.primaryActionText
              }
            >
              {updatingStatus
                ? 'Сохранение...'
                : 'Заказ готов'}
            </Text>
          </Pressable>
        )}

        {order.status === 'AWAITING_PICKUP' && (
          <Pressable
            style={[
              styles.primaryActionButton,
              updatingStatus &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              void handleStatusChange(
                'COMPLETED'
              )
            }
            disabled={
              updatingStatus
            }
          >
            <Text
              style={
                styles.primaryActionText
              }
            >
              {updatingStatus
                ? 'Сохранение...'
                : 'Завершить заказ'}
            </Text>
          </Pressable>
        )}

        {(order.status === 'COMPLETED' ||
          order.status === 'CANCELLED') && (
          <View
            style={
              styles.finishedStatusButton
            }
          >
            <Text
              style={
                styles.finishedStatusButtonText
              }
            >
              {order.status ===
              'COMPLETED'
                ? 'Заказ завершён'
                : 'Заказ отменён'}
            </Text>
          </View>
        )}

        {order.status !== 'COMPLETED' &&
          order.status !== 'CANCELLED' && (
            <Pressable
              style={[
                styles.cancelButton,
                updatingStatus &&
                  styles.buttonDisabled,
              ]}
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
                      onPress: () =>
                        void handleStatusChange(
                          'CANCELLED'
                        ),
                    },
                  ]
                );
              }}
              disabled={
                updatingStatus
              }
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Отменить
              </Text>
            </Pressable>
          )}
      </View>

      {/* TASKS */}

      <View
        style={
          styles.section
        }
      >
        <Text
          style={
            styles.sectionHeader
          }
        >
          СВЯЗАННЫЕ ЗАДАЧИ
        </Text>

        {tasks.length === 0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyCardTitle
              }
            >
              Нет связанных задач
            </Text>

            <Text
              style={
                styles.emptyCardText
              }
            >
              Для этого заказа пока
              нет задач.
            </Text>
          </View>
        ) : (
          tasks.map((task) => {
            const taskColors =
              getTaskStatusColors(
                task.status
              );

            return (
              <Pressable
                key={task.id}
                style={
                  styles.taskCard
                }
                onPress={() =>
                  router.push({
                    pathname:
                      '/task-details',
                    params: {
                      id: task.id,
                    },
                  })
                }
              >
                <View
                  style={
                    styles.taskCardMain
                  }
                >
                  <Text
                    style={
                      styles.taskTitle
                    }
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>

                  {task.deadline && (
                    <Text
                      style={
                        styles.taskDeadline
                      }
                    >
                      Срок:{' '}
                      {new Date(
                        task.deadline
                      ).toLocaleString(
                        'ru-RU',
                        {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.taskBadge,
                    {
                      backgroundColor:
                        taskColors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.taskBadgeText,
                      {
                        color:
                          taskColors.text,
                      },
                    ]}
                  >
                    {getTaskStatusLabel(
                      task.status
                    )}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {/* PRODUCTS */}

      <View
        style={
          styles.section
        }
      >
        <Text
          style={
            styles.sectionHeader
          }
        >
          ТОВАРЫ
        </Text>

        <View
          style={
            styles.itemsCard
          }
        >
          {order.items.map(
            (item, index) => (
              <View
                key={item.id}
                style={[
                  styles.item,
                  index ===
                    order.items.length - 1 &&
                    styles.itemLast,
                ]}
              >
                <View
                  style={
                    styles.itemMain
                  }
                >
                  <Text
                    style={
                      styles.itemName
                    }
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={
                      styles.itemDetails
                    }
                  >
                    {item.quantity} ×{' '}
                    {formatMoney(
                      item.price
                    )}{' '}
                    ₸
                  </Text>
                </View>

                <Text
                  style={
                    styles.itemTotal
                  }
                >
                  {formatMoney(
                    Number(item.quantity) *
                      Number(item.price)
                  )}{' '}
                  ₸
                </Text>
              </View>
            )
          )}
        </View>

        {/* TOTAL */}

        <View
          style={
            styles.totalCard
          }
        >
          {hasDiscount && (
            <>
              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Сумма товаров
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {formatMoney(
                    order.subtotal
                  )}{' '}
                  ₸
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Скидка
                </Text>

                <Text
                  style={
                    styles.discountValue
                  }
                >
                  −
                  {order.discount_type ===
                  'PERCENT'
                    ? `${order.discount_value}%`
                    : `${formatMoney(
                        order.discount_value
                      )} ₸`}
                </Text>
              </View>

              <View
                style={
                  styles.totalDivider
                }
              />
            </>
          )}

          <View
            style={
              styles.summaryRow
            }
          >
            <Text
              style={
                styles.totalLabel
              }
            >
              Итого
            </Text>

            <Text
              style={
                styles.total
              }
            >
              {formatMoney(
                order.total
              )}{' '}
              ₸
            </Text>
          </View>
        </View>
      </View>

      {/* COPY OFFER */}

      <Pressable
        style={
          styles.copyButton
        }
        onPress={
          handleCopyOffer
        }
      >
        <Text
          style={
            styles.copyButtonText
          }
        >
          Скопировать предложение
        </Text>
      </Pressable>

      {/* PAYMENTS */}

      <View
        style={
          styles.section
        }
      >
        <Text
          style={
            styles.sectionHeader
          }
        >
          ОПЛАТА
        </Text>

        <View
          style={
            styles.paymentSummary
          }
        >
          <View
            style={
              styles.paymentSummaryItem
            }
          >
            <Text
              style={
                styles.paymentSummaryLabel
              }
            >
              Итого
            </Text>

            <Text
              style={
                styles.paymentSummaryValue
              }
            >
              {formatMoney(
                totalAmount
              )}{' '}
              ₸
            </Text>
          </View>

          <View
            style={
              styles.paymentSummaryItem
            }
          >
            <Text
              style={
                styles.paymentSummaryLabel
              }
            >
              Оплачено
            </Text>

            <Text
              style={
                styles.paymentSummaryValue
              }
            >
              {formatMoney(
                paidAmount
              )}{' '}
              ₸
            </Text>
          </View>

          <View
            style={
              styles.paymentSummaryItem
            }
          >
            <Text
              style={
                styles.paymentSummaryLabel
              }
            >
              Остаток
            </Text>

            <Text
              style={
                styles.paymentRemaining
              }
            >
              {formatMoney(
                remainingAmount
              )}{' '}
              ₸
            </Text>
          </View>
        </View>

        <Pressable
          style={
            styles.addPaymentButton
          }
          onPress={
            openPaymentModal
          }
        >
          <Text
            style={
              styles.addPaymentButtonText
            }
          >
            + Добавить оплату
          </Text>
        </Pressable>

        {payments.length === 0 ? (
          <View
            style={
              styles.emptyPaymentCard
            }
          >
            <Text
              style={
                styles.emptyPaymentText
              }
            >
              Платежей пока нет
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.paymentsList
            }
          >
            {payments.map(
              (payment) => (
                <View
                  key={
                    payment.id
                  }
                  style={
                    styles.paymentCard
                  }
                >
                  <View
                    style={
                      styles.paymentMain
                    }
                  >
                    <Text
                      style={
                        styles.paymentAmount
                      }
                    >
                      {formatMoney(
                        payment.amount
                      )}{' '}
                      ₸
                    </Text>

                    <Text
                      style={
                        styles.paymentAccount
                      }
                    >
                      {
                        payment.account_name
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.paymentDate
                    }
                  >
                    {formatPaymentDate(
                      payment.payment_date
                    )}
                  </Text>
                </View>
              )
            )}
          </View>
        )}
      </View>

      {/* PAYMENT MODAL */}

      <Modal
        visible={
          paymentModalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setPaymentModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContent
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              Добавить оплату
            </Text>

            <Text
              style={
                styles.modalLabel
              }
            >
              СУММА
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                paymentAmount
              }
              onChangeText={
                setPaymentAmount
              }
              placeholder="Например, 10000"
              placeholderTextColor="#999999"
              keyboardType="decimal-pad"
            />

            <Text
              style={
                styles.modalLabel
              }
            >
              СЧЁТ
            </Text>

            {accounts.length === 0 ? (
              <View>
                <View
                  style={
                    styles.noAccountsCard
                  }
                >
                  <Text
                    style={
                      styles.noAccountsTitle
                    }
                  >
                    Счетов пока нет
                  </Text>

                  <Text
                    style={
                      styles.noAccountsText
                    }
                  >
                    Создай счёт, чтобы
                    указать, куда поступила
                    оплата.
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.secondaryModalButton
                  }
                  onPress={() =>
                    setAccountModalVisible(
                      true
                    )
                  }
                >
                  <Text
                    style={
                      styles.secondaryModalButtonText
                    }
                  >
                    + Добавить счёт
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View>
                {accounts
                  .filter(
                    (account) =>
                      account.is_active
                  )
                  .map(
                    (account) => (
                      <Pressable
                        key={
                          account.id
                        }
                        style={[
                          styles.accountOption,
                          selectedAccountId ===
                            account.id &&
                            styles.accountOptionSelected,
                        ]}
                        onPress={() =>
                          setSelectedAccountId(
                            account.id
                          )
                        }
                      >
                        <View
                          style={
                            styles.accountOptionMain
                          }
                        >
                          <Text
                            style={
                              styles.accountOptionText
                            }
                          >
                            {
                              account.name
                            }
                          </Text>

                          <Text
                            style={
                              styles.accountTypeText
                            }
                          >
                            {account.type ===
                            'KASPI'
                              ? 'Kaspi'
                              : 'Наличные'}
                          </Text>
                        </View>

                        {selectedAccountId ===
                          account.id && (
                          <Text
                            style={
                              styles.selectedMark
                            }
                          >
                            ✓
                          </Text>
                        )}
                      </Pressable>
                    )
                  )}

                <Pressable
                  style={
                    styles.secondaryModalButton
                  }
                  onPress={() =>
                    setAccountModalVisible(
                      true
                    )
                  }
                >
                  <Text
                    style={
                      styles.secondaryModalButtonText
                    }
                  >
                    + Добавить другой счёт
                  </Text>
                </Pressable>
              </View>
            )}

            <View
              style={
                styles.modalButtons
              }
            >
              <Pressable
                style={
                  styles.modalCancelButton
                }
                onPress={() =>
                  setPaymentModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Отмена
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalSaveButton,
                  (savingPayment ||
                    accounts.length ===
                      0) &&
                    styles.buttonDisabled,
                ]}
                onPress={
                  handleCreatePayment
                }
                disabled={
                  savingPayment ||
                  accounts.length === 0
                }
              >
                <Text
                  style={
                    styles.modalSaveText
                  }
                >
                  {savingPayment
                    ? 'Сохранение...'
                    : 'Добавить'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ACCOUNT MODAL */}

      <Modal
        visible={
          accountModalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setAccountModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContent
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              Новый счёт
            </Text>

            <Text
              style={
                styles.modalLabel
              }
            >
              НАЗВАНИЕ
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                accountName
              }
              onChangeText={
                setAccountName
              }
              placeholder="Например, Kaspi мамы"
              placeholderTextColor="#999999"
            />

            <Text
              style={
                styles.modalLabel
              }
            >
              ТИП
            </Text>

            <View
              style={
                styles.accountTypeRow
              }
            >
              <Pressable
                style={[
                  styles.typeButton,
                  accountType ===
                    'KASPI' &&
                    styles.typeButtonSelected,
                ]}
                onPress={() =>
                  setAccountType(
                    'KASPI'
                  )
                }
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    accountType ===
                      'KASPI' &&
                      styles.typeButtonTextSelected,
                  ]}
                >
                  Kaspi
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeButton,
                  accountType ===
                    'CASH' &&
                    styles.typeButtonSelected,
                ]}
                onPress={() =>
                  setAccountType(
                    'CASH'
                  )
                }
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    accountType ===
                      'CASH' &&
                      styles.typeButtonTextSelected,
                  ]}
                >
                  Наличные
                </Text>
              </Pressable>
            </View>

            <View
              style={
                styles.modalButtons
              }
            >
              <Pressable
                style={
                  styles.modalCancelButton
                }
                onPress={() =>
                  setAccountModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Отмена
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalSaveButton,
                  savingAccount &&
                    styles.buttonDisabled,
                ]}
                onPress={
                  handleCreateAccount
                }
                disabled={
                  savingAccount
                }
              >
                <Text
                  style={
                    styles.modalSaveText
                  }
                >
                  {savingAccount
                    ? 'Сохранение...'
                    : 'Создать'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 15,
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
    marginBottom: 20,
  },

  headerMain: {
    width: '100%',
  },

  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  pageLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginRight: 12,
  },

  client: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: '#111111',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  additionalInfoSection: {
    marginBottom: 20,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  infoCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  additionalInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 16,
  },

  infoRow: {
    marginBottom: 16,
  },

  infoRowLast: {
    marginBottom: 0,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  infoValue: {
    fontSize: 15,
    lineHeight: 21,
    color: '#222222',
    fontWeight: '500',
  },

  emptyCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },

  emptyCardText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#777777',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 30,
  },

  primaryActionButton: {
    flex: 3,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  cancelButton: {
    flex: 2,
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F3E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: '#A33A3A',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  finishedStatusButton: {
    flex: 3,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  finishedStatusButtonText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  section: {
    marginBottom: 20,
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    marginBottom: 10,
  },

  taskCardMain: {
    flex: 1,
    paddingRight: 12,
  },

  taskTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: '#111111',
  },

  taskDeadline: {
    marginTop: 6,
    fontSize: 13,
    color: '#777777',
  },

  taskBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  taskBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  itemsCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    overflow: 'hidden',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  itemLast: {
    borderBottomWidth: 0,
  },

  itemMain: {
    flex: 1,
    paddingRight: 16,
  },

  itemName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#111111',
  },

  itemDetails: {
    marginTop: 4,
    fontSize: 13,
    color: '#777777',
  },

  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },

  totalCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 14,
    color: '#777777',
  },

  summaryValue: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },

  discountValue: {
    fontSize: 14,
    color: '#A33A3A',
    fontWeight: '500',
  },

  totalDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 6,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },

  total: {
    fontSize: 21,
    fontWeight: '700',
    color: '#111111',
  },

  copyButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 0,
  },

  copyButtonText: {
    color: '#444444',
    fontSize: 14,
    fontWeight: '600',
  },

  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  paymentSummaryItem: {
    flex: 1,
  },

  paymentSummaryLabel: {
    fontSize: 12,
    color: '#888888',
  },

  paymentSummaryValue: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },

  paymentRemaining: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },

  addPaymentButton: {
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
  },

  addPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  emptyPaymentCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  emptyPaymentText: {
    fontSize: 14,
    color: '#777777',
  },

  paymentsList: {
    marginTop: 10,
  },

  paymentCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  paymentMain: {
    flex: 1,
    paddingRight: 12,
  },

  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },

  paymentAccount: {
    marginTop: 4,
    fontSize: 13,
    color: '#777777',
  },

  paymentDate: {
    fontSize: 12,
    color: '#888888',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 22,
  },

  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111111',
    marginBottom: 20,
  },

  noAccountsCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    marginBottom: 10,
  },

  noAccountsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },

  noAccountsText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#777777',
  },

  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },

  accountOptionSelected: {
    borderColor: '#111111',
    backgroundColor: '#F7F7F7',
  },

  accountOptionMain: {
    flex: 1,
  },

  accountOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },

  accountTypeText: {
    marginTop: 3,
    fontSize: 12,
    color: '#777777',
  },

  selectedMark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginLeft: 10,
  },

  secondaryModalButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    marginBottom: 8,
  },

  secondaryModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },

  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
  },

  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },

  modalSaveButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#111111',
  },

  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  accountTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
  },

  typeButtonSelected: {
    backgroundColor: '#A33A3A',
  },

  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
  },

  typeButtonTextSelected: {
    color: '#FFFFFF',
  },

  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 18,
  },
});