import { useContext, useEffect } from "react";
import { AppState, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { chatOutbox } from "../services/chat-outbox.service";
import { chatLocalStore } from "../services/chat-offline.service";
export function ChatOutboxSync() {
  const { session, user } = useContext(AuthContext);
  const actor =
    session?.user.id === user?.id && user?.onboarding_completed_at
      ? user.id
      : undefined;
  useEffect(() => {
    if (Platform.OS === "web") {
      chatOutbox.configure(undefined, false);
      return;
    }
    let alive = true,
      ready = false,
      connected = false;
    const update = () =>
      chatOutbox.configure(
        actor,
        !!actor &&
          alive &&
          ready &&
          connected &&
          AppState.currentState === "active"
      );
    if (actor)
      void chatLocalStore
        .recover(actor)
        .then(() => {
          ready = true;
          update();
        })
        .catch(() => undefined);
    const stopNetwork = NetInfo.addEventListener((state) => {
      connected =
        state.isConnected === true && state.isInternetReachable !== false;
      onlineManager.setOnline(connected);
      update();
    });
    const app = AppState.addEventListener("change", update);
    const stopStore = chatLocalStore.subscribe(() => chatOutbox.wake());
    const timer = setInterval(() => chatOutbox.wake(), 2000);
    return () => {
      alive = false;
      chatOutbox.configure(undefined, false);
      stopNetwork();
      app.remove();
      stopStore();
      clearInterval(timer);
    };
  }, [actor]);
  return null;
}
