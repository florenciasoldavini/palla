export type MapCenter = { longitude: number; latitude: number };
export type MapPreviewProps = {
  center: MapCenter;
  onLoad: () => void;
  onError: () => void;
  onAttributionPress?: () => void;
};
