import { useState } from "react";
import { Platform, Share } from "react-native";
import { useAppToast } from "@/components/atoms/toast";
import { copyText } from "@/infrastructure/clipboard/copy-text";
import { publicSessionLink } from "../services/public-session.service";

export function useSessionShare(id: string, title: string) {
  const toast = useAppToast();
  const [sharing, setSharing] = useState(false);
  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      const url = publicSessionLink(id);
      if (Platform.OS === "web") {
        await copyText(url);
        toast.show({ title: "Session link copied", tone: "success" });
      } else {
        await Share.share(
          Platform.OS === "ios"
            ? { title, message: title, url }
            : { title, message: `${title}\n${url}` }
        );
      }
    } catch {
      toast.show({
        title: "Couldn’t share this session",
        description: "Please try again.",
        tone: "error"
      });
    } finally {
      setSharing(false);
    }
  }
  return { share, sharing };
}
