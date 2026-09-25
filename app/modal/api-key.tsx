import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../src/constants";
import {
  deleteGeminiApiKey,
  getGeminiApiKey,
  saveGeminiApiKey,
} from "../../src/services/apiKey";

export default function ApiKeyScreen() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGeminiApiKey()
      .then((key) => setHasSavedKey(Boolean(key)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Enter an API key", "Paste your Gemini API key to continue.");
      return;
    }
    setSaving(true);
    try {
      await saveGeminiApiKey(apiKey);
      setApiKey("");
      setHasSavedKey(true);
      Alert.alert("API key saved", "You can now use AI shift parsing.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert("Remove API key", "AI parsing will be unavailable until you add a new key.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteGeminiApiKey();
          setApiKey("");
          setHasSavedKey(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Key</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.blue} style={styles.loader} />
        ) : (
          <>
            {hasSavedKey && (
              <Text style={styles.saved}>✓ A Gemini API key is saved on this device.</Text>
            )}
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Add your key here"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabled]}
              onPress={save}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? "Saving…" : "Add Key"}</Text>
            </TouchableOpacity>
            {hasSavedKey && (
              <TouchableOpacity style={styles.removeButton} onPress={remove}>
                <Text style={styles.removeText}>Remove saved key</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
  back: { color: COLORS.blue, fontSize: 16, marginBottom: 28 },
  title: { color: COLORS.textPrimary, fontSize: 26, fontWeight: "800", marginBottom: 10 },
  saved: { color: COLORS.green, fontSize: 14, marginBottom: 14 },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.textPrimary,
    fontSize: 15,
    padding: 14,
  },
  saveButton: { backgroundColor: COLORS.blue, borderRadius: 10, marginTop: 14, padding: 15 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  removeButton: { alignSelf: "center", marginTop: 24, padding: 10 },
  removeText: { color: COLORS.red, fontSize: 14, fontWeight: "600" },
  loader: { marginTop: 30 },
  disabled: { opacity: 0.6 },
});
