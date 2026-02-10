import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function GamePlaceholderScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game in progress</Text>
      <Text style={styles.subtitle}>
        Room {code} — full gameplay is available on the web. This screen will be
        built in Phase 2.
      </Text>
      <Text
        style={styles.link}
        onPress={() => router.back()}
      >
        Back to room
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  subtitle: { color: "#666", textAlign: "center", marginBottom: 24 },
  link: { color: "#0a7ea4", fontWeight: "600" },
});
