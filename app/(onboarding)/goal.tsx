import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../context/OnboardingContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ThemedText } from '../../components/ui/ThemedText';
import { theme } from '../../constants/theme';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function GoalStep() {
  const router = useRouter();
  const { data, updateGoal } = useOnboarding();

  const toggleDay = (index: number) => {
    const newDays = [...data.goal.check_in_days];
    newDays[index] = !newDays[index];
    updateGoal({ check_in_days: newDays });
  };

  const handleNext = () => {
    if (data.goal.title && data.goal.amount_cents > 0) {
      router.push('/(onboarding)/payment');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: '66.66%' }]} />
        </View>

        <View style={styles.header}>
          <ThemedText variant="display" style={styles.title}>
            Choose your battle.
          </ThemedText>
          <ThemedText variant="bodyLg" style={styles.subtitle}>
            What is one habit you will commit to?
          </ThemedText>
        </View>

        <View style={styles.form}>
          <Input
            label="Goal Title"
            placeholder="e.g. Deep Work for 4 hours"
            value={data.goal.title}
            onChangeText={(text) => updateGoal({ title: text })}
          />

          <View style={styles.section}>
            <ThemedText variant="labelMd" style={styles.label}>Frequency</ThemedText>
            <View style={styles.daysContainer}>
              {DAYS.map((day, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayCircle,
                    data.goal.check_in_days[i] && styles.dayCircleActive
                  ]}
                  onPress={() => toggleDay(i)}
                >
                  <ThemedText 
                    style={[
                      styles.dayText,
                      data.goal.check_in_days[i] && styles.dayTextActive
                    ]}
                  >
                    {day}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText variant="labelMd" style={styles.label}>Stakes (USD)</ThemedText>
            <View style={styles.stakeContainer}>
              <ThemedText style={styles.currencySymbol}>$</ThemedText>
              <Input
                placeholder="5"
                keyboardType="numeric"
                value={(data.goal.amount_cents / 100).toString()}
                onChangeText={(text) => {
                  const cents = parseFloat(text) * 100;
                  updateGoal({ amount_cents: isNaN(cents) ? 0 : cents });
                }}
                containerStyle={styles.stakeInput}
              />
              <ThemedText variant="bodyMd" style={styles.perMiss}>per miss</ThemedText>
            </View>
            <ThemedText variant="labelSm" style={styles.hint}>
              You only pay if you miss a check-in.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleNext}
          disabled={!data.goal.title || data.goal.amount_cents <= 0}
          variant="primary"
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
      </View>
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
    fontSize: 36,
    lineHeight: 44,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textMuted,
  },
  form: {
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  dayTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  stakeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  currencySymbol: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  stakeInput: {
    width: 100,
  },
  perMiss: {
    color: theme.colors.textMuted,
  },
  hint: {
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  footer: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  backText: {
    color: theme.colors.textMuted,
  },
});
