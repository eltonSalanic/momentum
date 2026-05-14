import { ThemedText } from "@/components/ui/ThemedText";
import { ThemedView } from "@/components/ui/ThemedView";
import SignUpScreen from "./(auth)/signup";

export default function Home() {
  return (
    <>
      <ThemedView
        style={{
          height: "100%",
          width: "100%",
          justifyContent: "center",
        }}
      >
        <ThemedText>Home</ThemedText>
        <SignUpScreen />
      </ThemedView>
    </>
  );
}
