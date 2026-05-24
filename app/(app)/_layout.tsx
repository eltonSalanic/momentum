import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { profile, isLoading } = useAuth();
  const segments = useSegments();

  if (isLoading) return null;

  const isOnboardingRoute = segments[1] === '(onboarding)';

  // If user hasn't completed onboarding and is not already on onboarding screens, send them there
  if (profile && !profile.has_completed_onboarding && !isOnboardingRoute) {
    return <Redirect href="/(app)/(onboarding)" />;
  }

  // If user has completed onboarding but tries to access onboarding screens, send them to the main tabs
  if (profile && profile.has_completed_onboarding && isOnboardingRoute) {
    return <Redirect href="/(app)/(tabs)" />;
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

      {/* Edit/Detail Goal — slides up as a modal */}
      <Stack.Screen
        name="goal/[id]"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
