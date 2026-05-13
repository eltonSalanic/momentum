import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ThemedText } from "../../components/ui/ThemedText";
import { ThemedView } from "../../components/ui/ThemedView";
import { theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};

    if (!email.trim()) next.email = "Email is required";
    if (!password) next.password = "Password is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const { error } = await signIn(email.trim().toLowerCase(), password);

    setIsLoading(false);

    if (error) {
      setErrors({ form: "Invalid email or password" });
      return;
    }

    // Auth state change in AuthContext will trigger redirect
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email For Login"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            isPassword
            error={errors.password}
          />

          {errors.form && (
            <ThemedText
              variant="labelSm"
              color="error"
              style={styles.formError}
            >
              {errors.form}
            </ThemedText>
          )}

          <Button
            label="Log In"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.cta}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText variant="bodyMd" color="textMuted">
            Don&apos;t have an account?{" "}
          </ThemedText>
          <Button
            label="Sign up"
            variant="ghost"
            onPress={() => router.replace("/(auth)/signup")}
            style={styles.signupButton}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  form: {
    gap: theme.spacing.md,
  },
  formError: {
    textAlign: "center",
    letterSpacing: 0.5,
  },
  cta: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupButton: {
    height: "auto",
    paddingVertical: 0,
    borderWidth: 0,
  },
});
