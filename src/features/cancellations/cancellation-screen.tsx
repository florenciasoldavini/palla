import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useNavigation,
  usePreventRemove,
  type NavigationAction
} from "@react-navigation/native";
import { useAppToast } from "@/components/atoms";
import { useCancellation } from "./hooks/use-cancellation";
import { cancellationErrorMessage } from "./domain";
import { CancellationScreenView } from "./components/cancellation-screen-view";
export default function CancellationScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter(),
    navigation = useNavigation(),
    toast = useAppToast();
  const { query, cancel } = useCancellation(id);
  const [dirty, setDirty] = useState(false),
    [leaving, setLeaving] = useState(false),
    [pending, setPending] = useState<NavigationAction | null>(null);
  usePreventRemove((dirty || cancel.isPending) && !leaving, ({ data }) => {
    if (cancel.isPending) return;
    Alert.alert(
      "Discard cancellation?",
      "Your cancellation has not been sent. Your selections and message will be lost.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setPending(data.action);
            setLeaving(true);
          }
        }
      ]
    );
  });
  useEffect(() => {
    if (!leaving) return;
    if (pending) navigation.dispatch(pending);
    else
      router.replace({ pathname: "/organizer-session/[id]", params: { id } });
  }, [leaving, pending, navigation, router, id]);
  const back = () =>
    router.canGoBack()
      ? router.back()
      : dirty
        ? Alert.alert(
            "Discard cancellation?",
            "Your unsent message will be lost.",
            [
              { text: "Keep editing", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => setLeaving(true)
              }
            ]
          )
        : setLeaving(true);
  return (
    <CancellationScreenView
      context={query.data}
      loading={query.isPending}
      error={query.isError && !query.data}
      busy={cancel.isPending}
      onRetry={() => void query.refetch()}
      onBack={back}
      onDirty={setDirty}
      onCancel={async (input) => {
        try {
          await cancel.mutateAsync(input);
          toast.show({ title: "Session cancelled", tone: "success" });
          setLeaving(true);
        } catch (error) {
          toast.show({
            title: "Couldn’t cancel session",
            description: cancellationErrorMessage(error),
            tone: "error"
          });
          void query.refetch();
        }
      }}
    />
  );
}
