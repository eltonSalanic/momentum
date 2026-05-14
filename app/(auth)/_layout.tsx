import { Slot, Redirect } from "expo-router";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import { ThemedText } from "../../components/ui/ThemedText";
import { ThemedView } from "../../components/ui/ThemedView";
import { theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  // If already logged in, send them to the root which will handle onboarding check
  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <Animated.View
              entering={FadeInLeft.duration(1500)}
              style={styles.header}
            >
              <ThemedText variant="display" color="primary">
                Momentum
              </ThemedText>
              <ThemedText
                variant="bodyMd"
                color="secondary"
                style={styles.caption}
              >
                stay consistent
              </ThemedText>
            </Animated.View>
            <Slot />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  caption: {
    opacity: 0.8,
    marginTop: -theme.spacing.xs,
  },
});
