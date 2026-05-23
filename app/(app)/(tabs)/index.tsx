import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../../../components/ui/ThemedText';
import { theme } from '../../../constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ThemedText variant="headlineLg">Today</ThemedText>
      <ThemedText variant="bodyMd" style={styles.muted}>
        Your goals and check-ins will appear here.
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
