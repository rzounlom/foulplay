import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>FoulPlay</Text>
      <Text style={{ color: "#666", textAlign: "center" }}>
        Mobile app — Phase 1: add Clerk, API client, and screens here.
      </Text>
    </View>
  );
}
