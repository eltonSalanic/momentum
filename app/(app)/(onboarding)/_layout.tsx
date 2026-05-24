import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../../context/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Profile' }} />
        <Stack.Screen name="timezone" options={{ title: 'Location' }} />
      </Stack>
    </OnboardingProvider>
  );
}
