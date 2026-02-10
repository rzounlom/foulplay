import { useAuth, useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "@/lib/api";

type Room = { code: string };

export default function JoinRoomScreen() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Room code must be 6 characters");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiFetch<Room>(
      "/api/rooms/join",
      {
        method: "POST",
        body: JSON.stringify({
          code: trimmed,
          ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
        }),
      },
      {
        getToken: getToken ?? (() => Promise.resolve(null)),
        onUnauthorized: async () => {
          await signOut?.();
          router.replace("/(auth)/sign-in");
        },
      }
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(`/room/${result.data.code}`);
  }, [code, nickname, getToken, signOut, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Room code (6 characters)</Text>
      <TextInput
        style={styles.input}
        value={code}
        placeholder="e.g. ABC123"
        placeholderTextColor="#999"
        onChangeText={(t) => setCode(t.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6))}
        autoCapitalize="characters"
        maxLength={6}
      />

      <Text style={styles.label}>Nickname (optional)</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        placeholder="Display name in this room"
        placeholderTextColor="#999"
        onChangeText={setNickname}
        maxLength={30}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (loading || code.trim().length !== 6 || !getToken) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleJoin}
        disabled={loading || code.trim().length !== 6 || !getToken}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Join room</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  label: { fontWeight: "600", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  error: { color: "#c00", fontSize: 14 },
  button: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
