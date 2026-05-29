import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { ArrowDown, ChevronDown, ChevronRight, Sparkles } from 'lucide-react-native';

import { ThemedText } from '../../../components/ui/ThemedText';
import { SectionHeader } from '../../../components/home/SectionHeader';
import { TodayCard } from '../../../components/home/TodayCard';
import { CommitmentRow } from '../../../components/home/CommitmentRow';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { useCommitments } from '../../../hooks/useCommitments';
import { useNotification } from '../../../context/NotifcationContext';
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
  const { expoPushToken, notification } = useNotification();
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

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => ({
    [DAYS_OF_WEEK[todayIndex]]: true,
  }));

  const toggleDayExpand = (dayName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedDays((prev) => ({
      ...prev,
      [dayName]: !prev[dayName],
    }));
  };

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
  });

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

      {/* Push Notification Debug Info */}
      <View style={styles.debugBox}>
        <ThemedText variant="labelSm" style={styles.debugTitle}>
          EXPO PUSH TOKEN
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.debugText} numberOfLines={1} ellipsizeMode="tail">
          {expoPushToken ?? 'Loading/No token available...'}
        </ThemedText>
        
        <ThemedText variant="labelSm" style={[styles.debugTitle, { marginTop: 8 }]}>
          LATEST PUSH NOTIFICATION TITLE
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.debugText}>
          {notification?.request?.content?.title ?? 'No notification received yet'}
        </ThemedText>
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
            const isExpanded = !!expandedDays[group.dayName];
            const hasItems = group.items.length > 0;
            const count = group.items.length;

            return (
              <View key={group.dayName} style={styles.dayGroup}>
                <Pressable
                  onPress={() => toggleDayExpand(group.dayName)}
                  style={({ pressed }) => [
                    styles.dayHeaderBar,
                    isToday && styles.dayHeaderBarToday,
                    pressed && styles.dayHeaderBarPressed,
                  ]}
                >
                  <View style={styles.dayHeaderLeft}>
                    <ThemedText
                      variant="bodyMd"
                      style={[styles.dayHeaderName, isToday && styles.dayHeaderNameToday]}
                    >
                      {group.dayName}
                    </ThemedText>
                    {isToday && (
                      <View style={styles.todayPill}>
                        <ThemedText variant="labelSm" style={styles.todayPillText}>
                          TODAY
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={styles.dayHeaderRight}>
                    <View style={[styles.countBadge, count > 0 && styles.countBadgeActive]}>
                      <ThemedText
                        variant="labelSm"
                        style={[styles.countBadgeText, count > 0 && styles.countBadgeTextActive]}
                      >
                        {count}
                      </ThemedText>
                    </View>

                    {isExpanded ? (
                      <ChevronDown size={16} color={theme.colors.secondary} strokeWidth={2} />
                    ) : (
                      <ChevronRight size={16} color={theme.colors.secondary} strokeWidth={2} />
                    )}
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {!hasItems ? (
                      <View style={styles.emptyDayRow}>
                        <ThemedText variant="labelSm" style={styles.emptyDayText}>
                          No commitments scheduled
                        </ThemedText>
                      </View>
                    ) : (
                      group.items.map((c) => (
                        <CommitmentRow key={c.id} commitment={c} />
                      ))
                    )}
                  </View>
                )}
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
    marginBottom: theme.spacing.sm,
  },
  dayHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: '#1B2A47',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dayHeaderBarToday: {
    borderColor: 'rgba(185, 199, 228, 0.4)',
    backgroundColor: 'rgba(185, 199, 228, 0.05)',
  },
  dayHeaderBarPressed: {
    opacity: 0.85,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayHeaderName: {
    fontFamily: 'Inter_600SemiBold',
    color: '#E2E2E2',
  },
  dayHeaderNameToday: {
    color: theme.colors.primary,
  },
  todayPill: {
    backgroundColor: 'rgba(185, 199, 228, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  todayPillText: {
    color: theme.colors.primary,
    fontSize: 9,
    letterSpacing: 0.5,
    fontFamily: 'Inter_600SemiBold',
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(185, 199, 228, 0.2)',
  },
  countBadgeText: {
    fontSize: 10,
    color: theme.colors.secondary,
    fontFamily: 'Inter_600SemiBold',
  },
  countBadgeTextActive: {
    color: theme.colors.primary,
  },
  expandedContent: {
    paddingTop: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  emptyDayRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  emptyDayText: {
    color: theme.colors.secondary,
    fontSize: 11,
  },
  debugBox: {
    backgroundColor: 'rgba(185, 199, 228, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(185, 199, 228, 0.15)',
    borderRadius: theme.radius.xl,
    padding: 16,
    marginBottom: theme.spacing.lg,
  },
  debugTitle: {
    color: theme.colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  debugText: {
    color: '#E2E2E2',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
