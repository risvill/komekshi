import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import {
  createProduct,
  getProducts,
} from '@/services/productsService';
import { Product } from '@/types/product';

export default function Products() {
  const { token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // CREATE PRODUCT
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] =
    useState<'piece' | 'portion'>('piece');
  const [piecesPerPortion, setPiecesPerPortion] =
    useState('');

  const [creating, setCreating] = useState(false);

  const loadProducts = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getProducts(token);

      setProducts(data);
    } catch (error) {
      console.error(
        'Failed to load products:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить товары'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [token])
  );

  // -----------------------------
  // CREATE PRODUCT
  // -----------------------------

  const openCreateModal = () => {
    setName('');
    setPrice('');
    setUnit('piece');
    setPiecesPerPortion('');
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    if (creating) return;

    setShowCreate(false);
    setName('');
    setPrice('');
    setUnit('piece');
    setPiecesPerPortion('');
  };

  const handleCreateProduct = async () => {
    if (!token) {
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        'Ошибка',
        'Введите название товара'
      );
      return;
    }

    const numericPrice = Number(price);

    if (!numericPrice || numericPrice < 0) {
      Alert.alert(
        'Ошибка',
        'Введите корректную цену'
      );
      return;
    }

    if (unit === 'portion') {
      const pieces = Number(
        piecesPerPortion
      );

      if (!pieces || pieces <= 0) {
        Alert.alert(
          'Ошибка',
          'Укажите количество штук в порции'
        );
        return;
      }
    }

    try {
      setCreating(true);

      const product = await createProduct(
        token,
        {
          name: name.trim(),
          price: numericPrice,
          unit,
          pieces_per_portion:
            unit === 'portion'
              ? Number(piecesPerPortion)
              : undefined,
        }
      );

      setProducts((current) => [
        product,
        ...current,
      ]);

      setShowCreate(false);
      setName('');
      setPrice('');
      setUnit('piece');
      setPiecesPerPortion('');
    } catch (error) {
      console.error(
        'Failed to create product:',
        error
      );

      Alert.alert(
        'Ошибка',
        error instanceof Error
          ? error.message
          : 'Не удалось создать товар'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.replace('/more')
            }
            hitSlop={8}
            style={styles.backButtonContainer}
          >
            <Text style={styles.backButton}>
              ←
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Товары
          </Text>

          <Pressable
            style={styles.addButton}
            onPress={openCreateModal}
            accessibilityRole="button"
            accessibilityLabel="Добавить товар"
          >
            <Text style={styles.addButtonText}>
              +
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.scrollContent
            }
          >
            {products.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text
                  style={styles.emptyTitle}
                >
                  Товаров пока нет
                </Text>

                <Text
                  style={styles.emptyText}
                >
                  Добавьте первый товар, чтобы
                  использовать его в заказах.
                </Text>

                <Pressable
                  style={styles.emptyButton}
                  onPress={openCreateModal}
                >
                  <Text
                    style={
                      styles.emptyButtonText
                    }
                  >
                    Добавить товар
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text
                  style={styles.sectionTitle}
                >
                  МОИ ТОВАРЫ
                </Text>

                <View style={styles.list}>
                  {products.map((product) => (
                    <View
                      key={product.id}
                      style={styles.card}
                    >
                      <View
                        style={
                          styles.cardInfo
                        }
                      >
                        <Text
                          style={
                            styles.productName
                          }
                        >
                          {product.name}
                        </Text>

                        <Text
                          style={
                            styles.productUnit
                          }
                        >
                          {product.unit ===
                          'portion'
                            ? `Порция · ${product.pieces_per_portion} шт.`
                            : 'Штука'}
                        </Text>
                      </View>

                      <Text
                        style={styles.price}
                      >
                        {Number(
                          product.price
                        ).toLocaleString(
                          'ru-RU'
                        )}{' '}
                        ₸
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>

      {/* ================================= */}
      {/* CREATE PRODUCT BOTTOM SHEET       */}
      {/* ================================= */}

      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={
          closeCreateModal
        }
      >
        <KeyboardAvoidingView
          style={styles.bottomSheetOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <Pressable
            style={
              styles.bottomSheetBackdrop
            }
            onPress={closeCreateModal}
            disabled={creating}
          />

          <View
            style={styles.bottomSheet}
          >
            <View
              style={styles.sheetHandle}
            />

            <View
              style={styles.sheetHeader}
            >
              <View>
                <Text
                  style={styles.sheetTitle}
                >
                  Новый товар
                </Text>

                <Text
                  style={styles.sheetSubtitle}
                >
                  Добавьте товар в каталог
                </Text>
              </View>

              <Pressable
                style={
                  styles.sheetCloseButton
                }
                onPress={closeCreateModal}
                disabled={creating}
              >
                <Text
                  style={
                    styles.sheetCloseText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </View>

            {/* NAME */}

            <Text
              style={styles.inputLabel}
            >
              НАЗВАНИЕ ТОВАРА
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Например, Red Velvet"
              placeholderTextColor="#999999"
              value={name}
              onChangeText={setName}
              editable={!creating}
              autoCapitalize="sentences"
              autoFocus
            />

            {/* PRICE */}

            <Text
              style={[
                styles.inputLabel,
              ]}
            >
              ЦЕНА
            </Text>

            <View style={styles.priceInputWrapper}>
              <TextInput
                style={styles.priceInput}
                placeholder="Например, 3000"
                placeholderTextColor="#999999"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                editable={!creating}
              />

              <Text
                style={styles.currency}
              >
                ₸
              </Text>
            </View>

            {/* UNIT */}

            <Text
              style={[
                styles.inputLabel,
              ]}
            >
              ЕДИНИЦА ИЗМЕРЕНИЯ
            </Text>

            <View
              style={styles.typeRow}
            >
              <Pressable
                style={[
                  styles.typeButton,
                  unit === 'piece' &&
                    styles.typeButtonSelected,
                ]}
                onPress={() =>
                  setUnit('piece')
                }
                disabled={creating}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    unit === 'piece' &&
                      styles.typeButtonTextSelected,
                  ]}
                >
                  Штука
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeButton,
                  unit === 'portion' &&
                    styles.typeButtonSelected,
                ]}
                onPress={() =>
                  setUnit('portion')
                }
                disabled={creating}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    unit === 'portion' &&
                      styles.typeButtonTextSelected,
                  ]}
                >
                  Порция
                </Text>
              </Pressable>
            </View>

            {/* PIECES PER PORTION */}

            {unit === 'portion' && (
              <>
                <Text
                  style={[
                    styles.inputLabel,
                  ]}
                >
                  ШТУК В ПОРЦИИ
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Например, 6"
                  placeholderTextColor="#999999"
                  value={piecesPerPortion}
                  onChangeText={
                    setPiecesPerPortion
                  }
                  keyboardType="numeric"
                  editable={!creating}
                />
              </>
            )}

            {/* SAVE */}

            <Pressable
              style={[
                styles.saveButton,
                creating &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                void handleCreateProduct()
              }
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Создать товар
                </Text>
              )}
            </Pressable>

            <Pressable
              style={
                styles.sheetCancelButton
              }
              onPress={closeCreateModal}
              disabled={creating}
            >
              <Text
                style={
                  styles.sheetCancelText
                }
              >
                Отмена
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* HEADER */

  header: {
    height: 44,
    marginTop: 24,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },

  backButtonContainer: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backButton: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '300',
    color: '#111111',
  },

  headerTitle: {
    position: 'absolute',
    left: 44,
    right: 44,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#111111',
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
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },

  /* PRODUCTS */

  sectionTitle: {
    marginLeft: 4,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
  },

  list: {
    gap: 10,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  cardInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  productName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#111111',
  },

  productUnit: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#777777',
  },

  price: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#111111',
  },

  /* EMPTY */

  emptyCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  emptyTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#777777',
    marginBottom: 18,
  },

  emptyButton: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* BOTTOM SHEET */

  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  bottomSheetBackdrop: {
    flex: 1,
  },

  bottomSheet: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: 22,
    borderRadius: 2,
    backgroundColor: '#D5D5D5',
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  sheetTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#111111',
  },

  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#777777',
  },

  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEAEA',
  },

  sheetCloseText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '300',
    color: '#555555',
  },

  /* FORM */

  inputLabel: {
    marginLeft: 2,
    marginBottom: 7,
    
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.7,
  },



  input: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#111111',
    marginBottom: 15
  },

  priceInputWrapper: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 15,
  },

  priceInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111111',

  },

  currency: {
    marginRight: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#777777',
  },

  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 18,
  },

  typeButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EAEAEA',
  },

  typeButtonSelected: {
    backgroundColor: '#A33A3A',
  },

  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },

  typeButtonTextSelected: {
    color: '#FFFFFF',
  },

  saveButton: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#111111',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.55,
  },

  sheetCancelButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  sheetCancelText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
});