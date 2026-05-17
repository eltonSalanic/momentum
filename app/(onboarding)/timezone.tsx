import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { ThemedText } from '../../components/ui/ThemedText';
import { theme } from '../../constants/theme';
import { useOnboarding } from '../../context/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';

// A subset of common timezones for the search/picker
// In a real app, you might want a more comprehensive list or a library
const COMMON_TIMEZONES = [
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
  'America/Phoenix', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Asia/Bangkok', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Istanbul', 'Asia/Jakarta',
  'Asia/Jerusalem', 'Asia/Kolkata', 'Asia/Manila', 'Asia/Seoul', 'Asia/Shanghai',
  'Asia/Singapore', 'Asia/Taipei', 'Asia/Tokyo', 'Australia/Adelaide', 'Australia/Brisbane',
  'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney', 'Europe/Amsterdam',
  'Europe/Berlin', 'Europe/Brussels', 'Europe/Budapest', 'Europe/Copenhagen', 'Europe/Dublin',
  'Europe/Helsinki', 'Europe/Istanbul', 'Europe/Lisbon', 'Europe/London', 'Europe/Madrid',
  'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris', 'Europe/Prague', 'Europe/Rome',
  'Europe/Stockholm', 'Europe/Vienna', 'Europe/Warsaw', 'Europe/Zurich', 'Pacific/Auckland',
  'Pacific/Honolulu', 'UTC'
];

export default function TimezoneStep() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [search, setSearch] = useState('');
  
  // Ensure the detected timezone is in the list or add it
  const detectedTz = data.timezone;
  const allTzs = Array.from(new Set([detectedTz, ...COMMON_TIMEZONES])).sort();

  const filteredTzs = allTzs.filter(tz => 
    tz.toLowerCase().includes(search.toLowerCase())
  );

  const handleNext = () => {
    router.push('/(onboarding)/goal');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.flex}>
        <View style={styles.content}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: '50%' }]} />
          </View>

          <View style={styles.header}>
            <ThemedText variant="display" style={styles.title}>
              Where are you?
            </ThemedText>
            <ThemedText variant="bodyLg" style={styles.subtitle}>
              We need your timezone to track your habits accurately.
            </ThemedText>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city or timezone..."
              placeholderTextColor={theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              selectionColor={theme.colors.primary}
            />
          </View>

          <FlatList
            data={filteredTzs}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tzItem,
                  data.timezone === item && styles.tzItemActive
                ]}
                onPress={() => updateData({ timezone: item })}
              >
                <ThemedText style={[
                  styles.tzText,
                  data.timezone === item && styles.tzTextActive
                ]}>
                  {item.replace(/_/g, ' ')}
                </ThemedText>
                {data.timezone === item && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        </View>

        <View style={styles.footer}>
          <Button
            label="Continue"
            onPress={handleNext}
            variant="primary"
          />
          <Button
            label="Back"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>
      </View>
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
  content: {
    flex: 1,
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
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 40,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  tzItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tzItemActive: {
    backgroundColor: 'rgba(185, 199, 228, 0.05)',
    borderRadius: theme.radius.sm,
  },
  tzText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  tzTextActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  footer: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
});
