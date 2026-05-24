import { useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  Check,
  ChevronRight,
  CreditCard,
  Globe,
  LogOut,
  Search,
  User,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

const COMMON_TIMEZONES = [
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Istanbul',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Kolkata',
  'Asia/Manila',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Brussels',
  'Europe/Budapest',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'UTC',
];

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Modals Visibility
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  // Profile Edit Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Card details state
  const [cardDetails, setCardDetails] = useState<{ brand: string; last4: string } | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);

  // Status indicators
  const [isSaving, setIsSaving] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  // Fetch card details on mount/change
  const fetchCardDetails = async () => {
    if (!profile?.stripe_customer_id) return;
    setIsLoadingCard(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-setup-intent', {
        body: { action: 'get-payment-method' },
      });
      if (error) throw error;
      if (data && data.card) {
        setCardDetails({ brand: data.card.brand, last4: data.card.last4 });
      } else {
        setCardDetails(null);
      }
    } catch (err) {
      console.error('Error fetching card details:', err);
    } finally {
      setIsLoadingCard(false);
    }
  };

  React.useEffect(() => {
    fetchCardDetails();
  }, [profile?.stripe_customer_id]);

  // Init local state when modal opens
  const openEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFirstName(profile?.first_name || '');
    setLastName(profile?.last_name || '');
    setSelectedTimezone(profile?.timezone || 'UTC');
    setSearchQuery('');
    setIsProfileModalVisible(true);
  };

  // Profile save logic
  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Validation Error', 'First name and Last name cannot be empty.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          timezone: selectedTimezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsProfileModalVisible(false);
      await refreshProfile();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error Updating Profile', e.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  // Update Payment Method (Stripe SetupIntent flow)
  const handleUpdatePayment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsStripeLoading(true);

    try {
      // 1. Invoke stripe edge function to get setupintent secret
      const { data: funcData, error: funcError } =
        await supabase.functions.invoke('stripe-setup-intent');

      if (funcError) throw funcError;

      // 2. Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: funcData.clientSecret,
        merchantDisplayName: process.env.EXPO_PUBLIC_APP_NAME ?? 'Momentum',
        returnURL: 'momentum://stripe-redirect',
        style: 'alwaysDark',
        appearance: {
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            componentBackground: theme.colors.surface,
            componentDivider: '#1E2A2A',
            primaryText: '#FFFFFF',
            secondaryText: theme.colors.textMuted,
            placeholderText: theme.colors.secondary,
            icon: theme.colors.primary,
            error: theme.colors.error,
          },
          shapes: {
            borderRadius: theme.radius.md,
          },
        },
      });

      if (initError) throw initError;

      // 3. Present sheet to user
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // Normal close, just return
          return;
        }
        throw presentError;
      }

      // Success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Payment Method Updated', 'Your card details have been updated successfully.');
      await refreshProfile();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Payment update error:', e);
      Alert.alert('Setup Failed', e.message || 'We could not update your payment card.');
    } finally {
      setIsStripeLoading(false);
    }
  };

  // Get initials for profile avatar
  const getInitials = () => {
    const f = profile?.first_name?.charAt(0) || '';
    const l = profile?.last_name?.charAt(0) || '';
    return `${f}${l}`.toUpperCase() || 'M';
  };

  // Filtered timezone search list
  const allTzs = Array.from(new Set([selectedTimezone || 'UTC', ...COMMON_TIMEZONES])).sort();
  const filteredTimezones = allTzs.filter((tz) =>
    tz.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Page Header */}
        <View style={styles.header}>
          <ThemedText variant="labelSm" color="secondary" style={styles.headerSubtitle}>
            ACCOUNT SETTINGS
          </ThemedText>
          <ThemedText variant="display" style={styles.headerTitle}>
            Profile
          </ThemedText>
        </View>

        {/* Profile Hero Avatar */}
        <View style={styles.heroSection}>
          <View style={styles.avatarGradient}>
            <ThemedText variant="headlineLg" style={styles.avatarText}>
              {getInitials()}
            </ThemedText>
          </View>
          <View style={styles.heroMeta}>
            <ThemedText variant="headlineMd" style={styles.userName}>
              {profile?.first_name} {profile?.last_name}
            </ThemedText>
            <ThemedText variant="bodyMd" style={styles.userEmail}>
              {user?.email}
            </ThemedText>
            <View style={styles.timezonePill}>
              <Globe size={13} color={theme.colors.primary} />
              <ThemedText variant="labelSm" color="primary" style={styles.timezonePillText}>
                {(profile?.timezone || 'UTC').replace(/_/g, ' ')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Cards Wrapper */}
        <View style={styles.cardsWrapper}>
          {/* Card 1: Account Information */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText variant="labelSm" color="textMuted" style={styles.cardLabel}>
                PERSONAL DETAILS
              </ThemedText>
            </View>

            <TouchableOpacity style={styles.listItem} onPress={openEditProfile}>
              <View style={styles.listItemLeading}>
                <View style={styles.itemIconWrap}>
                  <User size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.listItemDetails}>
                  <ThemedText variant="labelSm" color="textMuted">
                    NAME & LOCATION
                  </ThemedText>
                  <ThemedText variant="bodyMd" style={styles.itemValue}>
                    {profile?.first_name} {profile?.last_name}
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color={theme.colors.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.listItem} onPress={openEditProfile}>
              <View style={styles.listItemLeading}>
                <View style={styles.itemIconWrap}>
                  <Globe size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.listItemDetails}>
                  <ThemedText variant="labelSm" color="textMuted">
                    TIMEZONE
                  </ThemedText>
                  <ThemedText variant="bodyMd" style={styles.itemValue}>
                    {(profile?.timezone || 'UTC').replace(/_/g, ' ')}
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Card 2: Penalty / Stripe payment billing card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText variant="labelSm" color="textMuted" style={styles.cardLabel}>
                Stakes Payment Method
              </ThemedText>
            </View>

            <View style={styles.stripeGlassCard}>
              <View style={styles.glassHeader}>
                <CreditCard size={22} color="#D1D5DB" />
                <ThemedText variant="labelSm" style={styles.securedLogo}>
                  {cardDetails ? `${cardDetails.brand.toUpperCase()} SECURED` : ''}
                </ThemedText>
              </View>

              <View style={styles.cardNumberContainer}>
                <ThemedText variant="headlineMd" style={styles.glassCardNumber}>
                  {isLoadingCard
                    ? 'LOADING CARD...'
                    : cardDetails
                      ? `••••  ••••  ••••  ${cardDetails.last4}`
                      : profile?.stripe_customer_id
                        ? '••••  ••••  ••••  ACTIVE'
                        : '••••  ••••  ••••  NONE'}
                </ThemedText>
                <ThemedText variant="labelSm" color="textMuted" style={styles.cardEndingText}>
                  {cardDetails
                    ? `Card ending in ${cardDetails.last4}`
                    : profile?.stripe_customer_id
                      ? 'Active card details loaded securely'
                      : 'No active card linked'}
                </ThemedText>
              </View>

              <View style={styles.glassFooter}>
                <View>
                  <ThemedText variant="labelSm" color="textMuted" style={styles.glassFooterLabel}>
                    DEFAULT CARD
                  </ThemedText>
                  <ThemedText variant="labelMd" style={styles.glassFooterValue}>
                    {profile?.first_name?.toUpperCase()} {profile?.last_name?.toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.activeIndicatorBadge}>
                  <View style={styles.indicatorDot} />
                  <ThemedText variant="labelSm" style={styles.indicatorLabel}>
                    {cardDetails ? 'VERIFIED' : 'SECURED'}
                  </ThemedText>
                </View>
              </View>
            </View>

            <Button
              label={isStripeLoading ? 'Initializing Stripe...' : 'Change Payment Method'}
              variant="ghost"
              isLoading={isStripeLoading}
              onPress={async () => {
                await handleUpdatePayment();
                await fetchCardDetails();
              }}
              style={styles.stripeBtn}
            />
          </View>

          {/* Danger zone / logout */}
          <View style={[styles.card, styles.cardDanger]}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() =>
                Alert.alert('Sign Out', 'Are you sure you want to sign out of Momentum?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      try {
                        await signOut();
                      } catch (e) {
                        console.error('Sign out error:', e);
                      }
                    },
                  },
                ])
              }
            >
              <LogOut size={18} color={theme.colors.error} />
              <ThemedText variant="labelMd" style={styles.signOutText}>
                SIGN OUT
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile (Name & Timezone) Slide-Up Modal */}
      <Modal
        visible={isProfileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsProfileModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <ThemedText variant="labelSm" color="secondary" style={styles.modalEyebrow}>
                    EDIT DETAILS
                  </ThemedText>
                  <ThemedText variant="headlineMd" style={styles.modalTitle}>
                    Edit Profile
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsProfileModalVisible(false);
                  }}
                >
                  <X size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Form Scroll Container */}
              <View style={styles.modalBody}>
                {/* 1. Name fields */}
                <View style={styles.formRow}>
                  <Input
                    label="First Name"
                    placeholder="Enter first name"
                    value={firstName}
                    onChangeText={setFirstName}
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Enter last name"
                    value={lastName}
                    onChangeText={setLastName}
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {/* 2. Timezone label */}
                <ThemedText variant="labelSm" color="textMuted" style={styles.tzLabel}>
                  TIMEZONE LOCATION
                </ThemedText>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <Search size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search city/timezone..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    selectionColor={theme.colors.primary}
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
                      <X size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filtered timezone FlatList */}
                <FlatList
                  data={filteredTimezones}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const isSelected = selectedTimezone === item;
                    return (
                      <TouchableOpacity
                        style={[styles.tzItem, isSelected && styles.tzItemActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedTimezone(item);
                        }}
                      >
                        <ThemedText
                          variant="bodyMd"
                          style={[styles.tzText, isSelected && styles.tzTextActive]}
                        >
                          {item.replace(/_/g, ' ')}
                        </ThemedText>
                        {isSelected && (
                          <Check size={16} color={theme.colors.primary} strokeWidth={3} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  keyboardShouldPersistTaps="handled"
                  style={styles.tzList}
                  contentContainerStyle={styles.tzListContent}
                />
              </View>

              {/* Modal Footer actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={() => setIsProfileModalVisible(false)}
                  style={styles.modalCancelBtn}
                >
                  <ThemedText variant="labelMd" color="textMuted">
                    Cancel
                  </ThemedText>
                </TouchableOpacity>

                <Button
                  label={isSaving ? 'Saving...' : 'Save Changes'}
                  isLoading={isSaving}
                  onPress={handleSaveProfile}
                  style={styles.modalSaveBtn}
                />
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerSubtitle: {
    letterSpacing: 1.5,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(185, 199, 228, 0.15)',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  avatarText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  heroMeta: {
    flex: 1,
    gap: 3,
  },
  userName: {
    color: '#E2E2E2',
    lineHeight: 28,
  },
  userEmail: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  timezonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(185, 199, 228, 0.1)',
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(185, 199, 228, 0.25)',
  },
  timezonePillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardsWrapper: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    gap: theme.spacing.md,
  },
  cardDanger: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    paddingVertical: 12,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  cardLabel: {
    letterSpacing: 1.5,
    fontFamily: 'Inter_600SemiBold',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  listItemLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  itemIconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(185, 199, 228, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemDetails: {
    gap: 2,
  },
  itemValue: {
    color: '#E2E2E2',
    fontWeight: '500',
  },
  stripeGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: theme.spacing.md,
    gap: 12,
    overflow: 'hidden',
  },
  glassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securedLogo: {
    color: '#9CA3AF',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  glassCardNumber: {
    color: '#FFFFFF',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    letterSpacing: 2,
    marginBottom: 2,
  },
  cardNumberContainer: {
    gap: 1,
  },
  cardEndingText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: -1,
  },
  glassFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  glassFooterLabel: {
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  glassFooterValue: {
    color: '#E5E7EB',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
  },
  activeIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  indicatorLabel: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stripeBtn: {
    marginTop: 6,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 10,
  },
  signOutText: {
    color: theme.colors.error,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 20, 20, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    height: '92%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  modalEyebrow: {
    letterSpacing: 1.5,
  },
  modalTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  tzLabel: {
    letterSpacing: 1.5,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
    marginBottom: -4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    height: 48,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
  },
  searchClear: {
    padding: 4,
  },
  tzList: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  tzListContent: {
    paddingVertical: theme.spacing.xs,
  },
  tzItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  tzItemActive: {
    backgroundColor: 'rgba(185, 199, 228, 0.08)',
  },
  tzText: {
    color: theme.colors.textMuted,
  },
  tzTextActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
  },
  modalSaveBtn: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
});
