import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

import { getClients } from '@/services/clientsService';
import { Client } from '@/types/client';

import {
  setSelectedClient,
} from '@/services/orderSelection';

export default function SelectClient() {
  const { token } = useAuth();

  const {
    selectedClientId,
  } = useLocalSearchParams<{
    selectedClientId?: string;
  }>();

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [selectedId, setSelectedId] =
    useState<string | undefined>(
      selectedClientId || undefined
    );

  useEffect(() => {
    const loadClients = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data =
          await getClients(token);

        setClients(data);
      } catch (error) {
        console.error(
          'Failed to load clients:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [token]);

  const filteredClients = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const name =
        client.name?.toLowerCase() || '';

      const phone =
        client.phone?.toLowerCase() || '';

      return (
        name.includes(query) ||
        phone.includes(query)
      );
    });
  }, [clients, search]);

  const handleSelectClient = (
    clientId: string | undefined
  ) => {
    setSelectedId(clientId);

    setSelectedClient(clientId);

    router.replace('/new-order')
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.contentContainer
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/new-order')}
            hitSlop={8}
            style={styles.backButtonContainer}
          >
            <Text style={styles.backButton}>
              ←
            </Text>
          </Pressable>

          <Text style={styles.title}>
            Выберите клиента
          </Text>

          <View style={styles.headerSpacer} />
        </View>


        {/* WITHOUT CLIENT */}

        <Pressable
          style={[
            styles.noClientCard,
            !selectedId &&
              styles.selectedCard,
          ]}
          onPress={() =>
            handleSelectClient(undefined)
          }
        >
          <View
            style={styles.clientIcon}
          >
            <Text style={styles.clientIconText}>
              —
            </Text>
          </View>

          <View style={styles.clientInfo}>
            <Text
              style={[
                styles.clientName,
                !selectedId &&
                  styles.selectedText,
              ]}
            >
              Без клиента
            </Text>

            <Text style={styles.clientSubtext}>
              Заказ без привязанного клиента
            </Text>
          </View>

          {!selectedId && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkText}>
                ✓
              </Text>
            </View>
          )}
        </Pressable>


         {/* CREATE CLIENT */}

        <Pressable
          style={styles.createClientButton}
          onPress={() =>
            router.push({
              pathname: '/new-client',
              params: {
                fromOrder: 'true',
              },
            })
          }
        >
          <View
            style={
              styles.createClientIcon
            }
          >
            <Text
              style={
                styles.createClientIconText
              }
            >
              +
            </Text>
          </View>

          <Text
            style={
              styles.createClientText
            }
          >
            Создать нового клиента
          </Text>

          <Text style={styles.createChevron}>
            ›
          </Text>
        </Pressable>

        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>
            ⌕
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Поиск по имени или телефону"
            placeholderTextColor="#999999"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
            >
              <Text style={styles.clearButton}>
                ×
              </Text>
            </Pressable>
          )}
        </View>

        {/* CLIENTS */}

        <Text style={styles.resultLabel}>
          {search.trim()
            ? `${filteredClients.length} ${
                filteredClients.length === 1
                  ? 'результат'
                  : 'результатов'
              }`
            : 'КЛИЕНТЫ'}
        </Text>

        <View style={styles.clientsCard}>
          {filteredClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                Клиенты не найдены
              </Text>

              <Text style={styles.emptyText}>
                Попробуйте изменить запрос
              </Text>
            </View>
          ) : (
            filteredClients.map(
              (client, index) => {
                const isSelected =
                  selectedId === client.id;

                return (
                  <Pressable
                    key={client.id}
                    style={[
                      styles.clientRow,
                      index ===
                        filteredClients.length - 1 &&
                        styles.clientRowLast,
                    ]}
                    onPress={() =>
                      handleSelectClient(
                        client.id
                      )
                    }
                  >
                    <View
                      style={
                        styles.avatar
                      }
                    >
                      <Text
                        style={
                          styles.avatarText
                        }
                      >
                        {client.name
                          ?.charAt(0)
                          .toUpperCase() ||
                          '?'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.clientInfo
                      }
                    >
                      <Text
                        style={[
                          styles.clientName,
                          isSelected &&
                            styles.selectedText,
                        ]}
                        numberOfLines={1}
                      >
                        {client.name}
                      </Text>

                      {client.phone && (
                        <Text
                          style={
                            styles.clientSubtext
                          }
                        >
                          {client.phone}
                        </Text>
                      )}
                    </View>

                    {isSelected && (
                      <View
                        style={
                          styles.checkCircle
                        }
                      >
                        <Text
                          style={
                            styles.checkText
                          }
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              }
            )
          )}
        </View>

       
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  contentContainer: {
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

  searchContainer: {
    height: 52,
    marginTop: 17,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchIcon: {
    marginRight: 8,
    fontSize: 23,
    color: '#777777',
  },

  searchInput: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: '#111111',
  },

  clearButton: {
    fontSize: 24,
    lineHeight: 26,
    color: '#888888',
  },

  noClientCard: {
    minHeight: 68,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedCard: {
    backgroundColor: '#F1F1F1',
  },

  clientIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clientIconText: {
    fontSize: 18,
    color: '#555555',
  },

  clientInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },

  selectedText: {
    fontWeight: '700',
  },

  clientSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#888888',
  },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  resultLabel: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#777777',
  },

  clientsCard: {
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    overflow: 'hidden',
  },

  clientRow: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },

  clientRowLast: {
    borderBottomWidth: 0,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555555',
  },

  emptyState: {
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: '#888888',
  },

  createClientButton: {
    minHeight: 60,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  createClientIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createClientIconText: {
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '300',
    color: '#FFFFFF',
  },

  createClientText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },

  createChevron: {
    fontSize: 27,
    lineHeight: 30,
    color: '#777777',
    fontWeight: '300',
  },
});