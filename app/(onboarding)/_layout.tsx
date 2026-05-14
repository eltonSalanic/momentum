import { Stack, Redirect } from 'expo-router';
import { OnboardingProvider } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingLayout() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) return null;

  // Must be logged in to be here
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // If already onboarded, send them home
  if (profile?.has_completed_onboarding) {
    return <Redirect href="/" />;
  }

  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' }, // Pure dark background
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Profile' }} />
        <Stack.Screen name="goal" options={{ title: 'Your First Goal' }} />
        <Stack.Screen name="payment" options={{ title: 'Commitment' }} />
      </Stack>
    </OnboardingProvider>
  );
}
