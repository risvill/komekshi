import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { apiFetch } from '@/services/api';

type User = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  business_name: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: {
    name: string;
    email: string;
    phone?: string | null;
    business_name?: string | null;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken =
          await AsyncStorage.getItem('token');

        const savedUser =
          await AsyncStorage.getItem('user');

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error(
          'Failed to restore session:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (
    email: string,
    password: string
  ) => {
    const response = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });

    await AsyncStorage.setItem(
      'token',
      response.token
    );

    await AsyncStorage.setItem(
      'user',
      JSON.stringify(response.user)
    );

    setToken(response.token);
    setUser(response.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');

    setToken(null);
    setUser(null);
  };

  const updateUser = async (data: {
    name: string;
    email: string;
    phone?: string | null;
    business_name?: string | null;
  }) => {
    if (!token) {
      throw new Error('Нет авторизации');
    }

    const result = await apiFetch(
      '/me',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      token
    );

    await AsyncStorage.setItem(
      'user',
      JSON.stringify(result)
    );

    setUser(result);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}