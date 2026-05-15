import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import { ThemedText } from "./ThemedText";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: object;
}

export function Input({
  label,
  error,
  isPassword,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <ThemedText variant="labelMd" color="textMuted" style={styles.label}>
          {label.toUpperCase()}
        </ThemedText>
      )}

      <View
        style={[
          styles.container,
          isFocused && styles.containerFocused,
          error ? styles.containerError : null,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          secureTextEntry={isPassword && !isVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize={isPassword ? "none" : props.autoCapitalize}
          autoCorrect={isPassword ? false : props.autoCorrect}
          spellCheck={isPassword ? false : props.spellCheck}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setIsVisible((v) => !v)}
            style={styles.eyeButton}
          >
            <ThemedText variant="labelSm" color="textMuted">
              {isVisible ? "HIDE" : "SHOW"}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {error && (
        <ThemedText variant="labelSm" color="error" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  label: {
    letterSpacing: 1,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  containerFocused: {
    borderColor: theme.colors.primary,
  },
  containerError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    height: 52,
    color: theme.colors.text,
    fontFamily: theme.typography.bodyMd.fontFamily,
    fontSize: theme.typography.bodyMd.fontSize,
  },
  eyeButton: {
    paddingLeft: theme.spacing.sm,
  },
  error: {
    letterSpacing: 0.5,
  },
});
