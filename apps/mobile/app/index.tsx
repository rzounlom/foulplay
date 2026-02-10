import { useAuth, useClerk } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FoulPlay</Text>
      <Text style={styles.subtitle}>Create or join a room to play.</Text>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.push("/create-room")}
      >
        <Text style={styles.buttonText}>Create Room</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.push("/join-room")}
      >
        <Text style={styles.buttonText}>Join Room</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.buttonPressed]}
        onPress={async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        }}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  subtitle: { color: "#666", marginBottom: 24 },
  button: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 200,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  signOut: { marginTop: 24, paddingVertical: 8 },
  signOutText: { color: "#666", fontSize: 14 },
});
