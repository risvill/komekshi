import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';


import { useAuth } from '@/context/AuthContext';
import { createProduct } from '@/services/productsService';

export default function NewProduct() {
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<'piece' | 'portion'>('piece');
  const [piecesPerPortion, setPiecesPerPortion] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateProduct = async () => {
    if (!token) {
      return;
    }

    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название товара');
      return;
    }

    const numericPrice = Number(price);

    if (!numericPrice || numericPrice < 0) {
      Alert.alert('Ошибка', 'Введите корректную цену');
      return;
    }

    if (unit === 'portion') {
      const pieces = Number(piecesPerPortion);

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

      await createProduct(token, {
        name: name.trim(),
        price: numericPrice,
        unit,
        pieces_per_portion:
          unit === 'portion'
            ? Number(piecesPerPortion)
            : undefined,
      });

      Alert.alert('Готово', 'Товар создан', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error(error);

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
    <View style={styles.container}>
      <Text style={styles.title}>New Product</Text>

      <Text style={styles.label}>Название</Text>

      <TextInput
        style={styles.input}
        placeholder="Например, Red Velvet"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Цена</Text>

      <TextInput
        style={styles.input}
        placeholder="Например, 3000"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Единица измерения</Text>

      <View style={styles.unitRow}>
        <Pressable
          style={[
            styles.unitButton,
            unit === 'piece' && styles.unitButtonActive,
          ]}
          onPress={() => setUnit('piece')}
        >
          <Text
            style={[
              styles.unitText,
              unit === 'piece' && styles.unitTextActive,
            ]}
          >
            Штука
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.unitButton,
            unit === 'portion' && styles.unitButtonActive,
          ]}
          onPress={() => setUnit('portion')}
        >
          <Text
            style={[
              styles.unitText,
              unit === 'portion' && styles.unitTextActive,
            ]}
          >
            Порция
          </Text>
        </Pressable>
      </View>

      {unit === 'portion' && (
        <>
          <Text style={styles.label}>
            Штук в порции
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Например, 6"
            value={piecesPerPortion}
            onChangeText={setPiecesPerPortion}
            keyboardType="numeric"
          />
        </>
      )}

      <Pressable
        style={[
          styles.button,
          creating && styles.buttonDisabled,
        ]}
        onPress={handleCreateProduct}
        disabled={creating}
      >
        <Text style={styles.buttonText}>
          {creating ? 'Создаём...' : 'Создать товар'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 28,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },

  unitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  unitButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    alignItems: 'center',
  },

  unitButtonActive: {
    borderColor: '#208AEF',
    backgroundColor: '#EEF6FF',
  },

  unitText: {
    fontSize: 16,
  },

  unitTextActive: {
    color: '#208AEF',
    fontWeight: '600',
  },

  button: {
    backgroundColor: '#208AEF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});