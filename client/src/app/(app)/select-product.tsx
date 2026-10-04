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

import { useAuth } from '@/context/AuthContext';

import { getProducts } from '@/services/productsService';
import { Product } from '@/types/product';

import {
  setSelectedProducts,
} from '@/services/orderSelection';

export default function SelectProduct() {
  const { token } = useAuth();

  const {
    selectedProductIds,
  } = useLocalSearchParams<{
    selectedProductIds?: string;
  }>();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(
      () =>
        new Set(
          selectedProductIds
            ? selectedProductIds
                .split(',')
                .filter(Boolean)
            : []
        )
    );

  useEffect(() => {
    const loadProducts = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data =
          await getProducts(token);

        setProducts(data);
      } catch (error) {
        console.error(
          'Failed to load products:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [token]);

  const filteredProducts = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      product.name
        .toLowerCase()
        .includes(query)
    );
  }, [products, search]);

  const toggleProduct = (
    productId: string
  ) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  };

  const handleAddProducts = () => {
    const selectedProducts =
      products.filter((product) =>
        selectedIds.has(product.id)
      );

    setSelectedProducts(
      selectedProducts
    );

    router.replace('/new-order')
  };

  const selectedCount =
    selectedIds.size;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButtonContainer}
          >
            <Text style={styles.backButton}>
              ←
            </Text>
          </Pressable>

          <Text style={styles.title}>
            Добавить товары
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>
            ⌕
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Поиск товара"
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

        {/* SUMMARY */}

        <View style={styles.selectionSummary}>
          <View>
            <Text
              style={
                styles.selectionSummaryTitle
              }
            >
              {selectedCount === 0
                ? 'Выберите товары'
                : `Выбрано: ${selectedCount}`}
            </Text>

            <Text
              style={
                styles.selectionSummarySubtitle
              }
            >
              Можно выбрать несколько товаров
            </Text>
          </View>

          {selectedCount > 0 && (
            <Pressable
              onPress={() =>
                setSelectedIds(new Set())
              }
            >
              <Text style={styles.clearSelection}>
                Сбросить
              </Text>
            </Pressable>
          )}
        </View>

        {/* PRODUCTS */}

        <Text style={styles.sectionLabel}>
          ТОВАРЫ
        </Text>

        <View style={styles.productsCard}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                Товары не найдены
              </Text>

              <Text style={styles.emptyText}>
                Попробуйте изменить запрос
              </Text>
            </View>
          ) : (
            filteredProducts.map(
              (product, index) => {
                const isSelected =
                  selectedIds.has(
                    product.id
                  );

                return (
                  <Pressable
                    key={product.id}
                    style={[
                      styles.productRow,
                      index ===
                        filteredProducts.length -
                          1 &&
                        styles.productRowLast,
                    ]}
                    onPress={() =>
                      toggleProduct(
                        product.id
                      )
                    }
                  >
                    <View
                      style={
                        styles.productInfo
                      }
                    >
                      <Text
                        style={[
                          styles.productName,
                          isSelected &&
                            styles.selectedProductName,
                        ]}
                        numberOfLines={2}
                      >
                        {product.name}
                      </Text>

                      <Text
                        style={
                          styles.productDetails
                        }
                      >
                        {product.price} ₸ /{' '}
                        {product.unit ===
                        'piece'
                          ? 'шт.'
                          : 'порция'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        isSelected &&
                          styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Text
                          style={
                            styles.checkboxText
                          }
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              }
            )
          )}
        </View>
      </ScrollView>

      {/* BOTTOM ACTION */}

      <View style={styles.bottomContainer}>
        <Pressable
          style={[
            styles.addButton,
            selectedCount === 0 &&
              styles.addButtonDisabled,
          ]}
          disabled={selectedCount === 0}
          onPress={handleAddProducts}
        >
          <Text
            style={styles.addButtonText}
          >
            {selectedCount === 0
              ? 'Добавить товары'
              : `Добавить ${selectedCount} ${
                  selectedCount === 1
                    ? 'товар'
                    : selectedCount < 5
                      ? 'товара'
                      : 'товаров'
                }`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 110,
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
    fontSize: 28,
    lineHeight: 30,
    color: '#111111',
  },

  headerSpacer: {
    width: 32,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
  },

  searchContainer: {
    height: 52,
    marginTop: 24,
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

  selectionSummary: {
    minHeight: 64,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectionSummaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },

  selectionSummarySubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#888888',
  },

  clearSelection: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },

  sectionLabel: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#777777',
  },

  productsCard: {
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    overflow: 'hidden',
  },

  productRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },

  productRowLast: {
    borderBottomWidth: 0,
  },

  productInfo: {
    flex: 1,
    marginRight: 14,
  },

  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },

  selectedProductName: {
    fontWeight: '700',
  },

  productDetails: {
    marginTop: 4,
    fontSize: 13,
    color: '#888888',
  },

  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxSelected: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },

  checkboxText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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

  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },

  addButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonDisabled: {
    backgroundColor: '#EAEAEA',
  },

  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});