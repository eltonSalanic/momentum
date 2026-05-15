import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemedText } from '../../components/ui/ThemedText';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function SignUpScreen() {
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};

    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email';

    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Must be at least 8 characters';

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) next.confirmPassword = "Passwords don't match";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const { error } = await signUp(email.trim().toLowerCase(), password);

    setIsLoading(false);

    if (error) {
      setErrors({ form: error });
      return;
    }

    // Auth state change in AuthContext will trigger RootNavigator to switch to onboarding
  };

  return (
    <View style={styles.form}>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        error={errors.email}
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Min. 8 characters"
        isPassword
        textContentType="newPassword"
        error={errors.password}
      />
      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repeat your password"
        isPassword
        textContentType="newPassword"
        error={errors.confirmPassword}
      />

      {errors.form && (
        <ThemedText variant="labelSm" color="error" style={styles.formError}>
          {errors.form}
        </ThemedText>
      )}

      <Button
        label="Create Account"
        onPress={handleSignUp}
        isLoading={isLoading}
        style={styles.cta}
      />

      <View style={styles.footer}>
        <ThemedText variant="bodyMd" color="secondary">
          Already have an account?{' '}
        </ThemedText>
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <ThemedText variant="bodyMd" color="primary">
            Log In
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: 25,
    gap: theme.spacing.md,
  },
  formError: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cta: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
});
