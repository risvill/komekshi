import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as Contacts from 'expo-contacts';

import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/services/clientsService';

export default function NewClient() {
  const { token } = useAuth();

  const { fromOrder } = useLocalSearchParams<{
    fromOrder?: string;
  }>();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!token) {
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
      setCreating(true);

      const newClient = await createClient(
        token,
        {
          name: name.trim(),
          phone: phone.trim() || undefined,
        }
      );

      if (fromOrder === 'true') {
        router.replace({
          pathname: '/new-order',
          params: {
            clientId: newClient.id,
          },
        });
      } else {
        router.back();
      }
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Ошибка',
        'Не удалось создать клиента'
      );
    } finally {
      setCreating(false);
    }
  };

  const handlePickContact = async () => {
    if (!token) {
      return;
    }

    const { status } =
      await Contacts.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Доступ к контактам',
        'Разрешите доступ к контактам в настройках iPhone.'
      );
      return;
    }

    const contact =
      await Contacts.presentContactPickerAsync();

    if (!contact) {
      return;
    }

    const contactName = [
      contact.firstName,
      contact.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const contactPhone =
      contact.phoneNumbers?.[0]?.number || '';

    if (!contactName) {
      Alert.alert(
        'Ошибка',
        'У выбранного контакта нет имени.'
      );
      return;
    }

    try {
      setCreating(true);

      const newClient = await createClient(
        token,
        {
          name: contactName,
          phone:
            contactPhone || undefined,
        }
      );

      if (fromOrder === 'true') {
        router.replace({
          pathname: '/new-order',
          params: {
            clientId: newClient.id,
          },
        });
      } else {
        router.back();
      }
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Ошибка',
        'Не удалось добавить клиента'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Новый клиент
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.sectionTitle}>
        Добавить из контактов
      </Text>

      <Pressable
        style={styles.contactButton}
        onPress={handlePickContact}
        disabled={creating}
      >
        <Text style={styles.contactIcon}>
          +
        </Text>

        <View>
          <Text style={styles.contactTitle}>
            Выбрать контакт
          </Text>

          <Text style={styles.contactSubtitle}>
            Имя и телефон будут заполнены автоматически
          </Text>
        </View>
      </Pressable>

      <View style={styles.divider}>
        <Text style={styles.dividerText}>
          или создать вручную
        </Text>
      </View>

      <Text style={styles.label}>
        Имя
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Имя клиента"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>
        Телефон
      </Text>

      <TextInput
        style={styles.input}
        placeholder="+7 777 123 45 67"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Pressable
        style={[
          styles.createButton,
          creating &&
            styles.buttonDisabled,
        ]}
        onPress={handleCreate}
        disabled={creating}
      >
        <Text style={styles.createButtonText}>
          {creating
            ? 'Сохраняем...'
            : 'Создать клиента'}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  back: {
    fontSize: 38,
    lineHeight: 38,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 30,
  },

  sectionTitle: {
    marginTop: 32,
    fontSize: 18,
    fontWeight: '600',
  },

  contactButton: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#208AEF',
    color: '#fff',
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 38,
    marginRight: 12,
  },

  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  contactSubtitle: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.5,
  },

  divider: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
  },

  dividerText: {
    fontSize: 14,
    opacity: 0.5,
  },

  label: {
    marginTop: 14,
    marginBottom: 7,
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

  createButton: {
    marginTop: 28,
    backgroundColor: '#208AEF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});