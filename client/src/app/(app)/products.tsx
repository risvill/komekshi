import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  Keyboard,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { productIcons, getProductIconIndex } from '../../assets/product-icons';

import { useAuth } from '@/context/AuthContext';
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} from '@/services/productsService';
import { Product } from '@/types/product';

type SwipeProductProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

const SWIPE_ACTION_WIDTH = 90;
const SWIPE_TRIGGER = 115;

function SwipeProduct({ product, onEdit, onDelete }: SwipeProductProps) {
  const translation = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);
  const callbacks = useRef({ onEdit, onDelete, product });
  callbacks.current = { onEdit, onDelete, product };
  const [direction, setDirection] = useState<'edit' | 'delete' | null>(null);
  const [revealed, setRevealed] = useState<'edit' | 'delete' | null>(null);
  const directionRef = useRef<'edit' | 'delete' | null>(null);
  const maxDrag = Math.min(Dimensions.get('window').width * 0.7, 230);

  const animateTo = useCallback((value: number, next: 'edit' | 'delete' | null) => {
    currentOffset.current = value;
    setRevealed(next);
    Animated.spring(translation, {
      toValue: value,
      useNativeDriver: true,
      damping: 22,
      stiffness: 210,
      mass: 0.8,
    }).start();
  }, [translation]);

  const trigger = useCallback((action: 'edit' | 'delete') => {
    animateTo(0, null);
    if (action === 'edit') callbacks.current.onEdit(callbacks.current.product);
    else callbacks.current.onDelete(callbacks.current.product);
  }, [animateTo]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 9 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
    onPanResponderGrant: () => {
      translation.stopAnimation();
      directionRef.current = null;
    },
    onPanResponderMove: (_, gesture) => {
      const next = Math.max(-maxDrag, Math.min(maxDrag, currentOffset.current + gesture.dx));
      translation.setValue(next);
      const nextDirection = next > 5 ? 'edit' : next < -5 ? 'delete' : null;
      if (directionRef.current !== nextDirection) {
        directionRef.current = nextDirection;
        setDirection(nextDirection);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const displacement = currentOffset.current + gesture.dx;
      if (displacement >= SWIPE_TRIGGER + 40) trigger('edit');
      else if (displacement <= -(SWIPE_TRIGGER + 40)) trigger('delete');
      else if (displacement > 42) animateTo(SWIPE_ACTION_WIDTH, 'edit');
      else if (displacement < -42) animateTo(-SWIPE_ACTION_WIDTH, 'delete');
      else animateTo(0, null);
    },
    onPanResponderTerminate: () => animateTo(0, null),
  }), [animateTo, maxDrag, translation, trigger]);

  const IconComponent = productIcons[getProductIconIndex(product.id)];
  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeBackground}>
        {(direction === 'edit' || revealed === 'edit') && (
          <LinearGradient
            colors={['#A5C8FF', '#4287ED', '#1D62D0']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.swipeAction, styles.swipeLeftAction]}
          >
            <Pressable onPress={() => trigger('edit')} style={styles.swipeActionTouch}
              accessibilityRole="button" accessibilityLabel={`Редактировать ${product.name}`}>
              <Ionicons name="pencil-outline" size={25} color="#FFFFFF" />
            </Pressable>
          </LinearGradient>
        )}
        {(direction === 'delete' || revealed === 'delete') && (
          <LinearGradient
            colors={['#FFB2B2', '#F15C64', '#CF3547']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.swipeAction, styles.swipeRightAction]}
          >
            <Pressable onPress={() => trigger('delete')} style={styles.swipeActionTouch}
              accessibilityRole="button" accessibilityLabel={`Удалить ${product.name}`}>
              <Ionicons name="trash-outline" size={25} color="#FFFFFF" />
            </Pressable>
          </LinearGradient>
        )}
      </View>
      <Animated.View
  style={{
    borderRadius: 16,
    transform: [{ translateX: translation }],
  }}
  {...panResponder.panHandlers}
