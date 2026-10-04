import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('http://127.0.0.1:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось войти');
    }

    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
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

    const response = await fetch(
      'http://127.0.0.1:3000/me',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || 'Не удалось изменить данные'
      );
    }

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
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}


