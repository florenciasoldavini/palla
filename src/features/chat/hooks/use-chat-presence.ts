import { useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { subscribeToOnline } from "../services/chat.service";

/** Own presence lives at the app root; peer observation lives in a focused chat. */
export function useChatPresence(
  subject: string | undefined,
  publish = false,
  enabled = true
) {
  const { user, session } = useContext(AuthContext);
  const actor = user?.onboarding_completed_at ? user.id : undefined;
  const token = session?.user.id === actor ? session?.access_token : undefined;
  const [state, setState] = useState<{
    subject: string;
    online: boolean;
  } | null>(null);
  useEffect(() => {
    if (
      !enabled ||
      !actor ||
      !token ||
      !subject ||
      (publish && subject !== actor)
    )
      return;
    let stop: (() => void) | undefined;
    const change = (online: boolean) => setState({ subject, online });
    const update = () => {
      const active =
        AppState.currentState === "active" && onlineManager.isOnline();
      if (!active) {
        stop?.();
        stop = undefined;
        change(false);
      } else if (!stop)
        stop = subscribeToOnline(subject, token, publish, change);
    };
    update();
    const app = AppState.addEventListener("change", update);
    const network = onlineManager.subscribe(update);
    return () => {
      app.remove();
      network();
      stop?.();
    };
  }, [subject, actor, token, publish, enabled]);
  return !!(
    enabled &&
    token &&
    state &&
    state.subject === subject &&
    state.online
  );
}
