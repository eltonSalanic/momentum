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
      {/* Main tab navigator */}
      <Stack.Screen name="(tabs)" />

      {/* Onboarding flow */}
      <Stack.Screen name="(onboarding)" />

      {/* Create Goal — slides up as a modal */}
      <Stack.Screen
        name="goal/create"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
