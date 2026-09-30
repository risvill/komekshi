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

import { useAuth } from '@/context/AuthContext';
import * as Clipboard from 'expo-clipboard';

import { Task } from '@/types/task';
import {
  getOrders,
  updateOrderStatus,
  getTasksForOrder,
} from '@/services/ordersService';

import { Order } from '@/types/order';

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

function formatPaymentDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function OrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );

  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('KASPI');

  const [savingPayment, setSavingPayment] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

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

        const orderTasks = await getTasksForOrder(token, id);
        setTasks(orderTasks);

        const orderPayments = await getPaymentsForOrder(
          token,
          id
        );

        setPayments(orderPayments);

        const userAccounts = await getAccounts(token);
        setAccounts(userAccounts);
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

      Alert.alert(
        'Ошибка',
        'Не удалось изменить статус заказа'
      );
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

    Alert.alert(
      'Готово',
      'Предложение скопировано'
    );
  };

  const totalAmount = Number(order?.total || 0);

  const paidAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const remainingAmount = Math.max(
    totalAmount - paidAmount,
    0
  );

  const openPaymentModal = () => {
    setPaymentAmount('');
    setSelectedAccountId(
      accounts.length > 0 ? accounts[0].id : null
    );
    setPaymentModalVisible(true);
  };

  const handleCreatePayment = async () => {
    if (!token || !order) {
      return;
    }

    if (!selectedAccountId) {
      Alert.alert(
        'Выберите счёт',
        'Укажите, на какой счёт поступили деньги'
      );
      return;
    }

    const amount = Number(
      paymentAmount.replace(',', '.')
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(
        'Ошибка',
        'Введите корректную сумму'
      );
      return;
    }

    try {
      setSavingPayment(true);

      const newPayment = await createPayment(
        token,
        order.id,
        {
          account_id: selectedAccountId,
          amount,
        }
      );

      setPayments((current) => [
        newPayment,
        ...current,
      ]);

      setPaymentAmount('');
      setPaymentModalVisible(false);
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
      setSavingPayment(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!token) {
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
      setSavingAccount(true);

      const newAccount = await createAccount(
        token,
        {
          name: accountName.trim(),
          type: accountType,
        }
      );

      setAccounts((current) => [
        ...current,
        newAccount,
      ]);

      setSelectedAccountId(newAccount.id);

      setAccountName('');
      setAccountType('KASPI');
      setAccountModalVisible(false);
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
      setSavingAccount(false);
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
        <Text>Заказ не найден</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
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
          onPress={() =>
            handleStatusChange('ACCEPTED')
          }
          disabled={updatingStatus}
        >
          <Text style={styles.statusButtonText}>
            {updatingStatus
              ? 'Сохранение...'
              : 'Принять заказ'}
          </Text>
        </Pressable>
      )}

      {order.status === 'ACCEPTED' && (
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

      {order.status === 'IN_PROGRESS' && (
        <Pressable
          style={styles.statusButton}
          onPress={() =>
            handleStatusChange('AWAITING_PICKUP')
          }
          disabled={updatingStatus}
        >
          <Text style={styles.statusButtonText}>
            {updatingStatus
              ? 'Сохранение...'
              : 'Заказ готов'}
          </Text>
        </Pressable>
      )}

      {order.status === 'AWAITING_PICKUP' && (
        <Pressable
          style={styles.statusButton}
          onPress={() =>
            handleStatusChange('COMPLETED')
          }
          disabled={updatingStatus}
        >
          <Text style={styles.statusButtonText}>
            {updatingStatus
              ? 'Сохранение...'
              : 'Завершить заказ'}
          </Text>
        </Pressable>
      )}

      {order.status !== 'COMPLETED' &&
        order.status !== 'CANCELLED' && (
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
                    onPress: () =>
                      handleStatusChange(
                        'CANCELLED'
                      ),
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
          {order.order_time
            ? ' • ' + order.order_time
            : ''}
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
        Связанные задачи
      </Text>

      {tasks.length === 0 ? (
        <Text style={styles.noTasks}>
          Нет связанных задач
        </Text>
      ) : (
        tasks.map((task) => (
          <Pressable
            key={task.id}
            style={styles.taskCard}
            onPress={() =>
              router.push({
                pathname: '/task-details',
                params: {
                  id: task.id,
                },
              })
            }
          >
            <Text style={styles.taskTitle}>
              {task.title}
            </Text>

            <Text style={styles.taskStatus}>
              {task.status === 'TODO'
                ? 'К выполнению'
                : task.status === 'IN_PROGRESS'
                ? 'В работе'
                : 'Выполнено'}
            </Text>

            {task.deadline && (
              <Text style={styles.taskDeadline}>
                Дедлайн:{' '}
                {new Date(
                  task.deadline
                ).toLocaleString()}
              </Text>
            )}
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>
        Товары
      </Text>

      {order.items.map((item) => (
        <View
          key={item.id}
          style={styles.item}
        >
          <View>
            <Text style={styles.itemName}>
              {item.name}
            </Text>

            <Text style={styles.itemDetails}>
              {item.quantity} × {item.price} ₸
            </Text>
          </View>

          <Text style={styles.itemTotal}>
            {Number(item.quantity) *
              Number(item.price)}{' '}
            ₸
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

          {order.discount_type &&
            order.discount_value && (
              <Text style={styles.summaryLabel}>
                Скидка:{' '}
                {order.discount_type === 'PERCENT'
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

      <Text style={styles.sectionTitle}>
        Оплата
      </Text>

      <View style={styles.paymentSummary}>
        <View>
          <Text style={styles.paymentSummaryLabel}>
            Итого
          </Text>

          <Text style={styles.paymentSummaryValue}>
            {totalAmount.toLocaleString('ru-RU')} ₸
          </Text>
        </View>

        <View>
          <Text style={styles.paymentSummaryLabel}>
            Оплачено
          </Text>

          <Text style={styles.paymentSummaryValue}>
            {paidAmount.toLocaleString('ru-RU')} ₸
          </Text>
        </View>

        <View>
          <Text style={styles.paymentSummaryLabel}>
            Остаток
          </Text>

          <Text style={styles.paymentRemaining}>
            {remainingAmount.toLocaleString('ru-RU')} ₸
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.addPaymentButton}
        onPress={openPaymentModal}
      >
        <Text style={styles.addPaymentButtonText}>
          + Добавить оплату
        </Text>
      </Pressable>

      {payments.length === 0 ? (
        <Text style={styles.noPayments}>
          Платежей пока нет
        </Text>
      ) : (
        payments.map((payment) => (
          <View
            key={payment.id}
            style={styles.paymentCard}
          >
            <View>
              <Text style={styles.paymentAmount}>
                {Number(
                  payment.amount
                ).toLocaleString('ru-RU')}{' '}
                ₸
              </Text>

              <Text style={styles.paymentAccount}>
                {payment.account_name}
              </Text>
            </View>

            <Text style={styles.paymentDate}>
              {formatPaymentDate(
                payment.payment_date
              )}
            </Text>
          </View>
        ))
      )}

      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setPaymentModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Добавить оплату
            </Text>

            <Text style={styles.modalLabel}>
              Сумма
            </Text>

            <TextInput
              style={styles.input}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="Например, 10000"
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>
              Счёт
            </Text>

            {accounts.length === 0 ? (
              <View>
                <Text style={styles.noAccountsText}>
                  Счетов пока нет
                </Text>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    setAccountModalVisible(true)
                  }
                >
                  <Text style={styles.secondaryButtonText}>
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
                  .map((account) => (
                    <Pressable
                      key={account.id}
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
                      <Text
                        style={
                          styles.accountOptionText
                        }
                      >
                        {account.name}
                      </Text>

                      <Text
                        style={
                          styles.accountTypeText
                        }
                      >
                        {account.type === 'KASPI'
                          ? 'Kaspi'
                          : 'Наличные'}
                      </Text>
                    </Pressable>
                  ))}

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    setAccountModalVisible(true)
                  }
                >
                  <Text style={styles.secondaryButtonText}>
                    + Добавить другой счёт
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() =>
                  setPaymentModalVisible(false)
                }
              >
                <Text style={styles.modalCancelText}>
                  Отмена
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalSaveButton}
                onPress={handleCreatePayment}
                disabled={
                  savingPayment ||
                  accounts.length === 0
                }
              >
                <Text
                  style={styles.modalSaveText}
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

      <Modal
        visible={accountModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setAccountModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Новый счёт
            </Text>

            <Text style={styles.modalLabel}>
              Название
            </Text>

            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Например, Kaspi мамы"
            />

            <Text style={styles.modalLabel}>
              Тип
            </Text>

            <View style={styles.accountTypeRow}>
              <Pressable
                style={[
                  styles.typeButton,
                  accountType === 'KASPI' &&
                    styles.typeButtonSelected,
                ]}
                onPress={() =>
                  setAccountType('KASPI')
                }
              >
                <Text
                  style={
                    styles.typeButtonText
                  }
                >
                  Kaspi
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeButton,
                  accountType === 'CASH' &&
                    styles.typeButtonSelected,
                ]}
                onPress={() =>
                  setAccountType('CASH')
                }
              >
                <Text
                  style={
                    styles.typeButtonText
                  }
                >
                  Наличные
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() =>
                  setAccountModalVisible(false)
                }
              >
                <Text style={styles.modalCancelText}>
                  Отмена
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalSaveButton}
                onPress={handleCreateAccount}
                disabled={savingAccount}
              >
                <Text style={styles.modalSaveText}>
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
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 48,
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

  info: {
    marginTop: 8,
    fontSize: 15,
    opacity: 0.7,
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

  sectionTitle: {
    marginTop: 32,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
  },

  noTasks: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 8,
  },

  taskCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    marginBottom: 8,
  },

  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  taskStatus: {
    marginTop: 5,
    fontSize: 14,
    opacity: 0.7,
  },

  taskDeadline: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.6,
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

  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f7f7f7',
  },

  paymentSummaryLabel: {
    fontSize: 13,
    opacity: 0.6,
  },

  paymentSummaryValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
  },

  paymentRemaining: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
  },

  addPaymentButton: {
    marginTop: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#208AEF',
    alignItems: 'center',
  },

  addPaymentButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  noPayments: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.6,
  },

  paymentCard: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },

  paymentAccount: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.65,
  },

  paymentDate: {
    fontSize: 13,
    opacity: 0.6,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 18,
  },

  accountOption: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 8,
  },

  accountOptionSelected: {
    borderColor: '#208AEF',
    backgroundColor: '#f1f7ff',
  },

  accountOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },

  accountTypeText: {
    marginTop: 3,
    fontSize: 13,
    opacity: 0.6,
  },

  noAccountsText: {
    marginBottom: 10,
    fontSize: 14,
    opacity: 0.6,
  },

  secondaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    marginBottom: 12,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },

  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
  },

  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },

  modalSaveButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#208AEF',
  },

  modalSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  accountTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },

  typeButtonSelected: {
    backgroundColor: '#dceeff',
    borderWidth: 1,
    borderColor: '#208AEF',
  },

  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});