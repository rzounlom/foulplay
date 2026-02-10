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

const MODES = [
  { value: "casual", label: "Casual" },
  { value: "party", label: "Party" },
];
const SPORTS = [
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "soccer", label: "Soccer" },
];

export default function CreateRoomScreen() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const [mode, setMode] = useState("casual");
  const [sport, setSport] = useState("football");
  const [handSize, setHandSize] = useState(5);
  const [allowQuarterClearing, setAllowQuarterClearing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiFetch<{ code: string }>(
      "/api/rooms",
      {
        method: "POST",
        body: JSON.stringify({
          mode,
          sport,
          handSize,
          ...(sport === "football" || sport === "basketball"
            ? { allowQuarterClearing }
            : {}),
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
  }, [mode, sport, handSize, allowQuarterClearing, getToken, signOut, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Game mode</Text>
      <View style={styles.row}>
        {MODES.map((m) => (
          <Pressable
            key={m.value}
            style={[
              styles.chip,
              mode === m.value && styles.chipSelected,
            ]}
            onPress={() => setMode(m.value)}
          >
            <Text
              style={[
                styles.chipText,
                mode === m.value && styles.chipTextSelected,
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Sport</Text>
      <View style={styles.row}>
        {SPORTS.map((s) => (
          <Pressable
            key={s.value}
            style={[
              styles.chip,
              sport === s.value && styles.chipSelected,
            ]}
            onPress={() => setSport(s.value)}
          >
            <Text
              style={[
                styles.chipText,
                sport === s.value && styles.chipTextSelected,
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Cards per hand (4–10)</Text>
      <TextInput
        style={styles.input}
        value={String(handSize)}
        keyboardType="number-pad"
        onChangeText={(t) => {
          const n = parseInt(t, 10);
          if (!isNaN(n) && n >= 4 && n <= 10) setHandSize(n);
        }}
      />

      {(sport === "football" || sport === "basketball") && (
        <Pressable
          style={styles.checkRow}
          onPress={() => setAllowQuarterClearing((v) => !v)}
        >
          <View
            style={[
              styles.checkbox,
              allowQuarterClearing && styles.checkboxChecked,
            ]}
          />
          <Text style={styles.checkLabel}>Allow quarter clearing</Text>
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (loading || !getToken) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleCreate}
        disabled={loading || !getToken}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create room</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  label: { fontWeight: "600", fontSize: 14 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  chipSelected: { backgroundColor: "#0a7ea4", borderColor: "#0a7ea4" },
  chipText: {},
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 4,
  },
  checkboxChecked: { backgroundColor: "#0a7ea4", borderColor: "#0a7ea4" },
  checkLabel: {},
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
