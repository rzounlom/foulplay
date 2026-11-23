import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getApiUrl } from "@/lib/api";

/**
 * Native gameplay is out of Wednesday scope. Testers play on the web PWA.
 * This screen opens the authenticated web game for the same room code.
 */
export default function GamePlaceholderScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const openWebGame = () => {
    const base = getApiUrl();
    const url = `${base}/game/${encodeURIComponent(String(code ?? ""))}`;
    void Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Continue on the web game</Text>
      <Text style={styles.subtitle}>
        Room {code}. Full cards, voting, and live updates run in the FoulPlay
        website. Native gameplay is not part of this build.
      </Text>
      <Pressable style={styles.button} onPress={openWebGame}>
        <Text style={styles.buttonText}>Open web game</Text>
      </Pressable>
      <Text style={styles.link} onPress={() => router.back()}>
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
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  subtitle: { color: "#666", textAlign: "center", marginBottom: 16 },
  button: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  link: { color: "#0a7ea4", fontWeight: "600", marginTop: 12 },
});
