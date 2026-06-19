import { Tabs, useRouter } from 'expo-router';
import { Home, Plus, Settings } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';

const TAB_BAR_HEIGHT = 64;

function CreateButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fabButton, pressed && styles.fabPressed]}
      hitSlop={8}
    >
      <Plus size={28} color={theme.colors.onPrimary} strokeWidth={2.5} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceVariant,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
          letterSpacing: 0.4,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      {/* Home tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.75} />,
        }}
      />

      {/* Middle FAB — intercepted, never actually navigates */}
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: () => (
            <View style={styles.fabWrapper}>
              <CreateButton
                onPress={() => {
                  if (!profile?.has_payment_method) {
                    Alert.alert(
                      'Stakes Card Required',
                      'stalld attaches real consequences to commitments. Please register a payment method before setting a commitment.',
                      [
                        { text: 'Maybe Later', style: 'cancel' },
                        {
                          text: 'Add Card Now',
                          onPress: () => router.push('/(app)/(tabs)/settings'),
                        },
                      ],
                    );
                  } else {
                    router.push('/(app)/goal/create');
                  }
                }}
              />
            </View>
          ),
        }}
      />

      {/* Settings / Profile tab */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={1.75} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift the button above the tab bar
    marginTop: -22,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
