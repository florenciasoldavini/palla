export type DiscoveryMapPoint = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  count: number;
};
export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
export type DiscoveryMapProps = {
  points: DiscoveryMapPoint[];
  onLoad: () => void;
  onError: () => void;
  onSelect: (id: string) => void;
  onMove: (bounds: MapBounds) => void;
};
