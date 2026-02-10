import { useAuth, useClerk } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { subscribeToRoom } from "@/lib/ably";
import { apiFetch } from "@/lib/api";

type Player = { id: string; userId: string; isHost: boolean; user: { name: string | null } };
type Room = {
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  handSize: number;
  players: Player[];
};
type Profile = { profile: { id: string } };

export default function LobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [room, setRoom] = useState<Room | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!code || !getToken) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let cancelled = false;
    const authOptions = {
      getToken,
      onUnauthorized: async () => {
        await signOut?.();
        router.replace("/(auth)/sign-in");
      },
    };
    (async () => {
      const [roomResult, profileResult] = await Promise.all([
        apiFetch<Room>(`/api/rooms/${code}`, {}, authOptions),
        apiFetch<Profile>("/api/user/profile", {}, authOptions),
      ]);
      if (cancelled) return;
      if (!roomResult.ok) {
        setError(roomResult.error);
        setRoom(null);
        setMyUserId(null);
      } else {
        setRoom(roomResult.data);
        setError(null);
        setMyUserId(profileResult.ok ? profileResult.data.profile.id : null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, getToken, signOut, router]);

  useEffect(() => {
    if (!code) return;
    const unsub = subscribeToRoom(code, () => {
      router.replace(`/room/${code}/game`);
    });
    return unsub;
  }, [code, router]);

  const startGame = useCallback(async () => {
    if (!code || !getToken) return;
    setStarting(true);
    const result = await apiFetch<{ success: boolean }>("/api/game/start", {
      method: "POST",
      body: JSON.stringify({ roomCode: code }),
    }, {
      getToken,
      onUnauthorized: async () => {
        await signOut?.();
        router.replace("/(auth)/sign-in");
      },
    });
    setStarting(false);
    if (result.ok) router.replace(`/room/${code}/game`);
    else setError(result.error);
  }, [code, getToken, signOut, router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error || !room) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error ?? "Room not found"}</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const isHost = myUserId != null && room.players.some((p) => p.userId === myUserId && p.isHost);
  const canStart = room.status === "lobby" && isHost && room.players.length >= 2;

  return (
    <View style={styles.container}>
      <Text style={styles.code}>Room code: {room.code}</Text>
      <Text style={styles.meta}>
        {room.sport ?? "—"} · {room.mode ?? "—"} · {room.handSize} cards
      </Text>

      <Text style={styles.label}>Players ({room.players.length})</Text>
      {room.players.map((p) => (
        <View key={p.id} style={styles.playerRow}>
          <Text style={styles.playerName}>
            {p.user.name ?? "Player"} {p.isHost ? " (host)" : ""}
          </Text>
        </View>
      ))}

      {canStart && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            starting && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={startGame}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start game</Text>
          )}
        </Pressable>
      )}

      {isHost && room.players.length < 2 && (
        <Text style={styles.hint}>Need at least 2 players to start.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  code: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#666", fontSize: 14 },
  label: { fontWeight: "600", marginTop: 16 },
  playerRow: { paddingVertical: 4 },
  playerName: {},
  error: { color: "#c00", marginBottom: 12 },
  button: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  hint: { color: "#666", fontSize: 14, marginTop: 8 },
});
