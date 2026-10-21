import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  chatPhotoUrl,
  saveChatPhoto,
  saveLocalChatPhoto,
  selectChatPhoto,
  discardChatPhoto
} from "../services/chat-photo.service";
import type { LocalPhoto } from "../attachment-domain";
export function useChatPhoto(
  id: string | undefined,
  actor: string,
  local?: LocalPhoto
) {
  const query = useQuery({
    queryKey: ["chat-photo-url", actor, id],
    queryFn: () => chatPhotoUrl(id!),
    enabled: !!id,
    staleTime: 45000,
    gcTime: 60000
  });
  const [saving, setSaving] = useState(false),
    [notice, setNotice] = useState<string | null>(null),
    [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  return {
    ...query,
    saving,
    notice,
    saveError,
    save: async () => {
      if ((!id && !local) || saving) return;
      setSaving(true);
      setSaveError(null);
      setNotice(null);
      try {
        if (local) await saveLocalChatPhoto(local);
        else await saveChatPhoto(id!);
        setNotice("Photo saved");
      } catch (e) {
        setSaveError(
          e instanceof Error && e.message.includes("Settings")
            ? e.message
            : "Couldn’t save this photo. Check your connection and try again."
        );
      } finally {
        setSaving(false);
      }
    }
  };
}
export function usePhotoComposer(actor: string) {
  const [selected, setSelected] = useState<{
      photo: LocalPhoto;
      caption: string;
    } | null>(null),
    [picking, setPicking] = useState(false),
    [error, setError] = useState<string | null>(null);
  return {
    selected,
    picking,
    error,
    clear: () => setSelected(null),
    pick: async (caption: string) => {
      if (picking || selected) return;
      setPicking(true);
      setError(null);
      try {
        const photo = await selectChatPhoto(actor);
        if (photo) setSelected({ photo, caption });
      } catch (e) {
        setError(
          e instanceof Error &&
            /^(Choose a smaller photo|This photo is too large)/.test(e.message)
            ? e.message
            : "Couldn’t prepare this photo. Try a different photo."
        );
      } finally {
        setPicking(false);
      }
    },
    cancel: () => {
      const photo = selected?.photo;
      setSelected(null);
      if (photo) void discardChatPhoto(actor, photo).catch(() => undefined);
    }
  };
}
