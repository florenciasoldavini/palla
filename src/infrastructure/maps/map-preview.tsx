import { createElement, useEffect, useRef } from "react";
import { View } from "react-native";
import { mapEmbedHtml } from "./map-embed";
import { MapAttribution } from "./map-attribution";
import type { MapPreviewProps } from "./map-preview.types";

export function MapPreview({ center, onLoad, onError }: MapPreviewProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "palla-map"
      )
        return;
      if (event.data.status === "loaded") onLoad();
      if (event.data.status === "error") onError();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onLoad, onError]);
  return (
    <View style={{ flex: 1 }}>
      {createElement("iframe", {
        ref: frame,
        srcDoc: mapEmbedHtml(center),
        sandbox: "allow-scripts",
        title: "Venue map",
        tabIndex: -1,
        onError,
        style: {
          width: "100%",
          height: "100%",
          border: 0,
          pointerEvents: "none"
        }
      })}
      <MapAttribution />
    </View>
  );
}
