import { Keyboard } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadConversationSearch } from "../services/chat.service";
import type { ChatSearchLoader } from "../search-domain";
export function useChatSearch(
  actor: string,
  id: string,
  loader: ChatSearchLoader = loadConversationSearch
) {
  const [active, setActive] = useState(false);
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState({ term: "", index: 0 });
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setSelection((s) =>
          s.term === input.trim() ? s : { term: input.trim(), index: 0 }
        ),
      300
    );
    return () => clearTimeout(timer);
  }, [input]);
  const query = useQuery({
    queryKey: ["chat-search", actor, id, selection.term, selection.index],
    queryFn: () => loader(id, selection.term, selection.index),
    enabled: active && !!selection.term,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchInterval: active ? 20000 : false
  });
  const debouncing = input.trim() !== selection.term;
  const page = !debouncing && active && selection.term ? query.data : undefined;
  const close = useCallback(() => {
    Keyboard.dismiss();
    setActive(false);
    setInput("");
    setSelection({ term: "", index: 0 });
  }, []);
  return {
    active,
    input,
    term: selection.term,
    page,
    loading: !!input.trim() && (debouncing || query.isPending),
    error: !debouncing && !!selection.term && query.isError,
    retry: () => void query.refetch(),
    setInput,
    open: () => setActive(true),
    close,
    move: (direction: "older" | "newer") => {
      if (!page || query.isFetching || debouncing || page.index === null)
        return;
      setSelection((s) => ({
        ...s,
        index: Math.max(
          0,
          Math.min(
            page.total - 1,
            page.index! + (direction === "older" ? 1 : -1)
          )
        )
      }));
    }
  };
}
export type ChatSearchState = ReturnType<typeof useChatSearch>;
