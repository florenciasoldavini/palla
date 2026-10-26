import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Callout, Marker, type MapMarker } from "react-native-maps";

export function GoogleMapPin({
  latitude,
  longitude,
  count,
  label,
  selected,
  clustered,
  onPress
}: {
  latitude: number;
  longitude: number;
  count: number;
  label: string;
  selected: boolean;
  clustered: boolean;
  onPress: () => void;
}) {
  const marker = useRef<MapMarker>(null);
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(timer);
  }, [count, selected, clustered]);
  return (
    <Marker
      ref={marker}
      coordinate={{ latitude, longitude }}
      style={{ width: 32, height: 32 }}
      tracksViewChanges={tracking}
      anchor={{ x: 0.5, y: 0.5 }}
      title={label}
      zIndex={selected ? 3 : clustered ? 2 : 1}
      onPress={() => {
        marker.current?.hideCallout();
        onPress();
      }}
    >
      <View
        collapsable={false}
        style={{
          width: 32,
          height: 32,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 16,
          borderWidth: 2,
          borderColor: selected ? "#536600" : "#ffffff",
          backgroundColor: selected
            ? "#ccff00"
            : clustered
              ? "#191a24"
              : "#536600"
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: selected ? "#354400" : "#ffffff"
          }}
        >
          {count >= 1000 ? `${Math.floor(count / 1000)}k` : count}
        </Text>
      </View>
      {/* Google uses the title for Android accessibility. The bottom session
          carousel supplies the detail UI instead of an SDK info bubble. */}
      <Callout tooltip>
        <View style={{ width: 1, height: 1 }} />
      </Callout>
    </Marker>
  );
}
