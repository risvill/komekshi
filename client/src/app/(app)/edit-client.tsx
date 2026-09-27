import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import {
  getClientDetails,
  updateClient,
} from '@/services/clientsService';

export default function EditClient() {
  const { token } = useAuth();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadClient = async () => {
      if (!token || !id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getClientDetails(
          token,
          id
        );

        setName(data.client.name);
        setPhone(data.client.phone || '');
      } catch (error) {
        console.error(
          'Failed to load client:',
          error
        );

        Alert.alert(
          'Ошибка',
          'Не удалось загрузить клиента'
        );
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [token, id]);

  const handleSave = async () => {
    if (!token || !id) {
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        'Ошибка',
        'Введите имя клиента'
      );
      return;
    }

    try {
      setSaving(true);

      await updateClient(
        token,
        id,
        {
          name: name.trim(),
          phone: phone.trim() || undefined,
        }
      );

      router.back();
    } catch (error) {
      console.error(
        'Failed to update client:',
        error
      );

      Alert.alert(
        'Ошибка',
        'Не удалось сохранить изменения'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.cancel}>
            Отмена
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Редактирование
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.label}>
        Имя
      </Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Имя клиента"
      />

      <Text style={styles.label}>
        Телефон
      </Text>

      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+7 777 123 45 67"
        keyboardType="phone-pad"
      />

      <Pressable
        style={[
          styles.saveButton,
          saving && styles.buttonDisabled,
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving
            ? 'Сохраняем...'
            : 'Сохранить'}
        </Text>
      </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cancel: {
    fontSize: 15,
    color: '#208AEF',
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
  },

  headerSpacer: {
    width: 50,
  },

  label: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },

  saveButton: {
    marginTop: 32,
    backgroundColor: '#208AEF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});