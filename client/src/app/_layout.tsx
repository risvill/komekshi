import { Redirect, Stack, useSegments } from 'expo-router';

import { AuthProvider, useAuth } from '@/context/AuthContext';

function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return null;
  }

  const inApp = segments[0] === '(app)';
  const onLogin = segments[0] === 'login';

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