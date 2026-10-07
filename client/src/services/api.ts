import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_URL =
  Platform.OS === 'ios' && Constants.isDevice
    ? 'http://172.20.10.2:3000'
    : 'http://127.0.0.1:3000';

export { API_URL };

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Ошибка запроса');
  }

  return data;
}