import { Calendar, Clock, RotateCcw, Target } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../ui/ThemedText';
import { theme } from '../../constants/theme';
import { COMMITMENT_TYPES, DEADLINE_TYPES } from '../../types/commitment';
import type { Commitment } from '../../types/commitment';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface CommitmentRowProps {
  commitment: Commitment;
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatDueDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDeadlineInfo(commitment: Commitment): string {
  if (commitment.deadline_type === DEADLINE_TYPES.END_OF_DAY) {
    return 'End of Day';
  }
  if (commitment.deadline_time) {
    const [h, m] = commitment.deadline_time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }
  return '';
}

function getLocalTodayStr(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function CommitmentRow({ commitment }: CommitmentRowProps) {
  const isRoutine = commitment.type === COMMITMENT_TYPES.ROUTINE;
  const isMissed = !isRoutine && commitment.due_date != null && commitment.due_date < getLocalTodayStr();

  return (
    <View style={[styles.card, isMissed && styles.cardMissed]}>
      <View style={styles.header}>
        {/* Type + Title */}
        <View style={styles.titleRow}>
          <View style={[styles.iconContainer, isMissed && styles.iconContainerMissed]}>
            {isRoutine ? (
              <RotateCcw size={14} color={isMissed ? theme.colors.error : theme.colors.primary} strokeWidth={2} />
            ) : (
              <Target size={14} color={isMissed ? theme.colors.error : theme.colors.primary} strokeWidth={2} />
            )}
          </View>
          <ThemedText variant="bodyMd" style={[styles.title, isMissed && styles.titleMissed]} numberOfLines={1}>
            {commitment.title}
          </ThemedText>
          {isMissed && (
            <View style={styles.missedBadge}>
              <ThemedText variant="labelSm" style={styles.missedText}>
                MISSED
              </ThemedText>
            </View>
          )}
        </View>

        {/* Penalty */}
        <View style={[styles.penaltyBadge, isMissed && styles.penaltyBadgeMissed]}>
          <ThemedText variant="labelSm" style={styles.penaltyText}>
            {formatAmount(commitment.amount_cents)}
          </ThemedText>
        </View>
      </View>

      {/* Schedule info */}
      <View style={styles.meta}>
        {isRoutine && commitment.check_in_days ? (
          <View style={styles.daysRow}>
            {DAY_LETTERS.map((letter, i) => (
              <View
                key={i}
                style={[
                  styles.dayDot,
                  commitment.check_in_days![i] && styles.dayDotActive,
                ]}
              >
                <ThemedText
                  variant="labelSm"
                  style={[
                    styles.dayLetter,
                    commitment.check_in_days![i] && styles.dayLetterActive,
                  ]}
                >
                  {letter}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.dueDateRow}>
            <Calendar size={11} color={isMissed ? theme.colors.error : theme.colors.textMuted} strokeWidth={2} />
            <ThemedText variant="labelSm" style={[styles.metaText, isMissed && styles.metaTextMissed]}>
              {commitment.due_date ? formatDueDate(commitment.due_date) : 'No date'}
            </ThemedText>
          </View>
        )}

        <View style={styles.deadlineRow}>
          <Clock size={11} color={isMissed ? theme.colors.error : theme.colors.textMuted} strokeWidth={2} />
          <ThemedText variant="labelSm" style={[styles.metaText, isMissed && styles.metaTextMissed]}>
            {formatDeadlineInfo(commitment)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 14,
    marginBottom: theme.spacing.sm,
    gap: 10,
  },
  cardMissed: {
    borderColor: 'rgba(255, 180, 171, 0.35)',
    backgroundColor: 'rgba(255, 180, 171, 0.02)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: theme.spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(185, 199, 228, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerMissed: {
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
  },
  title: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
  },
  titleMissed: {
    color: theme.colors.textMuted,
  },
  missedBadge: {
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  missedText: {
    color: theme.colors.error,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  penaltyBadge: {
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  penaltyBadgeMissed: {
    backgroundColor: 'rgba(255, 180, 171, 0.25)',
  },
  penaltyText: {
    color: theme.colors.error,
    fontSize: 11,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 36, // align with title (icon width 28 + gap 8)
  },
  daysRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: 'rgba(185, 199, 228, 0.2)',
  },
  dayLetter: {
    fontSize: 9,
    color: theme.colors.secondary,
    letterSpacing: 0,
  },
  dayLetterActive: {
    color: theme.colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  metaTextMissed: {
    color: theme.colors.error,
  },
});
