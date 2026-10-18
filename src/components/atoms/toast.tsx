import { Platform, useWindowDimensions, View } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  ReduceMotion,
  useReducedMotion
} from "react-native-reanimated";
import { FullWindowOverlay } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { atomMotion } from "./motion";
import { AppToastCard } from "./toast-card";
import type { AppToastInput } from "./toast-types";
export type { AppToastTone, AppToastInput } from "./toast-types";

type ToastController = { show: (input: AppToastInput) => void };
const AppToastContext = createContext<ToastController | null>(null);

/** One transient result at a time, hosted above native navigation screens. */
export function AppToastProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<(AppToastInput & { id: number }) | null>(
    null
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);
  const { width } = useWindowDimensions();
  const [busyId, setBusyId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const show = useCallback((input: AppToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setActive({ ...input, id: ++sequence.current });
    const duration =
      input.duration === undefined
        ? input.action || input.tone === "error" || input.tone === "warning"
          ? null
          : !input.description?.trim()
            ? 3000
            : 4500
        : input.duration;
    if (duration !== null)
      timer.current = setTimeout(() => setActive(null), duration);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const dismiss = (id: number) =>
    setActive((current) => (current?.id === id ? null : current));
  const runAction = async (input: AppToastInput & { id: number }) => {
    if (!input.action || busyId === input.id) return;
    setBusyId(input.id);
    try {
      await input.action.onPress();
      dismiss(input.id);
    } catch {
      show({
        title: "Couldn’t complete action",
        description: "Try again.",
        tone: "error",
        action: input.action
      });
    } finally {
      setBusyId((current) => (current === input.id ? null : current));
    }
  };
  // Keep the native overlay mounted so dismissal can finish its exit animation.
  const content = (
    <View
      collapsable={false}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        zIndex: 10000,
        elevation: 10000
      }}
    >
      {active ? (
        <Animated.View
          key={active.id}
          entering={(reducedMotion ? FadeIn : FadeInUp)
            .duration(atomMotion.duration.toastEnter)
            .easing(atomMotion.easing.measured)
            .reduceMotion(ReduceMotion.Never)
            .withInitialValues(
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, transform: [{ translateY: -8 }] }
            )}
          exiting={FadeOut.duration(atomMotion.duration.toastExit)
            .easing(atomMotion.easing.measured)
            .reduceMotion(ReduceMotion.Never)}
          style={{ position: "absolute", alignSelf: "center" }}
        >
          <AppToastCard
            input={active}
            busy={busyId === active.id}
            onAction={() => void runAction(active)}
            onDismiss={() => dismiss(active.id)}
            maxWidth={Math.min(
              Math.max(width - insets.left - insets.right - 32, 0),
              420
            )}
          />
        </Animated.View>
      ) : null}
    </View>
  );
  return (
    <AppToastContext.Provider value={{ show }}>
      {children}
      {Platform.OS === "ios" ? (
        <FullWindowOverlay>{content}</FullWindowOverlay>
      ) : (
        content
      )}
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(AppToastContext);
  if (!context)
    throw new Error("useAppToast must be used within AppToastProvider");
  return context;
}
