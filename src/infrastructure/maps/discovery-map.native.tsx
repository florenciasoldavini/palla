import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { z } from "zod";
const bounds = z
  .object({
    west: z.number().finite().min(-180).max(180),
    east: z.number().finite().min(-180).max(180),
    south: z.number().min(-90).max(90),
    north: z.number().min(-90).max(90)
  })
  .refine((b) => b.south < b.north && b.west !== b.east);
import { MapAttribution } from "./map-attribution";
import {
  discoveryMapHtml,
  safeMapPoints,
  serializeMapData
} from "./discovery-map-html";
import type { DiscoveryMapProps } from "./discovery-map.types";
export function DiscoveryMap({
  points,
  center,
  initialBounds,
  recenter,
  topInset = 0,
  bottomInset = 104,
  selectedId,
  onLoad,
  onError,
  onSelect,
  onMove
}: DiscoveryMapProps) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const lastRecenter = useRef<number | undefined>(undefined);
  const selectionScript = `window.selectPoint && window.selectPoint(${JSON.stringify(selectedId ?? null)}, ${Math.max(104, bottomInset)}, ${topInset}); true;`;
  useEffect(() => {
    web.current?.injectJavaScript(selectionScript);
  }, [selectionScript]);
  useEffect(() => {
    if (!ready || !recenter || lastRecenter.current === recenter.requestId)
      return;
    lastRecenter.current = recenter.requestId;
    web.current?.injectJavaScript(
      `window.recenterMap && window.recenterMap(${serializeMapData(recenter)}); true;`
    );
  }, [ready, recenter]);
  const [source] = useState(() => ({
    html: discoveryMapHtml(points, topInset, center, initialBounds),
    baseUrl: "https://palla.vercel.app"
  }));
  const pointsScript = `window.updatePoints && window.updatePoints(${serializeMapData(safeMapPoints(points))}); true;`;
  useEffect(() => {
    web.current?.injectJavaScript(pointsScript);
  }, [pointsScript]);
  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={web}
        source={source}
        originWhitelist={["*"]}
        style={{ flex: 1, backgroundColor: "#f0eef8" }}
        onMessage={({ nativeEvent }) => {
          try {
            const m = JSON.parse(nativeEvent.data) as {
              type?: string;
              data?: unknown;
            };
            if (m.type === "loaded") {
              web.current?.injectJavaScript(pointsScript);
              web.current?.injectJavaScript(selectionScript);
              setReady(true);
              onLoad();
            }
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
