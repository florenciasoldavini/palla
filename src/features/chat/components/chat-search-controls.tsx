import {
  AppButton,
  AppText,
  EmptyState,
  ErrorState,
  TextField
} from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  X
} from "lucide-react-native";
import { ActivityIndicator, Keyboard, Pressable, View } from "react-native";
import type { ChatSearchState } from "../hooks/use-chat-search";
export function ChatSearchHeader({ search }: { search: ChatSearchState }) {
  return (
    <View
      style={{ paddingHorizontal: sp[3], paddingBottom: sp[3], gap: sp[2] }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[1] }}>
        <AppButton
          variant="ghost"
          layout="icon"
          fullWidth={false}
          icon={ArrowLeft}
          accessibilityLabel="Close conversation search"
          onPress={search.close}
        />
        <View style={{ flex: 1, position: "relative" }}>
          <TextField
            autoFocus
            value={search.input}
            onChangeText={search.setInput}
            maxLength={200}
            placeholder="Search messages…"
            accessibilityLabel="Search in this conversation"
            leftIcon={Search}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            inputStyle={{ paddingRight: search.input ? 48 : 12 }}
          />
          {!!search.input && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear conversation search"
              onPress={() => search.setInput("")}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: 48,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <X size={20} color={c.textSubtle} />
            </Pressable>
          )}
        </View>
        <AppButton
          variant="ghost"
          color="accent"
          size="sm"
          fullWidth={false}
          onPress={search.close}
        >
          Done
        </AppButton>
      </View>
      <AppText variant="caption" tone="subtle" style={{ textAlign: "center" }}>
        Search in this conversation
      </AppText>
    </View>
  );
}
export function ChatSearchFeedback({ search }: { search: ChatSearchState }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: sp[6] }}>
      {search.loading ? (
        <View style={{ alignItems: "center", gap: sp[3] }}>
          <ActivityIndicator
            color={c.accent}
            accessibilityLabel="Searching messages"
          />
          <AppText tone="subtle">Searching messages…</AppText>
        </View>
      ) : search.error ? (
        <ErrorState
          contained
          title="Search couldn’t load"
          description="Check your connection and try again."
          onRetry={search.retry}
        />
      ) : (
        <EmptyState
          contained
          icon={Search}
          title={search.input.trim() ? "No messages found" : "Find a message"}
          description={
            search.input.trim()
              ? "Try another word or phrase."
              : "Search for a word or phrase in this conversation."
          }
        />
      )}
    </View>
  );
}
export function ChatSearchNavigation({ search }: { search: ChatSearchState }) {
  const page = search.page;
  const index = page?.index;
  const disabled = search.loading || search.error || index == null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[2] }}>
      <AppText
        variant="bodySm"
        accessibilityLiveRegion="polite"
        style={{ flex: 1 }}
      >
        {search.loading
          ? "Searching…"
          : search.error
            ? "Search unavailable"
            : !search.input.trim()
              ? "Search conversation history"
              : page?.total && index != null
                ? `${page.total - index} of ${page.total} matches`
                : "0 matches"}
      </AppText>
      <AppButton
        variant="ghost"
        style={{ backgroundColor: c.surfaceRaised }}
        layout="icon"
        fullWidth={false}
        icon={ChevronUp}
        accessibilityLabel="Older search match"
        isDisabled={disabled || index! >= (page?.total ?? 0) - 1}
        onPress={() => {
          Keyboard.dismiss();
          search.move("older");
        }}
      />
      <AppButton
        variant="ghost"
        style={{ backgroundColor: c.surfaceRaised }}
        layout="icon"
        fullWidth={false}
        icon={ChevronDown}
        accessibilityLabel="Newer search match"
        isDisabled={disabled || index! <= 0}
        onPress={() => {
          Keyboard.dismiss();
          search.move("newer");
        }}
      />
    </View>
  );
}
