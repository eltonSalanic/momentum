import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "../../components/ui/ThemedText";
import { ThemedView } from "../../components/ui/ThemedView";
import { theme } from "../../constants/theme";

export default function AuthLayout() {
  return (
    <ThemedView style={styles.container}>
      {/* Shared auth header */}
      <View style={styles.header}>
        <ThemedText variant="display" style={styles.wordmark}>
          Momentum
        </ThemedText>
        <ThemedText variant="bodyMd" color="textMuted">
          Stay consistent. Stay accountable.
        </ThemedText>
      </View>

      {/* Auth screens render here */}
      <View style={styles.screens}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: theme.spacing.xl * 2,
  },
  header: {
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  wordmark: {
    color: theme.colors.primary,
  },
  screens: {
    flex: 1,
  },
});
