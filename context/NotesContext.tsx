import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Note } from "@/types/note";

const STORAGE_KEY = "@notes_app_notes";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface NotesContextValue {
  notes: Note[];
  loading: boolean;
  createNote: () => Note;
  updateNote: (id: string, updates: Partial<Pick<Note, "title" | "content">>) => void;
  deleteNote: (id: string) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setNotes(JSON.parse(raw));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function persistNotes(updated: Note[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  const createNote = useCallback((): Note => {
    const note: Note = {
      id: generateId(),
      title: "",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => {
      const next = [note, ...prev];
      persistNotes(next);
      return next;
    });
    return note;
  }, []);

  const updateNote = useCallback(
    (id: string, updates: Partial<Pick<Note, "title" | "content">>) => {
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
        );
        persistNotes(next);
        return next;
      });
    },
    []
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persistNotes(next);
      return next;
    });
  }, []);

  return (
    <NotesContext.Provider value={{ notes, loading, createNote, updateNote, deleteNote }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
