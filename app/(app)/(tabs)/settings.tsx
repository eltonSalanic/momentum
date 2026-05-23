import { Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '../../../components/ui/ThemedText';
import { Button } from '../../../components/ui/Button';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <ThemedText variant="headlineLg">Profile</ThemedText>

      <View style={styles.section}>
        <ThemedText variant="labelSm" style={styles.label}>
          NAME
        </ThemedText>
        <ThemedText variant="bodyMd">
          {profile?.first_name} {profile?.last_name}
        </ThemedText>
      </View>

      <View style={styles.spacer} />

      <Button
        label="Sign Out"
        variant="ghost"
        onPress={() =>
          Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                try {
                  await signOut();
                } catch (e) {
                  console.error('Sign out error:', e);
                }
              },
            },
          ])
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 72,
    paddingHorizontal: theme.spacing.gutter,
    gap: theme.spacing.md,
  },
  section: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  label: {
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  spacer: {
    flex: 1,
  },
});
