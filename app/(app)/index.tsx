import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '../../components/ui/ThemedText';
import { Button } from '../../components/ui/Button';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <ThemedText variant="display">Welcome, {profile?.first_name || 'User'}!</ThemedText>
      <ThemedText variant="bodyLg" style={styles.subtitle}>
        You have successfully onboarded.
      </ThemedText>

      <View style={styles.spacer} />

      <Button
        label="Sign Out"
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                try {
                  await signOut();
                } catch (e) {
                  console.error('Sign out error:', e);
                }
              },
            },
          ]);
        }}
        variant="ghost"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  subtitle: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  spacer: {
    height: 40,
  },
});
