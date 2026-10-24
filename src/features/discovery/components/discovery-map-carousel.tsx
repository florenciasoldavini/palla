import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import type { DiscoverySession } from "../domain";
import { DiscoverySessionCard } from "./discovery-session-card";

export function DiscoveryMapCarousel({
  sessions,
  selected,
  onSelect,
  onOpen,
  onHeight,
  preview
}: {
  sessions: DiscoverySession[];
  selected: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHeight: (height: number) => void;
  preview: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(148);
  useLayoutEffect(() => setCardHeight(148), [fontScale]);
  const index = Math.max(
    0,
    sessions.findIndex((s) => s.id === selected)
  );
  const step = Math.max(240, width - 48) + 12;
  useEffect(() => {
    scroll.current?.scrollTo({ x: index * step, animated: true });
  }, [index, step]);
  return (
    <View
      style={{ position: "absolute", bottom: 28, left: 0, right: 0, gap: 8 }}
      onLayout={({ nativeEvent }) => {
        setWidth(nativeEvent.layout.width);
        onHeight(Math.ceil(nativeEvent.layout.height) + 28);
      }}
    >
      <ScrollView
        horizontal
        key={`${width}:${fontScale}`}
        contentOffset={{ x: index * step, y: 0 }}
        ref={scroll}
        style={{ height: cardHeight + 16, flexGrow: 0 }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 12,
          paddingVertical: 8
        }}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const next =
            sessions[
              Math.max(
                0,
                Math.min(
                  sessions.length - 1,
                  Math.round(nativeEvent.contentOffset.x / step)
                )
              )
            ];
          if (next) onSelect(next.id);
        }}
      >
        {sessions.map((s, i) => (
          <View
            key={s.id}
            style={{ width: step - 12, alignSelf: "flex-start" }}
            onLayout={({ nativeEvent }) => {
              if (Math.abs(i - index) <= 1)
                setCardHeight((h) =>
                  Math.max(h, Math.ceil(nativeEvent.layout.height))
                );
            }}
          >
            {Math.abs(i - index) <= 1 ? (
              <DiscoverySessionCard
                session={s}
                mapCard
                preview={preview}
                onPress={() => onOpen(s.id)}
              />
            ) : (
              <View style={{ height: cardHeight }} />
            )}
          </View>
        ))}
      </ScrollView>

      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Session ${index + 1} of ${sessions.length}`}
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 6
        }}
      >
        {sessions.length <= 7 ? (
          sessions.map((s, i) => (
            <View
              key={s.id}
              style={{
                height: 7,
                width: 7,
                borderRadius: 4,
                backgroundColor: i === index ? c.brand : c.border
              }}
            />
          ))
        ) : (
          <AppText
            variant="caption"
            style={{
              backgroundColor: c.surface,
              paddingHorizontal: 8,
              borderRadius: 8
            }}
          >
            {index + 1} / {sessions.length}
          </AppText>
        )}
      </View>
    </View>
  );
}
