/** Google Maps JSON style: Palla lilac ground, white roads, quiet labels. */
export const googleMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f0eef8" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#696576" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f0eef8" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e0dce9" }]
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e5e4f1" }]
  }
];
