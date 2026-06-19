import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarRange,
  Check,
  Clock,
  DollarSign,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ThemedText } from '../../../components/ui/ThemedText';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  COMMITMENT_TYPES,
  CommitmentType,
  DEADLINE_TYPES,
  DeadlineType,
} from '../../../types/commitment';

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const STAKE_PRESETS = [5, 10, 20, 50];

export default function CreateCommitmentScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  // Wizard state
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CommitmentType>(COMMITMENT_TYPES.ROUTINE);
  const [checkInDays, setCheckInDays] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    false,
    false,
  ]); // Mon-Fri default
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [amountCents, setAmountCents] = useState(500); // Default $5
  const [customStake, setCustomStake] = useState('');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>(DEADLINE_TYPES.END_OF_DAY);
  const [deadlineTime, setDeadlineTime] = useState('06:00'); // Default 6:00
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM'); // Default PM

  // Calendar State
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Handle step transitions
  const nextStep = () => {
    if (step === 1 && !title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (step === 2 && type === COMMITMENT_TYPES.ROUTINE && !checkInDays.includes(true)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Selection Required',
        'Please select at least one check-in day for your Routine.',
      );
      return;
    }
    if (step === 2 && type === COMMITMENT_TYPES.TASK && !dueDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Date Required', 'Please select a deadline date for your Task.');
      return;
    }
    if (step === 3 && deadlineType === DEADLINE_TYPES.SPECIFIC_TIME) {
      const [hoursStr, minutesStr] = deadlineTime.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 1 ||
        hours > 12 ||
        minutes < 0 ||
        minutes > 59 ||
        deadlineTime.length !== 5
      ) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Invalid Time',
          'Please enter a valid time in 12-hour format (e.g., 01:00 to 12:59).',
        );
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Toggle routine day selections
  const toggleDay = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDays = [...checkInDays];
    newDays[index] = !newDays[index];
    setCheckInDays(newDays);
  };

  // Custom Inline Calendar logic
  const getDaysInMonth = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay(); // 0 is Sunday, 1 is Monday...
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Shift Sunday to end of week index (6) for Mon-Sun calendar layout
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Pad starting empty days
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    // Fill month days
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const calendarDays = getDaysInMonth(calMonth, calYear);
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const selectDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return; // Cannot pick a past date
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDueDate(date);
  };

  // Time handling logic
  const handleTimeChange = (text: string) => {
    // Basic auto-formatting for HH:MM text
    let formatted = text.replace(/[^0-9]/g, '');
    if (formatted.length > 4) {
      formatted = formatted.substring(0, 4);
    }

    if (formatted.length > 2) {
      formatted = `${formatted.substring(0, 2)}:${formatted.substring(2)}`;
    }

    setDeadlineTime(formatted);
  };

  // Submit to Supabase
  const handleCreate = async () => {
    if (!user) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      let dbDeadlineTime = null;
      if (deadlineType === DEADLINE_TYPES.SPECIFIC_TIME) {
        const [hoursStr, minutesStr] = deadlineTime.split(':');
        let hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
          if (timePeriod === 'PM' && hours < 12) {
            hours += 12;
          } else if (timePeriod === 'AM' && hours === 12) {
            hours = 0;
          }
          const padHours = hours < 10 ? `0${hours}` : `${hours}`;
          const padMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
          dbDeadlineTime = `${padHours}:${padMinutes}`;
        } else {
          dbDeadlineTime = '18:00'; // Fallback
        }
      }

      let error;

      if (type === COMMITMENT_TYPES.ROUTINE) {
        ({ error } = await supabase.from('routines').insert({
          user_id: user.id,
          title: title.trim(),
          amount_cents: amountCents,
          check_in_days: checkInDays,
          deadline_type: deadlineType,
          deadline_time: dbDeadlineTime,
          status: 'active',
        }));
      } else {
        if (!dueDate) {
          throw new Error('Please select a deadline date for your Task.');
        }
        const formattedDate = dueDate.toISOString().split('T')[0];
        ({ error } = await supabase.from('tasks').insert({
          user_id: user.id,
          title: title.trim(),
          amount_cents: amountCents,
          due_date: formattedDate,
          checked_in: false,
          deadline_type: deadlineType,
          deadline_time: dbDeadlineTime,
          status: 'active',
        }));
      }

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error Creating Commitment', e.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick stats formatting
  const getScheduleSummary = () => {
    if (type === COMMITMENT_TYPES.ROUTINE) {
      const activeDays = DAYS_SHORT.filter((_, i) => checkInDays[i]);
      if (activeDays.length === 7) return 'Everyday';
      if (activeDays.length === 5 && !checkInDays[5] && !checkInDays[6]) return 'Weekdays';
      if (activeDays.length === 2 && checkInDays[5] && checkInDays[6]) return 'Weekends';
      return activeDays.join(', ');
    } else {
      return dueDate
        ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'No date set';
    }
  };

  const getDeadlineSummary = () => {
    if (deadlineType === DEADLINE_TYPES.END_OF_DAY) return 'End of Day (11:59 PM)';
    return `${deadlineTime} ${timePeriod}`;
  };

  // Render sub-components representing form steps
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.card}>
            <ThemedText variant="headlineMd" style={styles.stepTitle}>
              What is your commitment?
            </ThemedText>
            <ThemedText variant="bodyMd" style={styles.stepSubtitle}>
              What are you promising to complete? Be specific so you stay honest.
            </ThemedText>

            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === COMMITMENT_TYPES.ROUTINE && styles.typeButtonActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setType(COMMITMENT_TYPES.ROUTINE);
                }}
              >
                <CalendarRange
                  size={20}
                  color={
                    type === COMMITMENT_TYPES.ROUTINE
                      ? theme.colors.onPrimary
                      : theme.colors.secondary
                  }
                />
                <ThemedText
                  variant="labelMd"
                  style={{
                    color:
                      type === COMMITMENT_TYPES.ROUTINE
                        ? theme.colors.onPrimary
                        : theme.colors.text,
                    textAlign: 'center',
                    flexShrink: 1,
                  }}
                >
                  Routine
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === COMMITMENT_TYPES.TASK && styles.typeButtonActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setType(COMMITMENT_TYPES.TASK);
                }}
              >
                <Calendar
                  size={20}
                  color={
                    type === COMMITMENT_TYPES.TASK ? theme.colors.onPrimary : theme.colors.secondary
                  }
                />
                <ThemedText
                  variant="labelMd"
                  style={{
                    color:
                      type === COMMITMENT_TYPES.TASK ? theme.colors.onPrimary : theme.colors.text,
                    textAlign: 'center',
                    flexShrink: 1,
                  }}
                >
                  One-time Task
                </ThemedText>
              </TouchableOpacity>
            </View>

            <Input
              label="Commitment Title"
              placeholder={
                type === COMMITMENT_TYPES.ROUTINE
                  ? 'e.g. Hit the gym for 45 mins'
                  : 'e.g. Wash and vacuum the car'
              }
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.card}>
            {type === COMMITMENT_TYPES.ROUTINE ? (
              <>
                <ThemedText variant="headlineMd" style={styles.stepTitle}>
                  Select active days.
                </ThemedText>
                <ThemedText variant="bodyMd" style={styles.stepSubtitle}>
                  Choose which days of the week you must complete this Routine.
                </ThemedText>

                <View style={styles.daysBubbleContainer}>
                  {DAYS_FULL.map((day, i) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayRow, checkInDays[i] && styles.dayRowActive]}
                      onPress={() => toggleDay(i)}
                    >
                      <View style={[styles.checkbox, checkInDays[i] && styles.checkboxActive]}>
                        {checkInDays[i] && (
                          <Check size={14} color={theme.colors.onPrimary} strokeWidth={3} />
                        )}
                      </View>
                      <ThemedText
                        style={[styles.dayRowText, checkInDays[i] && styles.dayRowTextActive]}
                      >
                        {day}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <ThemedText variant="headlineMd" style={styles.stepTitle}>
                  Select completion deadline.
                </ThemedText>
                <ThemedText variant="bodyMd" style={styles.stepSubtitle}>
                  By what date must this Task be finished?
                </ThemedText>

                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={handlePrevMonth} style={styles.calNav}>
                      <ArrowLeft size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <ThemedText variant="labelMd" style={styles.calendarHeaderTitle}>
                      {`${monthNames[calMonth]} ${calYear}`.toUpperCase()}
                    </ThemedText>
                    <TouchableOpacity onPress={handleNextMonth} style={styles.calNav}>
                      <ArrowRight size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarWeekdays}>
                    {DAY_LETTERS.map((letter, i) => (
                      <ThemedText key={i} variant="labelSm" style={styles.weekdayText}>
                        {letter}
                      </ThemedText>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {calendarDays.map((dateObj, idx) => {
                      if (!dateObj) {
                        return <View key={`empty-${idx}`} style={styles.calendarDayCell} />;
                      }

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isPast = dateObj < today;
                      const isSelected = dueDate?.getTime() === dateObj.getTime();
                      const isTodayDate = today.getTime() === dateObj.getTime();

                      return (
                        <TouchableOpacity
                          key={dateObj.toISOString()}
                          disabled={isPast}
                          style={[
                            styles.calendarDayCell,
                            isSelected && styles.calendarDaySelected,
                            isTodayDate && !isSelected && styles.calendarDayToday,
                          ]}
                          onPress={() => selectDate(dateObj)}
                        >
                          <ThemedText
                            style={[
                              styles.calendarDayText,
                              isPast && styles.calendarDayPastText,
                              isSelected && styles.calendarDaySelectedText,
                              isTodayDate && !isSelected && styles.calendarDayTodayText,
                            ]}
                          >
                            {dateObj.getDate()}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                {dueDate && (
                  <View style={styles.selectedDateBadge}>
                    <Calendar size={16} color={theme.colors.primary} />
                    <ThemedText
                      variant="labelMd"
                      color="primary"
                      style={styles.selectedDateBadgeText}
                    >
                      Deadline: {getScheduleSummary()}
                    </ThemedText>
                  </View>
                )}
              </>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.card}>
            <ThemedText variant="headlineMd" style={styles.stepTitle}>
              Set the stakes.
            </ThemedText>
            <ThemedText variant="bodyMd" style={styles.stepSubtitle}>
              How much are you willing to pay if you miss a deadline? Attach real consequences.
            </ThemedText>

            <View style={styles.presetsGrid}>
              {STAKE_PRESETS.map((preset) => {
                const cents = preset * 100;
                const isActive = amountCents === cents;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetCard, isActive && styles.presetCardActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAmountCents(cents);
                      setCustomStake('');
                    }}
                  >
                    <DollarSign
                      size={20}
                      color={isActive ? theme.colors.onPrimary : theme.colors.secondary}
                    />
                    <ThemedText
                      variant="headlineMd"
                      style={[styles.presetText, isActive && styles.presetTextActive]}
                    >
                      {preset}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Custom Stakes ($ USD)"
              placeholder="e.g. 15"
              keyboardType="numeric"
              value={customStake}
              onChangeText={(text) => {
                setCustomStake(text);
                const parsed = parseFloat(text);
                setAmountCents(isNaN(parsed) ? 0 : Math.round(parsed * 100));
              }}
            />

            <View style={styles.deadlineSection}>
              <ThemedText variant="labelMd" style={styles.sectionLabel}>
                DEADLINE TIMING
              </ThemedText>

              <View style={styles.deadlineToggles}>
                <TouchableOpacity
                  style={[
                    styles.deadlineToggle,
                    deadlineType === DEADLINE_TYPES.END_OF_DAY && styles.deadlineToggleActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDeadlineType(DEADLINE_TYPES.END_OF_DAY);
                  }}
                >
                  <Clock
                    size={16}
                    color={
                      deadlineType === DEADLINE_TYPES.END_OF_DAY
                        ? theme.colors.onPrimary
                        : theme.colors.secondary
                    }
                  />
                  <ThemedText
                    variant="labelSm"
                    style={{
                      color:
                        deadlineType === DEADLINE_TYPES.END_OF_DAY
                          ? theme.colors.onPrimary
                          : theme.colors.text,
                    }}
                  >
                    End of Day
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deadlineToggle,
                    deadlineType === DEADLINE_TYPES.SPECIFIC_TIME && styles.deadlineToggleActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDeadlineType(DEADLINE_TYPES.SPECIFIC_TIME);
                  }}
                >
                  <Clock
                    size={16}
                    color={
                      deadlineType === DEADLINE_TYPES.SPECIFIC_TIME
                        ? theme.colors.onPrimary
                        : theme.colors.secondary
                    }
                  />
                  <ThemedText
                    variant="labelSm"
                    style={{
                      color:
                        deadlineType === DEADLINE_TYPES.SPECIFIC_TIME
                          ? theme.colors.onPrimary
                          : theme.colors.text,
                    }}
                  >
                    Specific Time
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {deadlineType === DEADLINE_TYPES.SPECIFIC_TIME && (
                <View style={styles.timeInputContainer}>
                  <Clock size={18} color={theme.colors.primary} />
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    placeholder="06:00"
                    placeholderTextColor={theme.colors.textMuted}
                    maxLength={5}
                    value={deadlineTime}
                    onChangeText={handleTimeChange}
                  />
                  <View style={styles.periodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        timePeriod === 'AM' && styles.periodButtonActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTimePeriod('AM');
                      }}
                    >
                      <ThemedText
                        variant="labelSm"
                        style={[styles.periodText, timePeriod === 'AM' && styles.periodTextActive]}
                      >
                        AM
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        timePeriod === 'PM' && styles.periodButtonActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTimePeriod('PM');
                      }}
                    >
                      <ThemedText
                        variant="labelSm"
                        style={[styles.periodText, timePeriod === 'PM' && styles.periodTextActive]}
                      >
                        PM
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.card}>
            <ThemedText variant="headlineMd" style={styles.stepTitle}>
              Review your commitment.
            </ThemedText>
            <ThemedText variant="bodyMd" style={styles.stepSubtitle}>
              Make sure you can back this up. Integrity is the foundation of stalld.
            </ThemedText>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>COMMITMENT</ThemedText>
                <ThemedText style={styles.summaryTitleText}>{title}</ThemedText>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>TYPE</ThemedText>
                <ThemedText style={styles.summaryValueText}>
                  {type === COMMITMENT_TYPES.ROUTINE ? 'Recurring Routine' : 'One-time Task'}
                </ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>SCHEDULE</ThemedText>
                <ThemedText style={styles.summaryValueText} numberOfLines={2}>
                  {getScheduleSummary()}
                </ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>DEADLINE TIME</ThemedText>
                <ThemedText style={styles.summaryValueText}>{getDeadlineSummary()}</ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>STAKES</ThemedText>
                <ThemedText style={styles.summaryValueTextHighlight}>
                  ${(amountCents / 100).toFixed(2)} per miss
                </ThemedText>
              </View>
            </View>

            <View style={styles.alertBox}>
              <ThemedText variant="labelSm" style={styles.alertText}>
                ⚠️ BY ACTIVATING: Failing to check-in before this deadline will result in an
                automatic charge of ${(amountCents / 100).toFixed(2)}. No exceptions, no excuses.
              </ThemedText>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (!profile?.has_payment_method) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockContainer}>
          <View style={styles.lockIconCircle}>
            <DollarSign size={48} color={theme.colors.primary} strokeWidth={2.5} />
          </View>
          <ThemedText variant="display" style={styles.lockTitle}>
            Stakes Required
          </ThemedText>
          <ThemedText variant="bodyLg" style={styles.lockSubtitle}>
            stalld helps you stay consistent by attaching real financial consequences to your
            commitments.
          </ThemedText>
          <ThemedText variant="bodyMd" style={styles.lockHint}>
            Please register a payment method first to set up your stake and start building momentum.
          </ThemedText>
          <View style={styles.lockFooter}>
            <Button
              label="Add Payment Method"
              onPress={() => {
                router.back();
                router.push('/(app)/(tabs)/settings');
              }}
              variant="primary"
            />
            <Button label="Back" onPress={() => router.back()} variant="ghost" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Bar with Step Title & Exit button */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelSm" color="secondary" style={styles.stepText}>
                STEP {step} OF 4
              </ThemedText>
              <ThemedText variant="headlineMd" style={styles.mainTitle}>
                {type === 'routine' ? 'New Routine' : 'New Task'}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <ThemedText variant="labelSm" color="textMuted">
                CLOSE
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Sleek Animated Progress Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: `${step * 25}%` }]} />
            </View>
          </View>

          {/* Sliding step layout box */}
          <View style={styles.wizardContainer}>{renderStepContent()}</View>
        </ScrollView>

        {/* Dynamic Sticky Bottom Navigation Footer */}
        <View style={styles.footer}>
          {step > 1 ? (
            <TouchableOpacity onPress={prevStep} style={styles.backLink}>
              <ArrowLeft size={16} color={theme.colors.textMuted} />
              <ThemedText style={{ color: theme.colors.textMuted }}>Back</ThemedText>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {step < 4 ? (
            <Button
              label="Next"
              onPress={nextStep}
              disabled={step === 1 && !title.trim()}
              style={styles.actionBtn}
            />
          ) : (
            <Button
              label={isSubmitting ? 'Activating Commitments...' : 'Activate Commitment'}
              onPress={handleCreate}
              isLoading={isSubmitting}
              style={styles.actionBtn}
            />
          )}
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
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl * 1.5,
    gap: theme.spacing.lg,
  },
  lockIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(185, 199, 228, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(185, 199, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  lockTitle: {
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },
  lockSubtitle: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  lockHint: {
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  lockFooter: {
    width: '100%',
    gap: theme.spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  stepText: {
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  closeButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },
  progressBarWrapper: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  wizardContainer: {
    paddingHorizontal: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    gap: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  stepSubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  typeButton: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.sm,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  daysBubbleContainer: {
    gap: theme.spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  dayRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(185, 199, 228, 0.05)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  checkboxActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  dayRowText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  dayRowTextActive: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  calendarContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  calendarHeaderTitle: {
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  calNav: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },
  calendarWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  weekdayText: {
    width: 32,
    textAlign: 'center',
    color: theme.colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  calendarDayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarDaySelected: {
    backgroundColor: theme.colors.primary,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  calendarDayText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  calendarDayTodayText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  calendarDayPastText: {
    color: 'rgba(100, 116, 139, 0.3)', // Disabled slate grey
  },
  calendarDaySelectedText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(185, 199, 228, 0.1)',
    borderRadius: theme.radius.full,
  },
  selectedDateBadgeText: {
    fontWeight: 'bold',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  presetCard: {
    flex: 1,
    minWidth: 80,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  presetCardActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  presetTextActive: {
    color: theme.colors.onPrimary,
  },
  deadlineSection: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
  },
  deadlineToggles: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  deadlineToggle: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
  },
  deadlineToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 52,
  },
  timeInput: {
    width: 60,
    height: '100%',
    color: theme.colors.text,
    fontFamily: theme.typography.bodyMd.fontFamily,
    fontSize: 18,
    fontWeight: 'bold',
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.radius.sm,
    padding: 2,
    marginLeft: 'auto',
  },
  periodButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  periodTextActive: {
    color: theme.colors.onPrimary,
  },
  summaryCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  summaryRow: {
    gap: 4,
  },
  summaryLabel: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  summaryTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryValueText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  summaryValueTextHighlight: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.outline,
    marginVertical: theme.spacing.xs,
  },
  alertBox: {
    backgroundColor: 'rgba(255, 180, 171, 0.08)',
    borderColor: 'rgba(255, 180, 171, 0.2)',
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  alertText: {
    color: theme.colors.error,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  actionBtn: {
    width: 180,
  },
});
