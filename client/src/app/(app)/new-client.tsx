import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import * as Contacts from 'expo-contacts';
import { Feather } from '@expo/vector-icons';

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
        router.replace('/clients');
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
    if (!token || creating) {
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
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.replace('/clients')
          }
          hitSlop={8}
          style={styles.backButtonContainer}
        >
          <Text style={styles.backButton}>
            ←
          </Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Новый клиент
          </Text>

          <Text style={styles.subtitle}>
            Добавьте клиента в Komekshi
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        ИЗ КОНТАКТОВ
      </Text>

      <Pressable
        style={[
          styles.contactCard,
          creating &&
            styles.disabledCard,
        ]}
        onPress={handlePickContact}
        disabled={creating}
      >
        <View style={styles.contactIcon}>
          <Text style={styles.contactIconText}>
            +
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>
            Выбрать контакт
          </Text>

          <Text style={styles.contactSubtitle}>
            Имя и телефон заполнятся автоматически
          </Text>
        </View>

        <Text style={styles.arrow}>
          ›
        </Text>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />

        <Text style={styles.dividerText}>
          ИЛИ ВРУЧНУЮ
        </Text>

        <View style={styles.dividerLine} />
      </View>

      <View style={styles.formCard}>
  <Text style={styles.formTitle}>
    Данные клиента
  </Text>

  <View style={styles.field}>
    <Feather
      name="user"
      size={19}
      color="#777777"
      style={styles.fieldIcon}
      accessible={false}
    />
    <TextInput
      style={styles.input}
      placeholder="Имя клиента"
      placeholderTextColor="#999999"
      value={name}
      onChangeText={setName}
      editable={!creating}
      autoCapitalize="words"
    />
  </View>

  <View style={styles.field}>
    <Feather
      name="phone"
      size={18}
      color="#777777"
      style={styles.fieldIcon}
      accessible={false}
    />
    <TextInput
      style={styles.input}
      placeholder="+7 777 123 45 67"
      placeholderTextColor="#999999"
      value={phone}
      onChangeText={setPhone}
      keyboardType="phone-pad"
      editable={!creating}
    />
  </View>
</View>

<Pressable
  style={[
    styles.createButton,
    creating && styles.buttonDisabled,
  ]}
  onPress={() => void handleCreate()}
  disabled={creating}
>
  {creating ? (
    <ActivityIndicator
      color="#FFFFFF"
      size="small"
    />
  ) : (
    <Text style={styles.createButtonText}>
      Создать клиента
    </Text>
  )}
</Pressable>
    </ScrollView>
    </SafeAreaView>);
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButtonContainer: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
  },


  backButton: {
    fontSize: 20,
    lineHeight: 30,
    color: '#111111',
  },

  headerText: {
    alignItems: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 15,
    color: '#777777',
    textAlign: 'center',
  },

  sectionTitle: {
    marginTop: 32,
    marginBottom: 10,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
  },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
  },

  disabledCard: {
    opacity: 0.6,
  },

  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  contactIconText: {
    fontSize: 27,
    fontWeight: '300',
    color: '#208AEF',
    lineHeight: 30,
  },

  contactInfo: {
    flex: 1,
    paddingRight: 10,
  },

  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },

  contactSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#777777',
  },

  arrow: {
    fontSize: 27,
    lineHeight: 30,
    color: '#777777',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 26,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8E8',
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 0.7,
  },

  formCard: {
  backgroundColor: '#F7F7F7',
  borderRadius: 16,
  padding: 19,
    paddingBottom: 8,
},

formTitle: {
  fontSize: 18,
  lineHeight: 23,
  fontWeight: '700',
  color: '#111111',
  marginBottom: 20,
},

field: {
  minHeight: 54,
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: '#FFFFFF',
},

fieldIcon: {
  marginRight: 12,
},

input: {
  flex: 1,
  minWidth: 0,
  height: 52,
  paddingHorizontal: 0,
  fontSize: 15,
  color: '#111111',
},

createButton: {
  marginTop: 20,
  minHeight: 52,
  backgroundColor: '#111111',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},

buttonDisabled: {
  opacity: 0.55,
},

createButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
},
});