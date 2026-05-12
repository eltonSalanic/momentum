import { View, ViewProps } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { Theme } from "../../constants/theme";

interface ThemedViewProps extends ViewProps {
  backgroundColor?: keyof Theme["colors"];
}

export const ThemedView = ({
  backgroundColor = "background",
  style,
  ...props
}: ThemedViewProps) => {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors[backgroundColor],
        },
        style,
      ]}
      {...props}
    />
  );
};
