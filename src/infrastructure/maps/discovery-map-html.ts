import { minimalMapStyle } from "./map-embed";
import type { DiscoveryMapPoint } from "./discovery-map.types";
export function discoveryMapHtml(points: DiscoveryMapPoint[]) {
  const safe = points.filter(
    (p) =>
      Number.isFinite(p.longitude) &&
      Math.abs(p.longitude) <= 180 &&
      Number.isFinite(p.latitude) &&
      Math.abs(p.latitude) <= 85
  );
  const data = JSON.stringify(safe)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://cdn.jsdelivr.net; connect-src https://tiles.openfreemap.org; img-src data: blob: https://tiles.openfreemap.org; worker-src blob:; child-src blob:;"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css"><style>html,body,#map{margin:0;width:100%;height:100%;background:#f0eef8}button.pin{border:2px solid white;border-radius:24px;background:#536600;color:white;min-width:48px;min-height:48px;padding:8px 12px;font:600 16px sans-serif;box-shadow:0 3px 10px #191a2429}</style></head><body><div id="map"></div><script>function report(type,data){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:type,data:data}))}window.addEventListener('error',function(){report('error')});</script><script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js" onerror="report('error')"></script><script>try{var points=${data};var center=points.length?[points[0].longitude,points[0].latitude]:[-58.44,-34.59];var map=new maplibregl.Map({container:'map',style:${JSON.stringify(minimalMapStyle)},center:center,zoom:12,attributionControl:false,renderWorldCopies:false});points.forEach(function(p){var el=document.createElement('button');el.className='pin';el.textContent=String(p.count);el.setAttribute('aria-label',p.name+', '+p.count+' sessions');el.onclick=function(e){e.stopPropagation();report('select',p.id)};new maplibregl.Marker({element:el}).setLngLat([p.longitude,p.latitude]).addTo(map)});if(points.length>1){var b=new maplibregl.LngLatBounds();points.forEach(function(p){b.extend([p.longitude,p.latitude])});map.fitBounds(b,{padding:{top:65,right:65,bottom:180,left:65},maxZoom:14,duration:0})}var ready=false;map.once('idle',function(){ready=true;report('loaded')});var userMoved=false;map.on('movestart',function(e){if(e.originalEvent)userMoved=true});map.on('moveend',function(){if(!userMoved)return;userMoved=false;var b=map.getBounds();report('move',{west:b.getWest(),east:b.getEast(),south:b.getSouth(),north:b.getNorth()})});map.on('error',function(){if(!ready)report('error')});}catch(e){report('error')}</script></body></html>`;
}
