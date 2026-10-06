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
import { getClients } from '@/services/clientsService';
import { Client } from '@/types/client';

export default function Clients() {
  const { token } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadClients = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getClients(token);
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [token])
  );

  const filteredClients = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return clients;
    }

    return clients.filter((client) => {
      const name = client.name.toLowerCase();
      const phone =
        client.phone?.toLowerCase() || '';

      return (
        name.includes(searchValue) ||
        phone.includes(searchValue)
      );
    });
  }, [clients, search]);

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
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Клиенты
          </Text>

          <Text style={styles.count}>
            {clients.length}{' '}
            {getClientCountLabel(clients.length)}
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() =>
            router.push('/new-client')
          }
          hitSlop={8}
        >
          <Text style={styles.addButtonText}>
            +
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Поиск клиента"
        placeholderTextColor="#999999"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {search.trim()
            ? 'РЕЗУЛЬТАТЫ ПОИСКА'
            : 'ВСЕ КЛИЕНТЫ'}
        </Text>

        {search.trim() &&
          filteredClients.length > 0 && (
            <Text style={styles.resultCount}>
              {filteredClients.length}
            </Text>
          )}
      </View>

      {filteredClients.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>
              +
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            {search.trim()
              ? 'Ничего не найдено'
              : 'Клиентов пока нет'}
          </Text>

          <Text style={styles.emptyText}>
            {search.trim()
              ? 'Попробуйте изменить запрос'
              : 'Добавьте первого клиента'}
          </Text>

          {!search.trim() && (
            <Pressable
              style={styles.emptyButton}
              onPress={() =>
                router.push('/new-client')
              }
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Добавить клиента
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.clientsList}>
          {filteredClients.map((client) => (
            <Pressable
              key={client.id}
              style={styles.clientCard}
              onPress={() =>
                router.push({
                  pathname: '/client-details',
                  params: {
                    id: client.id,
                  },
                })
              }
            >
              <View style={styles.clientAvatar}>
                <Text
                  style={styles.clientAvatarText}
                >
                  {getInitials(client.name)}
                </Text>
              </View>

              <View style={styles.clientInfo}>
                <Text
                  style={styles.clientName}
                  numberOfLines={1}
                >
                  {client.name}
                </Text>

                {client.phone ? (
                  <Text
                    style={styles.clientPhone}
                  >
                    {formatPhoneNumber(
                      client.phone
                    )}
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.noPhoneText
                    }
                  >
                    Телефон не указан
                  </Text>
                )}

                <View
                  style={
                    styles.clientMeta
                  }
                >
                  <Text
                    style={
                      styles.orderCount
                    }
                  >
                    {getOrderCountText(
                      client.completed_orders_count
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 1)
      .toUpperCase();
  }

  return (
    parts[0].slice(0, 1) +
    parts[1].slice(0, 1)
  ).toUpperCase();
}

function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');

  let normalized = digits;

  if (
    normalized.startsWith('8') &&
    normalized.length === 11
  ) {
    normalized =
      '7' + normalized.slice(1);
  } else if (
    normalized.startsWith('7') &&
    normalized.length === 11
  ) {
    // Already normalized.
  } else if (normalized.length === 10) {
    normalized = '7' + normalized;
  }

  if (
    normalized.length === 11 &&
    normalized.startsWith('7')
  ) {
    return `+7 ${normalized.slice(
      1,
      4
    )} ${normalized.slice(
      4,
      7
    )} ${normalized.slice(
      7,
      9
    )} ${normalized.slice(9, 11)}`;
  }

  return phone;
}

function getOrderCountText(count: number) {
  if (count === 0) {
    return '0 заказов';
  }

  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return `${count} заказов`;
  }

  if (lastOne === 1) {
    return `${count} заказ`;
  }

  if (
    lastOne >= 2 &&
    lastOne <= 4
  ) {
    return `${count} заказа`;
  }

  return `${count} заказов`;
}

function getClientCountLabel(count: number) {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return 'клиентов';
  }

  if (lastOne === 1) {
    return 'клиент';
  }

  if (
    lastOne >= 2 &&
    lastOne <= 4
  ) {
    return 'клиента';
  }

  return 'клиентов';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    padding: 24,
    paddingBottom: 40,
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
    marginBottom: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
  },

  count: {
    marginTop: 5,
    fontSize: 15,
    color: '#777777',
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '300',
  },

  searchInput: {
    height: 50,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111111',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
  },

  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
  },

  clientsList: {
    gap: 10,
  },

  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
  },

  clientAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  clientAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
  },

  clientInfo: {
    flex: 1,
    minWidth: 0,
  },

  clientName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },

  clientPhone: {
    marginTop: 4,
    fontSize: 14,
    color: '#666666',
  },

  noPhoneText: {
    marginTop: 4,
    fontSize: 14,
    color: '#999999',
  },

  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  orderCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },

  arrow: {
    fontSize: 28,
    lineHeight: 32,
    color: '#777777',
    marginLeft: 10,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyIconText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#888888',
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#111111',
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 20,
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});