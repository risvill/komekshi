import { router } from 'expo-router';
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
import { useFocusEffect } from 'expo-router';

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
      const phone = client.phone?.toLowerCase() || '';

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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Клиенты
          </Text>

          <Text style={styles.count}>
            {clients.length} клиентов
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() =>
            router.push('/new-client')
          }
        >
          <Text style={styles.addButtonText}>
            +
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Поиск клиента"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.list}>
        {filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Клиентов нет
            </Text>

            <Text style={styles.emptyText}>
              Добавьте первого клиента
            </Text>
          </View>
        ) : (
          filteredClients.map((client) => (
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
              <View>
                <Text style={styles.clientName}>
                  {client.name}
                </Text>

                {client.phone && (
                  <Text style={styles.clientPhone}>
                    {client.phone}
                  </Text>
                )}
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
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

  list: {
    marginTop: 16,
  },

  clientCard: {
    marginTop: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  clientName: {
    fontSize: 17,
    fontWeight: '600',
  },

  clientPhone: {
    marginTop: 5,
    opacity: 0.6,
  },

  arrow: {
    fontSize: 28,
    opacity: 0.4,
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