import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNotes } from "@/context/NotesContext";
import { useColors } from "@/hooks/useColors";
import { Note } from "@/types/note";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const colors = useColors();
  const hasTitle = note.title.trim().length > 0;
  const hasContent = note.content.trim().length > 0;
  const preview = note.content.trim().slice(0, 120);

  return (
    <Pressable
      testID={`note-card-${note.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={styles.cardInner}>
        {hasTitle ? (
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {note.title}
          </Text>
        ) : (
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            New note
          </Text>
        )}
        {hasContent && (
          <Text style={[styles.cardPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
            {preview}
          </Text>
        )}
        <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
          {formatDate(note.updatedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NotesListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notes, loading, createNote } = useNotes();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, search]);

  function handleNewNote() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const note = createNote();
    router.push(`/note/${note.id}`);
  }

  function handleOpenNote(note: Note) {
    Haptics.selectionAsync();
    router.push(`/note/${note.id}`);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Notes
          </Text>
          <Pressable
            testID="search-toggle"
            onPress={() => {
              setShowSearch((v) => !v);
              if (showSearch) setSearch("");
            }}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather
              name={showSearch ? "x" : "search"}
              size={22}
              color={colors.foreground}
            />
          </Pressable>
        </View>
        {showSearch && (
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              testID="search-input"
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Search notes…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        )}
        {!showSearch && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {notes.length === 0
              ? "No notes yet"
              : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          {search.trim() ? (
            <>
              <Feather name="search" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No results
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nothing matched "{search}"
              </Text>
            </>
          ) : (
            <>
              <Feather name="file-text" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No notes yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap the + button to create your first note
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filtered.length > 0}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={() => handleOpenNote(item)} />
          )}
        />
      )}

      <Pressable
        testID="new-note-fab"
        onPress={handleNewNote}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: bottomPad + 24,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={28} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  iconBtn: {
    padding: 8,
  },
  count: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardInner: {
    padding: 16,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cardPreview: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
