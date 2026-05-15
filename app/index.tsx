import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { ThemedText } from '../components/ui/ThemedText';
import { Button } from '../components/ui/Button';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { session, profile, isLoading, signOut } = useAuth();

  // Wait for session and profile to resolve
  if (isLoading || (session && !profile)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>Loading your momentum...</ThemedText>
      </View>
    );
  }

  // Guard: Not logged in
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Guard: Not onboarded
  if (profile && !profile.has_completed_onboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  // Success: Welcome Home
  return (
    <View style={styles.container}>
      <ThemedText variant="display">Welcome, {profile?.first_name || 'User'}!</ThemedText>
      <ThemedText variant="bodyLg" style={styles.subtitle}>You have successfully onboarded.</ThemedText>
      
      <View style={styles.spacer} />
      
      <Button 
        label="Sign Out" 
        onPress={signOut} 
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
