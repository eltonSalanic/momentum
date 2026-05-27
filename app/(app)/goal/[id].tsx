import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Calendar, CalendarRange, Check, Clock, DollarSign, Pause, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ThemedText } from '../../../components/ui/ThemedText';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  COMMITMENT_TYPES,
  Commitment,
  CommitmentType,
  DEADLINE_TYPES,
  DeadlineType,
} from '../../../types/commitment';

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STAKE_PRESETS = [5, 10, 20, 50];

export default function EditCommitmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Page state
  const [isLoadingGoal, setIsLoadingGoal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPauseModalVisible, setIsPauseModalVisible] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CommitmentType>(COMMITMENT_TYPES.ROUTINE);
  const [checkInDays, setCheckInDays] = useState<boolean[]>([true, true, true, true, true, false, false]); // Mon-Fri default
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [amountCents, setAmountCents] = useState(500); // Default $5
  const [customStake, setCustomStake] = useState('');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>(DEADLINE_TYPES.END_OF_DAY);
  const [deadlineTime, setDeadlineTime] = useState('06:00'); // Default 6:00
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM'); // Default PM

  // Calendar navigation state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchGoalDetails();
  }, [id]);

  const fetchGoalDetails = async () => {
    if (!id) return;
    try {
      setIsLoadingGoal(true);
      // Query the commitments view — returns unified shape for both routines and tasks
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // The `commitments` view fields are nullable in generated types
      // (because the view is a UNION). At runtime each row is a complete
      // Routine or Task shape — narrow via discriminated union.
      const commitment = data as Commitment | null;

      if (commitment) {
        setTitle(commitment.title);
        setType(commitment.type);
        setAmountCents(commitment.amount_cents);
        setIsPaused(commitment.status === 'paused');
        
        const amountCentsVal = commitment.amount_cents;
        const matchingPreset = STAKE_PRESETS.find((p) => p * 100 === amountCentsVal);
        if (!matchingPreset) {
          setCustomStake((amountCentsVal / 100).toString());
        }

        if (commitment.type === COMMITMENT_TYPES.ROUTINE && commitment.check_in_days) {
          setCheckInDays(commitment.check_in_days);
        }
        if (commitment.type === COMMITMENT_TYPES.TASK && commitment.due_date) {
          setDueDate(new Date(commitment.due_date + 'T00:00:00'));
          const parts = commitment.due_date.split('-');
          setCalMonth(parseInt(parts[1], 10) - 1);
          setCalYear(parseInt(parts[0], 10));
        }
        setDeadlineType(commitment.deadline_type);

        if (commitment.deadline_time) {
          const [hStr, mStr] = commitment.deadline_time.split(':');
          let hours = parseInt(hStr, 10);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayH = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          setDeadlineTime(`${String(displayH).padStart(2, '0')}:${mStr}`);
          setTimePeriod(period);
        }
      }
    } catch (e: any) {
      console.error('Error fetching goal details:', e);
      Alert.alert('Error', 'Failed to retrieve commitment details.');
      router.back();
    } finally {
      setIsLoadingGoal(false);
    }
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
    const firstDayIndex = date.getDay(); // 0 is Sunday
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
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
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
    let formatted = text.replace(/[^0-9]/g, '');
    if (formatted.length > 4) {
      formatted = formatted.substring(0, 4);
    }
    
    if (formatted.length > 2) {
      formatted = `${formatted.substring(0, 2)}:${formatted.substring(2)}`;
    }
    
    setDeadlineTime(formatted);
  };

  const handleSave = async () => {
    if (!user || !id) return;
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please enter a title for your commitment.');
      return;
    }
    if (type === COMMITMENT_TYPES.ROUTINE && !checkInDays.includes(true)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please select at least one check-in day for your Routine.');
      return;
    }
    if (type === COMMITMENT_TYPES.TASK && !dueDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please select a deadline date for your Task.');
      return;
    }
    if (deadlineType === DEADLINE_TYPES.SPECIFIC_TIME) {
      const [hoursStr, minutesStr] = deadlineTime.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59 || deadlineTime.length !== 5) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Invalid Time', 'Please enter a valid time in 12-hour format (e.g., 01:00 to 12:59).');
        return;
      }
    }

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
        ({ error } = await supabase
          .from('routines')
          .update({
            title: title.trim(),
            amount_cents: amountCents,
            check_in_days: checkInDays,
            deadline_type: deadlineType,
            deadline_time: dbDeadlineTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id));
      } else {
        if (!dueDate) {
          throw new Error('Please select a deadline date for your Task.');
        }
        const formattedDate = dueDate.toISOString().split('T')[0];
        ({ error } = await supabase
          .from('tasks')
          .update({
            title: title.trim(),
            amount_cents: amountCents,
            due_date: formattedDate,
            deadline_type: deadlineType,
            deadline_time: dbDeadlineTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id));
      }

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error Saving Changes', e.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async () => {
    if (!id || !user) return;
    setIsPauseModalVisible(false);
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const nextStatus = isPaused ? 'active' : 'paused';
      const pausedAt = isPaused ? null : new Date().toISOString();
      const patch = {
        status: nextStatus,
        paused_at: pausedAt,
        updated_at: new Date().toISOString(),
      };

      // Branch on type so the typed client narrows to the right table shape
      const { error } =
        type === COMMITMENT_TYPES.ROUTINE
          ? await supabase.from('routines').update(patch).eq('id', id)
          : await supabase.from('tasks').update(patch).eq('id', id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsPaused(!isPaused);
      Alert.alert(
        !isPaused ? 'Commitment Paused' : 'Commitment Resumed',
        !isPaused 
          ? 'Your commitment is now paused. Deadlines are suspended.'
          : 'Your commitment has been reactivated. Deadlines are now active.'
      );
      router.back();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (cents: number): string => {
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  };

  if (isLoadingGoal) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <ThemedText variant="bodyMd" style={{ color: theme.colors.textMuted, marginTop: 12 }}>
          Retrieving commitment details...
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="labelSm" color="secondary" style={styles.headerLabel}>
              COMMITMENT OVERVIEW
            </ThemedText>
            <ThemedText variant="headlineMd" style={styles.headerTitle}>
              Edit Commitment
            </ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <ThemedText variant="labelSm" color="textMuted">
              CLOSE
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            {/* Commitment Status — first, high visibility */}
            <View style={[styles.statusCard, isPaused ? styles.statusCardPaused : styles.statusCardActive]}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusIconWrap, isPaused ? styles.statusIconWrapPaused : styles.statusIconWrapActive]}>
                  {isPaused ? (
                    <Pause size={22} color={theme.colors.error} strokeWidth={2.5} />
                  ) : (
                    <Play size={22} color={theme.colors.primary} strokeWidth={2.5} />
                  )}
                </View>
                <View style={styles.statusCopy}>
                  <ThemedText variant="labelSm" style={[styles.statusEyebrow, isPaused && styles.statusEyebrowPaused]}>
                    COMMITMENT STATUS
                  </ThemedText>
                  <View style={styles.statusBadgeRow}>
                    <View style={[styles.statusDot, isPaused ? styles.statusDotPaused : styles.statusDotActive]} />
                    <ThemedText variant="headlineMd" style={[styles.statusLabel, isPaused ? styles.statusLabelPaused : styles.statusLabelActive]}>
                      {isPaused ? 'Paused' : 'Active'}
                    </ThemedText>
                  </View>
                  <ThemedText variant="bodyMd" style={styles.statusDescription}>
                    {isPaused
                      ? 'Deadlines and check-ins are suspended. No penalty charges while paused.'
                      : 'Deadlines are live. Check in on time to avoid penalty stakes.'}
                  </ThemedText>
                </View>
              </View>

              <Button
                label={isPaused ? 'Resume Commitment' : 'Pause Commitment'}
                variant={isPaused ? 'primary' : 'ghost'}
                style={styles.statusActionButton}
                onPress={() => {
                  if (isPaused) {
                    handleTogglePause();
                  } else {
                    setIsPauseModalVisible(true);
                  }
                }}
              />
            </View>

            {/* 1. Title Input */}
            <View style={styles.card}>
              <Input
                label="Commitment Title"
                placeholder={type === COMMITMENT_TYPES.ROUTINE ? 'e.g. Hit the gym for 45 mins' : 'e.g. Wash and vacuum the car'}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* 2. Type Selector */}
            <View style={styles.card}>
              <ThemedText variant="labelSm" color="textMuted" style={styles.sectionLabel}>
                COMMITMENT TYPE
              </ThemedText>
              
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[styles.typeButton, type === COMMITMENT_TYPES.ROUTINE && styles.typeButtonActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setType(COMMITMENT_TYPES.ROUTINE);
                  }}
                >
                  <CalendarRange size={20} color={type === COMMITMENT_TYPES.ROUTINE ? theme.colors.onPrimary : theme.colors.secondary} />
                  <ThemedText
                    variant="labelMd"
                    style={{
                      color: type === COMMITMENT_TYPES.ROUTINE ? theme.colors.onPrimary : theme.colors.text,
                      textAlign: 'center',
                      flexShrink: 1,
                    }}
                  >
                    Routine
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeButton, type === COMMITMENT_TYPES.TASK && styles.typeButtonActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setType(COMMITMENT_TYPES.TASK);
                  }}
                >
                  <Calendar size={20} color={type === COMMITMENT_TYPES.TASK ? theme.colors.onPrimary : theme.colors.secondary} />
                  <ThemedText
                    variant="labelMd"
                    style={{
                      color: type === COMMITMENT_TYPES.TASK ? theme.colors.onPrimary : theme.colors.text,
                      textAlign: 'center',
                      flexShrink: 1,
                    }}
                  >
                    One-time Task
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Schedule Toggles (Routines vs Task Calendar) */}
            <View style={styles.card}>
              {type === COMMITMENT_TYPES.ROUTINE ? (
                <>
                  <ThemedText variant="labelSm" color="textMuted" style={styles.sectionLabel}>
                    ACTIVE WEEKDAYS
                  </ThemedText>
                  
                  <View style={styles.daysBubbleContainer}>
                    {DAYS_FULL.map((day, i) => (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayRow, checkInDays[i] && styles.dayRowActive]}
                        onPress={() => toggleDay(i)}
                      >
                        <View style={[styles.checkbox, checkInDays[i] && styles.checkboxActive]}>
                          {checkInDays[i] && <Check size={14} color={theme.colors.onPrimary} strokeWidth={3} />}
                        </View>
                        <ThemedText style={[styles.dayRowText, checkInDays[i] && styles.dayRowTextActive]}>
                          {day}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <ThemedText variant="labelSm" color="textMuted" style={styles.sectionLabel}>
                    DUE DEADLINE DATE
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
                      <ThemedText variant="labelMd" color="primary" style={styles.selectedDateBadgeText}>
                        Selected: {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* 4. Stakes / Penalty Presets */}
            <View style={styles.card}>
              <ThemedText variant="labelSm" color="textMuted" style={styles.sectionLabel}>
                PENALTY CONSEQUENCE STAKES
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
                      <DollarSign size={18} color={isActive ? theme.colors.onPrimary : theme.colors.secondary} />
                      <ThemedText variant="headlineMd" style={[styles.presetText, isActive && styles.presetTextActive]}>
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
            </View>

            {/* 5. Deadline Timing */}
            <View style={styles.card}>
              <ThemedText variant="labelSm" color="textMuted" style={styles.sectionLabel}>
                DEADLINE TIMING
              </ThemedText>
              
              <View style={styles.deadlineToggles}>
                <TouchableOpacity
                  style={[styles.deadlineToggle, deadlineType === DEADLINE_TYPES.END_OF_DAY && styles.deadlineToggleActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDeadlineType(DEADLINE_TYPES.END_OF_DAY);
                  }}
                >
                  <Clock size={16} color={deadlineType === DEADLINE_TYPES.END_OF_DAY ? theme.colors.onPrimary : theme.colors.secondary} />
                  <ThemedText variant="labelSm" style={{ color: deadlineType === DEADLINE_TYPES.END_OF_DAY ? theme.colors.onPrimary : theme.colors.text }}>
                    End of Day
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deadlineToggle, deadlineType === DEADLINE_TYPES.SPECIFIC_TIME && styles.deadlineToggleActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDeadlineType(DEADLINE_TYPES.SPECIFIC_TIME);
                  }}
                >
                  <Clock size={16} color={deadlineType === DEADLINE_TYPES.SPECIFIC_TIME ? theme.colors.onPrimary : theme.colors.secondary} />
                  <ThemedText variant="labelSm" style={{ color: deadlineType === DEADLINE_TYPES.SPECIFIC_TIME ? theme.colors.onPrimary : theme.colors.text }}>
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
                      style={[styles.periodButton, timePeriod === 'AM' && styles.periodButtonActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTimePeriod('AM');
                      }}
                    >
                      <ThemedText variant="labelSm" style={[styles.periodText, timePeriod === 'AM' && styles.periodTextActive]}>
                        AM
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.periodButton, timePeriod === 'PM' && styles.periodButtonActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTimePeriod('PM');
                      }}
                    >
                      <ThemedText variant="labelSm" style={[styles.periodText, timePeriod === 'PM' && styles.periodTextActive]}>
                        PM
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Warning Consequence Pill */}
            <View style={styles.alertBox}>
              <ThemedText variant="labelSm" style={styles.alertText}>
                ⚠️ DANGER: Failing to check-in before this deadline will result in an automatic charge of {formatAmount(amountCents)}. Review your commitment carefully.
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText style={{ color: theme.colors.textMuted }}>Cancel</ThemedText>
          </TouchableOpacity>

          <Button
            label={isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            onPress={handleSave}
            isLoading={isSubmitting}
            style={styles.actionBtn}
          />
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isPauseModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPauseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismissOverlay} onPress={() => setIsPauseModalVisible(false)} />
          
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Pause size={28} color={theme.colors.primary} strokeWidth={2} />
            </View>

            <ThemedText variant="headlineMd" style={styles.modalTitle}>
              Pause Commitment?
            </ThemedText>

            <ThemedText variant="bodyMd" style={styles.modalText}>
              Pausing this commitment will temporarily suspend all scheduled deadlines and check-ins.
            </ThemedText>
            
            <ThemedText variant="bodyMd" style={styles.modalText}>
              You will not be charged any penalty stakes while this commitment is paused.
            </ThemedText>

            <View style={styles.modalButtons}>
              <Button
                label="Cancel"
                variant="ghost"
                style={styles.modalButton}
                onPress={() => setIsPauseModalVisible(false)}
              />
              <Button
                label="Yes, Pause"
                style={styles.modalButton}
                onPress={handleTogglePause}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerLabel: {
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  closeButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },
  formContainer: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    gap: theme.spacing.md,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
    color: 'rgba(100, 116, 139, 0.3)',
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
    marginBottom: theme.spacing.xs,
  },
  presetCard: {
    flex: 1,
    minWidth: 64,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    backgroundColor: 'transparent',
  },
  presetCardActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetText: {
    fontSize: 18,
    color: theme.colors.text,
  },
  presetTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  deadlineSection: {
    gap: theme.spacing.md,
  },
  deadlineToggles: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  deadlineToggle: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    backgroundColor: 'transparent',
  },
  deadlineToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    height: 52,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  timeInput: {
    flex: 1,
    height: 40,
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  periodContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    height: 36,
  },
  periodButton: {
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  periodTextActive: {
    color: theme.colors.onPrimary,
  },
  alertBox: {
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.25)',
  },
  alertText: {
    color: theme.colors.error,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  statusCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1.5,
    gap: theme.spacing.lg,
  },
  statusCardActive: {
    backgroundColor: 'rgba(185, 199, 228, 0.12)',
    borderColor: 'rgba(185, 199, 228, 0.45)',
  },
  statusCardPaused: {
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderColor: 'rgba(255, 180, 171, 0.4)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconWrapActive: {
    backgroundColor: 'rgba(185, 199, 228, 0.2)',
  },
  statusIconWrapPaused: {
    backgroundColor: 'rgba(255, 180, 171, 0.18)',
  },
  statusCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  statusEyebrow: {
    letterSpacing: 1.5,
    color: theme.colors.primary,
    opacity: 0.9,
  },
  statusEyebrowPaused: {
    color: theme.colors.error,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusDotPaused: {
    backgroundColor: theme.colors.error,
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  statusLabel: {
    fontSize: 22,
    lineHeight: 28,
  },
  statusLabelActive: {
    color: theme.colors.primary,
  },
  statusLabelPaused: {
    color: theme.colors.error,
  },
  statusDescription: {
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginTop: 2,
  },
  statusActionButton: {
    width: '100%',
    height: 48,
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
