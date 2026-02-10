import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set in .env");
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="index" options={{ title: "FoulPlay" }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="create-room" options={{ title: "Create Room" }} />
        <Stack.Screen name="join-room" options={{ title: "Join Room" }} />
        <Stack.Screen name="room/[code]" options={{ title: "Room" }} />
        <Stack.Screen name="room/[code]/game" options={{ title: "Game" }} />
      </Stack>
      <StatusBar style="auto" />
    </ClerkProvider>
  );
}
