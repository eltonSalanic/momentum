import { Text, TextProps, StyleSheet } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { Theme } from "../../constants/theme";

interface ThemedTextProps extends TextProps {
  variant?: keyof Theme["typography"];
  color?: keyof Theme["colors"];
}

export const ThemedText = ({
  variant = "bodyMd",
  color = "text",
  style,
  ...props
}: ThemedTextProps) => {
  const theme = useTheme();
  
  const typographyStyle = theme.typography[variant];
  const colorStyle = theme.colors[color];

  return (
    <Text
      style={[
        {
          color: colorStyle,
          fontFamily: typographyStyle.fontFamily,
          fontSize: typographyStyle.fontSize,
          lineHeight: typographyStyle.lineHeight,
          letterSpacing: typographyStyle.letterSpacing,
        },
        style,
      ]}
      {...props}
    />
  );
};
