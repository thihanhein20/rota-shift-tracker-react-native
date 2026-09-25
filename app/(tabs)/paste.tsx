// app/modal/paste.tsx
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../src/constants";
import { parseShiftWithAI } from "../../src/services/aiParser";
import { saveShift } from "../../src/services/database";
import { scheduleShiftNotifications } from "../../src/services/notification";
import { ParsedShift, Shift } from "../../src/types";
import { calculateHours } from "../../src/utils/time";

export default function PasteScreen() {
  const router = useRouter();
  const [smsText, setSmsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<ParsedShift[]>([]);

  useEffect(() => {
    Clipboard.getStringAsync().then((text) => {
      if (text && text.length > 10 && text.length < 600) setSmsText(text);
    });
  }, []);

  const handleParse = async () => {
    if (!smsText.trim()) {
      Alert.alert("Empty", "Please paste your shift SMS first.");
      return;
    }
    setLoading(true);
    setPreviews([]);
    try {
      const parsed = await parseShiftWithAI(smsText);
      setPreviews(parsed);
    } catch (error) {
      if (error instanceof Error && error.message === "MISSING_GEMINI_API_KEY") {
        Alert.alert(
          "Add your Gemini API key",
          "Set your own key before using AI parsing.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Set API Key", onPress: () => router.push("/modal/api-key") },
          ],
        );
        return;
      }
      Alert.alert(
        "Error",
        "Could not parse SMS. Check your API key or try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (previews.length === 0) return;

    for (const preview of previews) {
      const shift: Shift = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: preview.date,
        startTime: preview.startTime,
        endTime: preview.endTime,
        location: preview.location,
        role: preview.role,
        notes: preview.notes,
        hoursWorked: calculateHours(preview.startTime, preview.endTime),
        status: "upcoming",
        rawSMS: smsText,
        createdAt: new Date().toISOString(),
      };
      await saveShift(shift);
      await scheduleShiftNotifications(shift);
    }

    Alert.alert(
      "✅ Shifts Saved!",
      `${previews.length} shift${previews.length > 1 ? "s" : ""} added with reminders.`,
      [
        {
          text: "Done",
          onPress: () => {
            setPreviews([]);
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.back}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Shift</Text>
            <View style={{ width: 50 }} />
          </View>

          <Text style={styles.label}>Paste your shift SMS</Text>
          <Text style={styles.sub}>
            Copy the message from Messages — it auto-detects from clipboard.
          </Text>

          <TouchableOpacity
            style={styles.apiKeyBtn}
            onPress={() => router.push("/modal/api-key")}
          >
            <Text style={styles.apiKeyText}>⚙ Configure your Gemini API key</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={smsText}
            onChangeText={setSmsText}
            placeholder="Your shift SMS appears here..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.clipboardBtn}
            onPress={() => Clipboard.getStringAsync().then(setSmsText)}
          >
            <Text style={styles.clipboardText}>📋 Paste from Clipboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.parseBtn, loading && { opacity: 0.6 }]}
            onPress={handleParse}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.parseBtnText}>✨ Parse with AI</Text>
            )}
          </TouchableOpacity>

          {/* Multiple shift previews */}
          {previews.length > 0 && (
            <View>
              {previews.length > 1 && (
                <Text style={styles.multiLabel}>
                  🎉 Found {previews.length} shifts!
                </Text>
              )}

              {previews.map((preview, index) => (
                <View key={index} style={styles.preview}>
                  {previews.length > 1 && (
                    <Text style={styles.shiftNum}>Shift {index + 1}</Text>
                  )}
                  <Text style={styles.previewHeading}>Looks good?</Text>

                  {[
                    ["📅 Date", preview.date],
                    ["🕐 Start", preview.startTime],
                    ["🕔 End", preview.endTime],
                    [
                      "⏱ Hours",
                      `${calculateHours(preview.startTime, preview.endTime)} hrs`,
                    ],
                    ["📍 Location", preview.location],
                    ["💼 Role", preview.role],
                    ["📝 Notes", preview.notes],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <View key={k as string} style={styles.previewRow}>
                        <Text style={styles.previewKey}>{k}</Text>
                        <Text style={styles.previewVal}>{v}</Text>
                      </View>
                    ))}
                </View>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll}>
                <Text style={styles.saveBtnText}>
                  Save{" "}
                  {previews.length > 1
                    ? `All ${previews.length} Shifts`
                    : "Shift"}{" "}
                  & Set Reminders
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  back: { color: COLORS.blue, fontSize: 16 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
  label: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  sub: { color: "#666", fontSize: 13, marginBottom: 8, lineHeight: 18 },
  apiKeyBtn: { alignSelf: "flex-start", marginBottom: 12, paddingVertical: 8 },
  apiKeyText: { color: COLORS.blue, fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  clipboardBtn: {
    backgroundColor: "#1A1A2A",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  clipboardText: { color: COLORS.textSecond, fontSize: 14 },
  parseBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  parseBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  multiLabel: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  preview: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#00C48C33",
    marginBottom: 12,
  },
  shiftNum: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  previewHeading: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewKey: { color: "#666", fontSize: 14 },
  previewVal: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  saveBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
