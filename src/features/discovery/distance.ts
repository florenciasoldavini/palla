/** Approximate straight-line distance from the current nearby-search origin. */
export function discoveryDistanceLabel(distance?: number | null) {
  if (distance == null || !Number.isFinite(distance) || distance < 0)
    return null;
  if (distance < 100) return "<100 m away";
  const meters = Math.round(distance / 100) * 100;
  if (meters < 1000) return `${meters} m away`;
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(distance / 1000)} km away`;
}
