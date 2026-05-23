import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../ui/ThemedText';
import { theme } from '../../constants/theme';

interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <ThemedText variant="headlineMd">{title}</ThemedText>
      {count != null && (
        <View style={styles.badge}>
          <ThemedText variant="labelSm" style={styles.badgeText}>
            {count}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(185, 199, 228, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    color: theme.colors.primary,
  },
});
