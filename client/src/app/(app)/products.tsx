import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';



import { useAuth } from '@/context/AuthContext';
import { getProducts } from '@/services/productsService';
import { Product } from '@/types/product';

export default function Products() {
  const { token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await getProducts(token);
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        loadProducts();
    }, [token])
    );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>

        <Pressable
            style={styles.addButton}
            onPress={() => router.push('/new-product')}
        >
            <Text style={styles.addButtonText}>+</Text>
        </Pressable>
        </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            Пока нет товаров
          </Text>

          <Text style={styles.emptyText}>
            Добавьте первый товар
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {products.map((product) => (
            <View key={product.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.productName}>
                  {product.name}
                </Text>

                <Text style={styles.productUnit}>
                  {product.unit === 'portion'
                    ? `Порция · ${product.pieces_per_portion} шт.`
                    : 'Штука'}
                </Text>
              </View>

              <Text style={styles.price}>
                {product.price} ₸
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
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

  list: {
    gap: 12,
  },

  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },

  cardInfo: {
    flex: 1,
  },

  productName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },

  productUnit: {
    fontSize: 14,
    color: '#777',
  },

  price: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },

  emptyText: {
    color: '#777',
  },
});