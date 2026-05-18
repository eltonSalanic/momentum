import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { profile, isLoading } = useAuth();

  if (isLoading) return null;

  // If user hasn't completed onboarding, send them there
  if (profile && !profile.has_completed_onboarding) {
    return <Redirect href="/(app)/(onboarding)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
    </Stack>
  );
}
