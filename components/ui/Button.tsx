import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import { ThemedText } from "./ThemedText";

interface ButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "ghost";
  isLoading?: boolean;
}

export function Button({
  label,
  variant = "primary",
  isLoading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        pressed && !isDisabled && (isPrimary ? styles.primaryPressed : styles.ghostPressed),
        isDisabled && styles.disabled,
        style as object,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isPrimary ? theme.colors.onPrimary : theme.colors.primary}
          />
        ) : (
          <ThemedText
            variant="labelMd"
            style={[
              styles.label,
              { color: isPrimary ? theme.colors.onPrimary : theme.colors.primary },
            ]}
          >
            {label}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  primaryPressed: {
    backgroundColor: theme.colors.secondary,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  ghostPressed: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(185, 199, 228, 0.05)",
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  label: {
    letterSpacing: 0.5,
    fontFamily: "Inter_600SemiBold",
  },
});
