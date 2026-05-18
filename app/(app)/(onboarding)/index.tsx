import { useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ThemedText } from '../../../components/ui/ThemedText';
import { theme } from '../../../constants/theme';
import { useOnboarding } from '../../../context/OnboardingContext';

export default function ProfileStep() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();

  const handleNext = () => {
    if (data.firstName && data.lastName) {
      router.push('/(app)/(onboarding)/timezone');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: '25%' }]} />
          </View>

          <View style={styles.header}>
            <ThemedText variant="display" style={styles.title}>
              First things first.
            </ThemedText>
            <ThemedText variant="bodyLg" style={styles.subtitle}>
              How should we address you?
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              label="First Name"
              placeholder="Michael"
              value={data.firstName}
              onChangeText={(text) => updateData({ firstName: text })}
              autoFocus
            />
            <View style={styles.spacer} />
            <Input
              label="Last Name"
              placeholder="Jackson"
              value={data.lastName}
              onChangeText={(text) => updateData({ lastName: text })}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Continue"
            onPress={handleNext}
            disabled={!data.firstName || !data.lastName}
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
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
  form: {
    gap: theme.spacing.sm,
  },
  spacer: {
    height: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 0 : theme.spacing.xl,
  },
});
