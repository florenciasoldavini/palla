import { View } from "react-native";
import { WebView } from "react-native-webview";
import { mapEmbedHtml } from "./map-embed";
import { MapAttribution } from "./map-attribution";
import type { MapPreviewProps } from "./map-preview.types";

export function MapPreview({ center, onLoad, onError }: MapPreviewProps) {
  return (
    <View style={{ flex: 1 }}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flex: 1 }}
      >
        <WebView
          source={{
            html: mapEmbedHtml(center),
            baseUrl: "https://palla.vercel.app"
          }}
          originWhitelist={["*"]}
          style={{ flex: 1, backgroundColor: "#f0eef8" }}
          onMessage={({ nativeEvent }) => {
            if (nativeEvent.data === "loaded") onLoad();
            if (nativeEvent.data === "error") onError();
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
      </View>
      <MapAttribution />
    </View>
  );
}
