import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ArrowDown, Sparkles } from 'lucide-react-native';

import { ThemedText } from '../../../components/ui/ThemedText';
import { SectionHeader } from '../../../components/home/SectionHeader';
import { TodayCard } from '../../../components/home/TodayCard';
import { CommitmentRow } from '../../../components/home/CommitmentRow';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { useCommitments } from '../../../hooks/useCommitments';
import { COMMITMENT_TYPES } from '../../../types/commitment';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function getGreetingDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const {
    commitments,
    todayCommitments,
    isLoading,
    isRefreshing,
    refresh,
    checkIn,
  } = useCommitments();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const firstName = profile?.first_name ?? 'there';
  const pendingCount = todayCommitments.filter((c) => !c.isCheckedIn).length;
  const allCheckedIn = todayCommitments.length > 0 && pendingCount === 0;

  const getWeekdayIndex = (dateStr: string): number => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay(); // 0 = Sun, 1 = Mon ...
    const daysMap = [6, 0, 1, 2, 3, 4, 5];
    return daysMap[day];
  };

  const getTodayIndex = (): number => {
    const now = new Date();
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
    const DAYS_MAP: Record<string, number> = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };
    return DAYS_MAP[dayName] ?? 0;
  };

  const todayIndex = getTodayIndex();

  const groupedCommitments = DAYS_OF_WEEK.map((dayName, dayIndex) => {
    const items = commitments.filter((c) => {
      if (c.type === COMMITMENT_TYPES.ROUTINE) {
        return c.check_in_days != null && c.check_in_days[dayIndex] === true;
      }
      if (c.type === COMMITMENT_TYPES.TASK && c.due_date) {
        return getWeekdayIndex(c.due_date) === dayIndex;
      }
      return false;
    });

    return {
      dayName,
      dayIndex,
      items,
    };
  }).filter((g) => g.items.length > 0);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 24 }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <ThemedText variant="headlineLg">
            Hey, {firstName}
          </ThemedText>
          <ThemedText variant="labelMd" style={styles.date}>
            {getGreetingDate()}
          </ThemedText>
        </View>

        <View style={styles.refreshHint}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ transform: [{ scale: 0.7 }] }} />
          ) : (
            <ArrowDown size={10} color={theme.colors.secondary} strokeWidth={2.5} />
          )}
          <ThemedText variant="labelSm" style={styles.refreshHintText}>
            {isRefreshing ? 'Syncing...' : 'Pull to refresh'}
          </ThemedText>
        </View>
      </View>

      {/* Section 1: Today */}
      <View style={styles.section}>
        <SectionHeader
          title="Today"
          count={!isLoading && todayCommitments.length > 0 ? pendingCount : undefined}
        />

        {isLoading || (isRefreshing && todayCommitments.length === 0) ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <ThemedText variant="bodyMd" style={styles.inlineLoadingText}>
              Fetching tasks...
            </ThemedText>
          </View>
        ) : todayCommitments.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={32} color={theme.colors.secondary} strokeWidth={1.5} />
            <ThemedText variant="bodyMd" style={styles.emptyText}>
              Nothing due today.{'\n'}Enjoy your momentum.
            </ThemedText>
          </View>
        ) : allCheckedIn ? (
          <View style={styles.emptyState}>
            <ThemedText variant="bodyLg" style={styles.completedEmoji}>
              🎯
            </ThemedText>
            <ThemedText variant="bodyMd" style={styles.emptyText}>
              All checked in for today!
            </ThemedText>
          </View>
        ) : null}

        {!isLoading && todayCommitments.map((c) => (
          <TodayCard key={c.id} commitment={c} onCheckIn={checkIn} />
        ))}
      </View>

      {/* Section 2: All Commitments */}
      <View style={styles.section}>
        <SectionHeader title="All Commitments" count={!isLoading ? commitments.length : undefined} />

        {isLoading || (isRefreshing && commitments.length === 0) ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <ThemedText variant="bodyMd" style={styles.inlineLoadingText}>
              Fetching commitments...
            </ThemedText>
          </View>
        ) : commitments.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText variant="bodyMd" style={styles.emptyText}>
              No active commitments yet.{'\n'}Tap + to create your first one.
            </ThemedText>
          </View>
        ) : (
          groupedCommitments.map((group) => {
            const isToday = group.dayIndex === todayIndex;
            return (
              <View key={group.dayName} style={styles.dayGroup}>
                <ThemedText
                  variant="labelSm"
                  style={[styles.dayHeader, isToday && styles.dayHeaderToday]}
                >
                  {group.dayName.toUpperCase()} {isToday ? '(TODAY)' : ''}
                </ThemedText>
                {group.items.map((c) => (
                  <CommitmentRow key={c.id} commitment={c} />
                ))}
              </View>
            );
          })
        )}
      </View>

      {/* Bottom spacer for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.gutter,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  header: {
    gap: 4,
  },
  date: {
    color: theme.colors.textMuted,
  },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    marginTop: 6,
  },
  refreshHintText: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  completedEmoji: {
    fontSize: 44,
    lineHeight: 52,
    textAlign: 'center',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.lg,
  },
  inlineLoadingText: {
    color: theme.colors.secondary,
    fontFamily: 'Inter_400Regular',
  },
  dayGroup: {
    marginBottom: theme.spacing.md,
  },
  dayHeader: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.secondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.xs,
  },
  dayHeaderToday: {
    color: theme.colors.primary,
  },
});
