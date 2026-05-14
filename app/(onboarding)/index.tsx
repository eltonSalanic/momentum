import React from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../context/OnboardingContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ThemedText } from '../../components/ui/ThemedText';
import { theme } from '../../constants/theme';

export default function ProfileStep() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();

  const handleNext = () => {
    if (data.firstName && data.lastName) {
      router.push('/(onboarding)/goal');
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
            <View style={[styles.progressBar, { width: '33.33%' }]} />
          </View>

          <View style={styles.header}>
            <ThemedText type="display" style={styles.title}>
              First things first.
            </ThemedText>
            <ThemedText type="bodyLg" style={styles.subtitle}>
              How should we address you?
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              label="First Name"
              placeholder="Elon"
              value={data.firstName}
              onChangeText={(text) => updateData({ firstName: text })}
              autoFocus
            />
            <View style={styles.spacer} />
            <Input
              label="Last Name"
              placeholder="Musk"
              value={data.lastName}
              onChangeText={(text) => updateData({ lastName: text })}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Continue"
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
    gap: theme.spacing.lg,
  },
  spacer: {
    height: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 0 : theme.spacing.xl,
  },
});
