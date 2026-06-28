import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNotes } from "@/context/NotesContext";
import { useColors } from "@/hooks/useColors";

type ScanState = "idle" | "scanning" | "result" | "error";

interface ScanResult {
  title: string;
  text: string;
  imageUri: string;
}

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createNote, updateNote } = useNotes();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function pickImage(source: "camera" | "gallery") {
    try {
      let pickerResult: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Camera permission required",
            "Please allow camera access in Settings to scan documents."
          );
          return;
        }
        pickerResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          base64: true,
          allowsEditing: false,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Photo library permission required",
            "Please allow photo access in Settings to pick images."
          );
          return;
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          base64: true,
          allowsEditing: false,
        });
      }

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];
      const base64 = asset.base64;

      if (!base64) {
        setErrorMsg("Could not read image data. Please try again.");
        setScanState("error");
        return;
      }

      setScanState("scanning");
      setResult(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const apiUrl = domain
        ? `https://${domain}/api/scan`
        : "/api/scan";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: asset.mimeType ?? "image/jpeg",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = (await response.json()) as { text: string; title: string };

      if (!data.text && !data.title) {
        setErrorMsg(
          "No readable text was found in this image. Try a clearer photo with visible text."
        );
        setScanState("error");
        return;
      }

      setResult({
        title: data.title,
        text: data.text,
        imageUri: asset.uri,
      });
      setScanState("result");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
      setScanState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function handleSaveAsNote() {
    if (!result) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const note = createNote();
    updateNote(note.id, {
      title: result.title || "Scanned Note",
      content: result.text,
    });
    setScanState("idle");
    setResult(null);
    router.push(`/note/${note.id}`);
  }

  function handleRetry() {
    setScanState("idle");
    setResult(null);
    setErrorMsg("");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Scanner
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Scan documents and convert to notes
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Idle state — pick source */}
        {scanState === "idle" && (
          <View style={styles.section}>
            <Pressable
              testID="scan-camera-btn"
              onPress={() => pickImage("camera")}
              style={({ pressed }) => [
                styles.sourceCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Feather name="camera" size={28} color={colors.primary} />
              </View>
              <View style={styles.sourceCardText}>
                <Text
                  style={[styles.sourceTitle, { color: colors.foreground }]}
                >
                  Take a Photo
                </Text>
                <Text
                  style={[
                    styles.sourceSub,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Use the camera to scan a document, receipt, or note
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>

            <Pressable
              testID="scan-gallery-btn"
              onPress={() => pickImage("gallery")}
              style={({ pressed }) => [
                styles.sourceCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Feather name="image" size={28} color={colors.primary} />
              </View>
              <View style={styles.sourceCardText}>
                <Text
                  style={[styles.sourceTitle, { color: colors.foreground }]}
                >
                  Choose from Gallery
                </Text>
                <Text
                  style={[
                    styles.sourceSub,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Select an existing photo from your photo library
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>

            <View
              style={[styles.tipBox, { backgroundColor: colors.accent, borderColor: colors.border }]}
            >
              <Feather name="info" size={15} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                For best results, ensure the image is well-lit and text is clearly visible. Supports documents, receipts, handwriting, and printed text.
              </Text>
            </View>
          </View>
        )}

        {/* Scanning state */}
        {scanState === "scanning" && (
          <View style={styles.centerState}>
            <View
              style={[
                styles.scanningCircle,
                { backgroundColor: colors.accent },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[styles.scanningTitle, { color: colors.foreground }]}>
              Extracting Text…
            </Text>
            <Text
              style={[styles.scanningText, { color: colors.mutedForeground }]}
            >
              AI is reading your document. This usually takes a few seconds.
            </Text>
          </View>
        )}

        {/* Error state */}
        {scanState === "error" && (
          <View style={styles.centerState}>
            <View
              style={[
                styles.scanningCircle,
                { backgroundColor: "#FEE2E2" },
              ]}
            >
              <Feather name="alert-circle" size={36} color={colors.destructive} />
            </View>
            <Text style={[styles.scanningTitle, { color: colors.foreground }]}>
              Scan Failed
            </Text>
            <Text
              style={[styles.scanningText, { color: colors.mutedForeground }]}
            >
              {errorMsg}
            </Text>
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Try Again
              </Text>
            </Pressable>
          </View>
        )}

        {/* Result state */}
        {scanState === "result" && result && (
          <View style={styles.resultSection}>
            {/* Thumbnail */}
            <Image
              source={{ uri: result.imageUri }}
              style={[styles.thumbnail, { borderColor: colors.border }]}
              resizeMode="cover"
            />

            {/* Extracted content preview */}
            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.resultHeader}>
                <Feather name="check-circle" size={16} color="#22C55E" />
                <Text style={[styles.resultHeaderText, { color: "#22C55E" }]}>
                  Text extracted successfully
                </Text>
              </View>
              {result.title !== "" && (
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                  {result.title}
                </Text>
              )}
              <Text
                style={[styles.resultContent, { color: colors.mutedForeground }]}
                numberOfLines={10}
              >
                {result.text}
              </Text>
            </View>

            {/* Actions */}
            <Pressable
              testID="save-note-btn"
              onPress={handleSaveAsNote}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Feather name="save" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Save as Note
              </Text>
            </Pressable>

            <Pressable
              testID="scan-again-btn"
              onPress={handleRetry}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="refresh-cw" size={16} color={colors.foreground} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                Scan Another
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  section: {
    gap: 12,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceCardText: {
    flex: 1,
    gap: 3,
  },
  sourceTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  sourceSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  centerState: {
    alignItems: "center",
    paddingTop: 48,
    gap: 16,
    paddingHorizontal: 24,
  },
  scanningCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  scanningTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  scanningText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  resultSection: {
    gap: 14,
  },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
  },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  resultHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  resultContent: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
