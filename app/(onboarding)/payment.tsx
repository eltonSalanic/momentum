import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { ThemedText } from '../../components/ui/ThemedText';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function PaymentStep() {
  const router = useRouter();
  const { data } = useOnboarding();
  const { user, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // 1. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          timezone: data.timezone,
          has_completed_onboarding: true,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Create First Goal
      const { error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: data.goal.title,
          amount_cents: data.goal.amount_cents,
          check_in_days: data.goal.check_in_days,
          status: 'active',
        });

      if (goalError) throw goalError;

      // 3. Refresh profile state to trigger navigation change in root layout
      await refreshProfile();
      
      // Navigation will happen automatically via RootNavigator's conditional logic
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong while saving your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: '100%' }]} />
        </View>

        <View style={styles.header}>
          <ThemedText variant="display" style={styles.title}>
            Ready to start?
          </ThemedText>
          <ThemedText variant="bodyLg" style={styles.subtitle}>
            Review your commitment below.
          </ThemedText>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Goal</ThemedText>
            <ThemedText style={styles.summaryValue}>{data.goal.title}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Stake</ThemedText>
            <ThemedText style={styles.summaryValue}>${(data.goal.amount_cents / 100).toFixed(2)} per miss</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Schedule</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {data.goal.check_in_days.filter(d => d).length} days / week
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoBox}>
          <ThemedText variant="labelSm" style={styles.infoText}>
            Momentum is a high-stakes productivity app. By clicking finish, you agree to track your habits. We will set up your trial and payment method on the next screen after you enter the app.
          </ThemedText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={isSubmitting ? "Saving..." : "Finish & Start"}
          onPress={handleFinish}
          disabled={isSubmitting}
          variant="primary"
        />
        <Button
          label="Back"
          onPress={() => router.back()}
          disabled={isSubmitting}
          variant="ghost"
        />
      </View>

      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <ThemedText style={styles.loadingText}>Building your momentum...</ThemedText>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    marginBottom: theme.spacing.xl * 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  header: {
    marginBottom: theme.spacing.xl * 2,
  },
  title: {
    fontSize: 40,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textMuted,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(185, 199, 228, 0.05)',
    borderRadius: theme.radius.md,
  },
  infoText: {
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 20, 20, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
