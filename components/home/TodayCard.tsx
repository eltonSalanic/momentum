import * as Haptics from 'expo-haptics';
import { AlertCircle, Check, Circle, Clock, RotateCcw, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '../../constants/theme';
import type { TodayCommitment } from '../../hooks/useCommitments';
import { COMMITMENT_TYPES, DEADLINE_TYPES } from '../../types/commitment';
import { Button } from '../ui/Button';
import { ThemedText } from '../ui/ThemedText';

interface TodayCardProps {
  commitment: TodayCommitment;
  onCheckIn: (id: string) => void;
}

function formatDeadline(commitment: TodayCommitment): string {
  if (commitment.deadline_type === DEADLINE_TYPES.END_OF_DAY) {
    return 'Due by 11:59 PM';
  }
  if (commitment.deadline_time) {
    const [h, m] = commitment.deadline_time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `Due by ${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }
  return 'Due today';
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function TodayCard({ commitment, onCheckIn }: TodayCardProps) {
  const scale = useSharedValue(1);
  const checked = commitment.isCheckedIn;
  const isMissed = commitment.isMissed;
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handlePress = () => {
    if (checked || isMissed) return;
    setIsModalVisible(true);
  };

  const handleConfirmCheckIn = () => {
    setIsModalVisible(false);
    scale.value = withSpring(0.97, { damping: 15 }, () => {
      scale.value = withSpring(1);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCheckIn(commitment.id);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withTiming(checked ? 0.55 : isMissed ? 0.85 : 1, { duration: 300 }),
  }));

  const isRoutine = commitment.type === COMMITMENT_TYPES.ROUTINE;

  return (
    <>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          disabled={checked || isMissed}
          style={({ pressed }) => [
            styles.card,
            checked && styles.cardChecked,
            isMissed && styles.cardMissed,
            pressed && !checked && !isMissed && styles.cardPressed,
          ]}
        >
          {/* Left accent bar */}
          <View
            style={[
              styles.accent,
              checked && styles.accentChecked,
              isMissed && styles.accentMissed,
            ]}
          />

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.topRow}>
              {/* Type chip and missed badge */}
              <View style={styles.typeRow}>
                <View style={styles.typeChip}>
                  {isRoutine ? (
                    <RotateCcw
                      size={10}
                      color={isMissed ? theme.colors.error : theme.colors.primary}
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Target
                      size={10}
                      color={isMissed ? theme.colors.error : theme.colors.primary}
                      strokeWidth={2.5}
                    />
                  )}
                  <ThemedText
                    variant="labelSm"
                    style={[styles.typeLabel, isMissed && styles.typeLabelMissed]}
                  >
                    {isRoutine ? 'ROUTINE' : 'TASK'}
                  </ThemedText>
                </View>

                {isMissed && (
                  <View style={styles.missedBadge}>
                    <ThemedText variant="labelSm" style={styles.missedText}>
                      MISSED
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Penalty badge */}
              <View style={[styles.penaltyBadge, isMissed && styles.penaltyBadgeMissed]}>
                <ThemedText variant="labelSm" style={styles.penaltyText}>
                  {formatAmount(commitment.amount_cents)}
                </ThemedText>
              </View>
            </View>

            <ThemedText variant="bodyMd" style={[styles.title, checked && styles.titleChecked]}>
              {commitment.title}
            </ThemedText>

            <View style={styles.deadlineRow}>
              <Clock
                size={12}
                color={isMissed ? theme.colors.error : theme.colors.textMuted}
                strokeWidth={2}
              />
              <ThemedText
                variant="labelSm"
                style={[styles.deadline, isMissed && styles.deadlineMissed]}
              >
                {formatDeadline(commitment)}
              </ThemedText>
            </View>
          </View>

          {/* Checkbox */}
          <View style={styles.checkboxContainer}>
            {checked ? (
              <View style={styles.checkboxFilled}>
                <Check size={16} color={theme.colors.onPrimary} strokeWidth={3} />
              </View>
            ) : isMissed ? (
              <AlertCircle size={28} color={theme.colors.error} strokeWidth={2} />
            ) : (
              <Circle size={28} color={theme.colors.secondary} strokeWidth={1.5} />
            )}
          </View>
        </Pressable>
      </Animated.View>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismissOverlay} onPress={() => setIsModalVisible(false)} />

          <View style={styles.modalContent}>
            {/* Header Icon */}
            <View style={styles.modalIconContainer}>
              {isRoutine ? (
                <RotateCcw size={28} color={theme.colors.primary} strokeWidth={2} />
              ) : (
                <Target size={28} color={theme.colors.primary} strokeWidth={2} />
              )}
            </View>

            {/* Title */}
            <ThemedText variant="headlineMd" style={styles.modalTitle}>
              Verify Commitment
            </ThemedText>

            {/* Subtitle */}
            <ThemedText variant="bodyMd" style={styles.modalText}>
              Are you sure you have completed your commitment for today?
            </ThemedText>

            <View style={styles.commitmentNameContainer}>
              <ThemedText variant="labelMd" style={styles.commitmentName}>
                {commitment.title}
              </ThemedText>
            </View>

            <ThemedText variant="labelSm" style={styles.modalDisclaimer}>
              Momentum relies on your honesty. Your stakes are{' '}
              {formatAmount(commitment.amount_cents)}.
            </ThemedText>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <Button
                label="Cancel"
                variant="ghost"
                style={styles.modalButton}
                onPress={() => setIsModalVisible(false)}
              />
              <Button
                label="Yes, I did it"
                style={styles.modalButton}
                onPress={handleConfirmCheckIn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  cardChecked: {
    borderColor: 'rgba(185, 199, 228, 0.1)',
  },
  cardMissed: {
    borderColor: 'rgba(255, 180, 171, 0.35)',
    backgroundColor: 'rgba(255, 180, 171, 0.03)',
  },
  cardPressed: {
    backgroundColor: 'rgba(185, 199, 228, 0.05)',
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.primary,
  },
  accentChecked: {
    backgroundColor: theme.colors.secondary,
    opacity: 0.4,
  },
  accentMissed: {
    backgroundColor: theme.colors.error,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeLabel: {
    color: theme.colors.primary,
    fontSize: 10,
    letterSpacing: 1,
  },
  typeLabelMissed: {
    color: theme.colors.error,
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
  title: {
    fontFamily: 'Inter_500Medium',
  },
  titleChecked: {
    textDecorationLine: 'line-through',
    color: theme.colors.secondary,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deadline: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  deadlineMissed: {
    color: theme.colors.error,
  },
  checkboxContainer: {
    paddingRight: theme.spacing.md,
  },
  checkboxFilled: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 20, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(185, 199, 228, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#E2E2E2',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    textAlign: 'center',
  },
  modalText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  commitmentNameContainer: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  commitmentName: {
    color: theme.colors.primary,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  modalDisclaimer: {
    color: theme.colors.secondary,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginVertical: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});
