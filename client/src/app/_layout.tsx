import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

import { AuthProvider, useAuth } from '@/context/AuthContext';

function AuthGuard() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return null;
  }

  const onLogin = pathname === '/login';
  const inApp = pathname.startsWith('/(app)');

  if (!user && inApp) {
    return <Redirect href="/login" />;
  }

  if (user && onLogin) {
    return <Redirect href="/(app)" />;
  }

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(app)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      <AuthGuard />
    </AuthProvider>
  );
}