>
        <View style={styles.card}>
          <View style={styles.productIconContainer}>
            {IconComponent ? <IconComponent width={30} height={30} /> :
              <Ionicons name="cafe-outline" size={26} color="#222222" />}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productUnit}>
              {product.unit === 'portion' ? `Порция · ${product.pieces_per_portion} шт.` : 'Штука'}
            </Text>
          </View>
          <Text style={styles.price}>{Number(product.price).toLocaleString('ru-RU')} ₸</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function Products() {
  const { token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // CREATE PRODUCT
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] =
    useState<'piece' | 'portion'>('piece');
  const [piecesPerPortion, setPiecesPerPortion] =
    useState('');

  const [creating, setCreating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  const openEditModal = (product: Product) => {
    Keyboard.dismiss();
    setName(product.name);
    setPrice(String(product.price));
    setUnit(product.unit);
    setPiecesPerPortion(product.pieces_per_portion == null ? '' : String(product.pieces_per_portion));
    setEditingProduct(product);
    setShowCreate(true);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setUnit('piece');
    setPiecesPerPortion('');
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    Keyboard.dismiss();

    setShowCreate(false);
    setEditingProduct(null);
    setName('');
    setPrice('');
    setUnit('piece');
    setPiecesPerPortion('');
  };

  const handleSaveProduct = async () => {
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

      const payload = {
        name: name.trim(),
        price: numericPrice,
        unit,
        pieces_per_portion: unit === 'portion' ? Number(piecesPerPortion) : undefined,
      };
      if (editingProduct) {
        const updated = await updateProduct(token, editingProduct.id, payload);
        setProducts((current) => current.map((p) => p.id === updated.id ? updated : p));
      } else {
        const created = await createProduct(token, payload);
        setProducts((current) => [created, ...current]);
      }

      Keyboard.dismiss();
      setShowCreate(false);
      setEditingProduct(null);
      setName('');
      setPrice('');
      setUnit('piece');
      setPiecesPerPortion('');
    } catch (error) {
      console.error(
        'Failed to save product:',
        error
      );

      Alert.alert(
        'Ошибка',
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить товар'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!token || !deletingProduct || deleting) return;
    try {
      setDeleting(true);
      await deleteProduct(token, deletingProduct.id);
      setProducts((current) => current.filter((p) => p.id !== deletingProduct.id));
      setDeletingProduct(null);
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось удалить товар');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.back()
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
                    <SwipeProduct
                      key={product.id}
                      product={product}
                      onEdit={openEditModal}
                      onDelete={setDeletingProduct}
                    />
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
        <View style={styles.bottomSheetOverlay}>
          <Pressable
            style={
              styles.bottomSheetBackdrop
            }
            onPress={closeCreateModal}
            disabled={creating}
          />

          <View
            style={[
              styles.bottomSheet,
              { paddingBottom: keyboardHeight + 24 },
            ]}
          >
            <View
              style={styles.sheetHandle}
            />

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
            <View
              style={styles.sheetHeader}
            >
              <View>
                <Text
                  style={styles.sheetTitle}
                >
                  {editingProduct ? 'Редактировать товар' : 'Новый товар'}
                </Text>

                <Text
                  style={styles.sheetSubtitle}
                >
                  {editingProduct ? 'Измените данные товара' : 'Добавьте товар в каталог'}
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
                void handleSaveProduct()
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
                  {editingProduct ? 'Сохранить изменения' : 'Создать товар'}
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deletingProduct} transparent animationType="fade"
        onRequestClose={() => { if (!deleting) setDeletingProduct(null); }}>
        <View style={styles.deleteOverlay}>
          <Pressable style={StyleSheet.absoluteFill}
            onPress={() => { if (!deleting) setDeletingProduct(null); }} />
          <View style={styles.deleteDialog}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={26} color="#D8444C" />
            </View>
            <Text style={styles.deleteTitle}>Удалить товар?</Text>
            <Text style={styles.deleteDescription}>
              {`«${deletingProduct?.name ?? ''}» исчезнет из каталога. История заказов сохранится.`}
            </Text>
            <View style={styles.deleteButtons}>
              <Pressable disabled={deleting} style={styles.deleteCancelButton}
                onPress={() => setDeletingProduct(null)}>
                <Text style={styles.deleteCancelText}>Отмена</Text>
              </Pressable>
              <Pressable disabled={deleting} style={styles.deleteConfirmButton}
                onPress={() => void handleDeleteProduct()}>
                {deleting ? <ActivityIndicator color="#FFFFFF" /> :
                  <Text style={styles.deleteConfirmText}>Удалить</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    maxHeight: '90%',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },

  sheetScroll: {
    flexShrink: 1,
    minHeight: 0,
  },

  sheetScrollContent: {
    paddingBottom: 4,
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

  swipeContainer: {
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#F7F7F7',
},
  swipeBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  swipeAction: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: SWIPE_ACTION_WIDTH + 15,
  justifyContent: 'center',
  alignItems: 'center',
},

swipeLeftAction: {
  left: -5,
},

swipeRightAction: {
  right: -5,
},
  swipeActionTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 13,
    marginRight: 12,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  deleteDialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    padding: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  deleteIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FDEDEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  deleteDescription: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#777777',
    marginBottom: 22,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  deleteCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#D8444C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: { fontSize: 14, fontWeight: '600', color: '#333333' },
  deleteConfirmText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
