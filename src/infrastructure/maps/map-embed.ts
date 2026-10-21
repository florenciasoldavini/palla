import type { MapCenter } from "./map-preview.types";

/** Minimal, real street geometry; no fabricated roads or embedded provider UI. */
export function mapEmbedHtml({ longitude, latitude }: MapCenter) {
  if (
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180 ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 85
  ) {
    throw new Error("Invalid map location");
  }
  const style = {
    version: 8,
    sources: {
      streets: { type: "vector", url: "https://tiles.openfreemap.org/planet" }
    },
    layers: [
      {
        id: "ground",
        type: "background",
        paint: { "background-color": "#f0eef8" }
      },
      {
        id: "water",
        type: "fill",
        source: "streets",
        "source-layer": "water",
        paint: { "fill-color": "#e5e4f1" }
      },
      {
        id: "road-edge",
        type: "line",
        source: "streets",
        "source-layer": "transportation",
        filter: [
          "all",
          ["==", "$type", "LineString"],
          ["!in", "class", "rail", "transit", "ferry", "path", "track"]
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#e0dce9",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            2,
            15,
            6,
            18,
            18
          ]
        }
      },
      {
        id: "roads",
        type: "line",
        source: "streets",
        "source-layer": "transportation",
        filter: [
          "all",
          ["==", "$type", "LineString"],
          ["!in", "class", "rail", "transit", "ferry", "path", "track"]
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            1,
            15,
            4,
            18,
            12
          ]
        }
      }
    ]
  };
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://cdn.jsdelivr.net; connect-src https://tiles.openfreemap.org; img-src data: blob: https://tiles.openfreemap.org; worker-src blob:; child-src blob:;"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css"><style>html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#f0eef8}.maplibregl-canvas{outline:none}</style></head><body><div id="map"></div><script>function report(s){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else parent.postMessage({type:'palla-map',status:s},'*')}window.addEventListener('error',function(){report('error')});</script><script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js" onerror="report('error')"></script><script>try{var map=new maplibregl.Map({container:'map',style:${JSON.stringify(style)},center:[${longitude},${latitude}],zoom:15.2,interactive:false,attributionControl:false,renderWorldCopies:false,fadeDuration:0});var ready=false;map.once('idle',function(){ready=true;report('loaded')});map.on('error',function(){if(!ready)report('error')});}catch(e){report('error')}</script></body></html>`;
}
