import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { z } from "zod";
import { MapAttribution } from "./map-attribution";
import { discoveryMapHtml } from "./discovery-map-html";
import type { DiscoveryMapProps } from "./discovery-map.types";
const bounds = z.object({
  west: z.number().finite(),
  east: z.number().finite(),
  south: z.number().min(-90).max(90),
  north: z.number().min(-90).max(90)
});
export function DiscoveryMap({
  points,
  topInset = 0,
  onLoad,
  onError,
  onSelect,
  onMove
}: DiscoveryMapProps) {
  const source = useMemo(
    () => ({
      html: discoveryMapHtml(points, topInset),
      baseUrl: "https://palla.vercel.app"
    }),
    [points, topInset]
  );
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={source}
        originWhitelist={["*"]}
        style={{ flex: 1, backgroundColor: "#f0eef8" }}
        onMessage={({ nativeEvent }) => {
          try {
            const m = JSON.parse(nativeEvent.data) as {
              type?: string;
              data?: unknown;
            };
            if (m.type === "loaded") onLoad();
            if (m.type === "error") onError();
            if (
              m.type === "select" &&
              typeof m.data === "string" &&
              points.some((p) => p.id === m.data)
            )
              onSelect(m.data);
            if (m.type === "move") {
              const b = bounds.safeParse(m.data);
              if (b.success) onMove(b.data);
            }
          } catch {
            /* Ignore malformed messages from the embedded document. */
          }
        }}
        onError={onError}
        onContentProcessDidTerminate={onError}
        onRenderProcessGone={onError}
        scrollEnabled={false}
        bounces={false}
        geolocationEnabled={false}
        allowsLinkPreview={false}
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        mixedContentMode="never"
        onShouldStartLoadWithRequest={({ url }) =>
          url === "about:blank" || url === "https://palla.vercel.app/"
        }
      />
      <MapAttribution />
    </View>
  );
}
