import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../../../components/ui/ThemedText';
import { theme } from '../../../constants/theme';

export default function CreateGoalScreen() {
  return (
    <View style={styles.container}>
      <ThemedText variant="headlineLg">New Goal</ThemedText>
      <ThemedText variant="bodyMd" style={styles.muted}>
        Goal creation form will go here.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 72,
    paddingHorizontal: theme.spacing.gutter,
    gap: theme.spacing.sm,
  },
  muted: {
    color: theme.colors.textMuted,
  },
});
