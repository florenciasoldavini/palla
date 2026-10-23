import * as Location from "expo-location";
/** One foreground fix on explicit request. No watching or background tracking. */
export async function readCurrentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error(
      "Location access is off. Enable it in your phone’s settings to find nearby sessions."
    );
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error(
      "Turn on your phone’s location services to find nearby sessions."
    );
  }
  const cached = await Location.getLastKnownPositionAsync({
    maxAge: 60000,
    requiredAccuracy: 1000
  });
  const position =
    cached ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: false
    }));
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
}
