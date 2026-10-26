import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { GoogleMapPin } from "./google-map-pin.native";
import { googleMapStyle } from "./google-map-style";
import {
  boundsForRegion,
  regionForBounds,
  clusterNativePoints,
  zoomForRegion
} from "./native-map-geometry";
import type { DiscoveryMapProps } from "./discovery-map.types";
import {
  googleMapsConfigured,
  GoogleMapUnavailable
} from "./google-map-config.native";
export function DiscoveryMap(props: DiscoveryMapProps) {
  return googleMapsConfigured ? (
    <GoogleDiscoveryMap {...props} />
  ) : (
    <GoogleMapUnavailable onError={props.onError} />
  );
}
function GoogleDiscoveryMap({
  points,
  center,
  initialBounds,
  recenter,
  selectedId,
  topInset = 0,
  bottomInset = 104,
  onLoad,
  onSelect,
  onMove
}: DiscoveryMapProps) {
  const map = useRef<MapView>(null);
  const [initial] = useState<Region>(() =>
    initialBounds
      ? regionForBounds(initialBounds)
      : {
          latitude: center?.latitude ?? points[0]?.latitude ?? -34.59,
          longitude: center?.longitude ?? points[0]?.longitude ?? -58.44,
          latitudeDelta: 0.055,
          longitudeDelta: 0.055
        }
  );
  const [region, setRegion] = useState(initial),
    [size, setSize] = useState({ width: 400, height: 800 }),
    [ready, setReady] = useState(false);
  const searchAfterCamera = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    lastSelection = useRef<string | undefined>(undefined),
    lastRecenter = useRef<number | undefined>(undefined);
  const cameraRevision = useRef(0);
  const hasReportedInitial = useRef(false);
  const callback = useRef(onMove);
  callback.current = onMove;
  useEffect(
    () => () => {
      cameraRevision.current++;
      clearTimeout(timer.current);
    },
    []
  );
  async function reportBounds(fallback: Region) {
    const revision = cameraRevision.current;
    try {
      const bounds = await map.current?.getMapBoundaries();
      if (revision !== cameraRevision.current || !bounds) return;
      hasReportedInitial.current = true;
      callback.current({
        west: bounds.southWest.longitude,
        east: bounds.northEast.longitude,
        south: bounds.southWest.latitude,
        north: bounds.northEast.latitude
      });
    } catch {
      if (revision === cameraRevision.current) {
        hasReportedInitial.current = true;
        callback.current(boundsForRegion(fallback));
      }
    }
  }
  const padding = useMemo(
    () => ({
      top: Math.min(topInset + 24, size.height - 160),
      bottom: Math.min(
        Math.max(136, bottomInset + 32),
        Math.max(136, size.height - topInset - 160)
      ),
      left: 48,
      right: 48
    }),
    [topInset, bottomInset, size.height]
  );
  const initialCamera = {
    center: { latitude: initial.latitude, longitude: initial.longitude },
    zoom: zoomForRegion(
      initial,
      size.width - padding.left - padding.right,
      size.height - padding.top - padding.bottom
    ),
    heading: 0,
    pitch: 0
  };
  useEffect(() => {
    if (!ready || !selectedId || lastSelection.current === selectedId) return;
    lastSelection.current = selectedId;
    clearTimeout(timer.current);
    searchAfterCamera.current = false;
    const p = points.find((p) => p.id === selectedId);
    if (p)
      map.current?.animateCamera(
        { center: { latitude: p.latitude, longitude: p.longitude } },
        { duration: 300 }
      );
  }, [ready, selectedId, points]);
  useEffect(() => {
    if (!selectedId) lastSelection.current = undefined;
  }, [selectedId]);
  useEffect(() => {
    if (!ready || !recenter || lastRecenter.current === recenter.requestId)
      return;
    lastRecenter.current = recenter.requestId;
    clearTimeout(timer.current);
    searchAfterCamera.current = true;
    map.current?.animateCamera(
      {
        center: { latitude: recenter.latitude, longitude: recenter.longitude },
        zoom: 14
      },
      { duration: 350 }
    );
  }, [recenter, ready]);
  const groups = useMemo(
    () =>
      clusterNativePoints(points, region, size.width, size.height, selectedId),
    [points, region, size, selectedId]
  );
  return (
    <View
      style={{ flex: 1 }}
      onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
    >
      <MapView
        ref={map}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialCamera={initialCamera}
        customMapStyle={googleMapStyle}
        mapPadding={padding}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsIndoors={false}
        showsBuildings={false}
        showsPointsOfInterest={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        moveOnMarkerPress={false}
        onMapReady={() => {
          map.current?.setCamera(initialCamera);
          setReady(true);
          void reportBounds(initial);
        }}
        onMapLoaded={onLoad}
        onRegionChangeStart={() => {
          cameraRevision.current++;
          clearTimeout(timer.current);
        }}
        onRegionChangeComplete={(next, details) => {
          setRegion(next);
          if (
            details.isGesture ||
            searchAfterCamera.current ||
            !hasReportedInitial.current
          ) {
            searchAfterCamera.current = false;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => void reportBounds(next), 500);
          }
        }}
      >
        {groups.map((g) => {
          const clustered = g.points.length > 1,
            p = g.points[0],
            selected = !clustered && p.id === selectedId;
          return (
            <GoogleMapPin
              key={clustered ? g.points.map((p) => p.id).join(":") : p.id}
              latitude={g.latitude}
              longitude={g.longitude}
              count={g.count}
              selected={selected}
              clustered={clustered}
              label={
                clustered
                  ? `${g.count} sessions at ${g.points.length} venues. Zoom in`
                  : `${p.name}, ${g.count} ${g.count === 1 ? "session" : "sessions"}`
              }
              onPress={() => {
                clearTimeout(timer.current);
                if (clustered) {
                  searchAfterCamera.current = true;
                  const revision = cameraRevision.current;
                  void map.current
                    ?.getCamera()
                    .then((camera) => {
                      if (revision !== cameraRevision.current) return;
                      map.current?.animateCamera(
                        {
                          center: {
                            latitude: g.latitude,
                            longitude: g.longitude
                          },
                          zoom: Math.min(18, (camera.zoom ?? 12) + 2)
                        },
                        { duration: 350 }
                      );
                    })
                    .catch(() => {
                      searchAfterCamera.current = false;
                    });
                } else {
                  searchAfterCamera.current = false;
                  onSelect(p.id);
                }
              }}
            />
          );
        })}
      </MapView>
    </View>
  );
}
