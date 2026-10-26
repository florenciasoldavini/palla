import { useRef } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { googleMapStyle } from "./google-map-style";
import type { MapPreviewProps } from "./map-preview.types";
import {
  googleMapsConfigured,
  GoogleMapUnavailable
} from "./google-map-config.native";
export function MapPreview(props: MapPreviewProps) {
  return googleMapsConfigured ? (
    <GoogleMapPreview {...props} />
  ) : (
    <GoogleMapUnavailable onError={props.onError} />
  );
}
function GoogleMapPreview({
  center,
  onLoad,
  onAttributionPress
}: MapPreviewProps) {
  const map = useRef<MapView>(null);
  const camera = { center, zoom: 15.2, heading: 0, pitch: 0 };
  return (
    <View style={{ flex: 1 }}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MapView
          ref={map}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialCamera={camera}
          onMapReady={() => map.current?.setCamera(camera)}
          customMapStyle={googleMapStyle}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          showsIndoors={false}
          showsBuildings={false}
          showsPointsOfInterest={false}
          toolbarEnabled={false}
          onMapLoaded={onLoad}
        />
      </View>
      {/* Let the surrounding page handle swipes over this static map. Keep the
          SDK's untouched branding visible and provide its own link hit target. */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Google Maps"
        onPress={
          onAttributionPress ??
          (() => {
            void Linking.openURL("https://www.google.com/maps").catch(() => {});
          })
        }
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 100,
          height: 44
        }}
      />
    </View>
  );
}
