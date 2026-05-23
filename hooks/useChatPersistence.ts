import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "../types/storage";

const MAX_STORAGE_SIZE = 5 * 1024 * 1024;
const MAX_AGE_DAYS = 30;

export function useChatPersistence(channelId: string, initialChats: Chat[] = []) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [loading, setLoading] = useState(true);
  const initialChatsRef = useRef(initialChats);
  initialChatsRef.current = initialChats;

  const getStorageKey = (id: string) => id === 'main' ? "yyc3_chat_history" : `yyc3_chat_history_${id}`;

  useEffect(() => {
    setLoading(true);
    try {
      const key = getStorageKey(channelId);
      const stored = localStorage.getItem(key);

      if (stored) {
        const parsed: Chat[] = JSON.parse(stored, (key, value) => {
          if (key === "createdAt" || key === "updatedAt" || key === "timestamp") {
            return new Date(value);
          }
          return value;
        });

        const migrated = parsed.map(chat => ({
          ...chat,
          isStarred: chat.isStarred ?? false,
          messages: chat.messages || []
        }));

        setChats(migrated);
      } else {
        setChats(initialChatsRef.current);
      }
    } catch {
      setChats(initialChatsRef.current);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  const persistToStorage = useCallback((newChats: Chat[]) => {
    try {
      const key = getStorageKey(channelId);
      const serialized = JSON.stringify(newChats);

      if (serialized.length > MAX_STORAGE_SIZE) {
        const now = new Date();
        const cutoff = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
        const cleaned = newChats.filter(c =>
          c.isStarred || new Date(c.updatedAt) > cutoff
        );
        localStorage.setItem(key, JSON.stringify(cleaned));
        return cleaned;
      }

      localStorage.setItem(key, serialized);
      return newChats;
    } catch {
      return newChats;
    }
  }, [channelId]);

  const setChatsWrapper = useCallback((value: Chat[] | ((val: Chat[]) => Chat[])) => {
    setChats(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      const persisted = persistToStorage(newValue);
      return persisted;
    });
  }, [persistToStorage]);

  const exportData = useCallback(() => {
    const data = {
      channelId,
      timestamp: new Date().toISOString(),
      chats
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yyc3_channel_${channelId}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chats, channelId]);

  const importData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString, (key, value) => {
        if (key === "createdAt" || key === "updatedAt" || key === "timestamp") {
          return new Date(value);
        }
        return value;
      });

      if (parsed.chats && Array.isArray(parsed.chats)) {
        setChatsWrapper(parsed.chats);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setChatsWrapper]);

  return {
    chats,
    setChats: setChatsWrapper,
    loading,
    exportData,
    importData
  } as const;
}
