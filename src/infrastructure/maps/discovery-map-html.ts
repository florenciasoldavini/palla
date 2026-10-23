import { clusterMapPointsScript } from "./cluster-map-points";
import { minimalMapStyle } from "./map-embed";
import type { DiscoveryMapPoint, MapBounds } from "./discovery-map.types";
export function serializeMapData(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export function safeMapPoints(points: DiscoveryMapPoint[]) {
  return points.filter(
    (p) =>
      Number.isFinite(p.longitude) &&
      Math.abs(p.longitude) <= 180 &&
      Number.isFinite(p.latitude) &&
      Math.abs(p.latitude) <= 85
  );
}
export function discoveryMapHtml(
  points: DiscoveryMapPoint[],
  topInset = 0,
  center?: { latitude: number; longitude: number },
  initialBounds?: MapBounds | null
) {
  const safeInset = Number.isFinite(topInset)
    ? Math.max(0, Math.min(320, topInset))
    : 0;
  const safe = safeMapPoints(points);
  const start = center
    ? [center.longitude, center.latitude]
    : safe.length
      ? [safe[0].longitude, safe[0].latitude]
      : [-58.44, -34.59];
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://cdn.jsdelivr.net; connect-src https://tiles.openfreemap.org; img-src data: blob: https://tiles.openfreemap.org; worker-src blob:; child-src blob:;"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css"><style>html,body,#map{margin:0;width:100%;height:100%;background:#f0eef8}button.pin.cluster{background:#191a24;box-shadow:0 0 0 4px #eeecf8,0 3px 10px #191a2429}button.pin.selected{background:#ccff00;color:#354400;border-color:#536600}button.pin{border:2px solid white;border-radius:24px;background:#536600;color:white;min-width:48px;min-height:48px;padding:8px 12px;font:600 16px sans-serif;box-shadow:0 3px 10px #191a2429}</style></head><body><div id="map"></div><script>function report(type,data){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:type,data:data}))}window.addEventListener('error',function(){report('error')});</script><script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js" onerror="report('error')"></script><script>try{
var points=${serializeMapData(safe)}, initialBounds=${serializeMapData(initialBounds ?? null)};
var map=new maplibregl.Map({container:'map',style:${serializeMapData(minimalMapStyle)},center:${serializeMapData(start)},zoom:12,attributionControl:false,renderWorldCopies:false});
var padding={top:Math.min(${safeInset},Math.max(0,window.innerHeight-160))+24,right:48,bottom:104,left:48};map.setPadding(padding);
var markers=[], lastSelected=null, userMoved=false, moveTimer=null;
function longitude(n){return n===180?180:((n+180)%360+360)%360-180}function reportBounds(){var b=map.getBounds();var world=b.getEast()-b.getWest()>=360;report('move',{west:world?-180:longitude(b.getWest()),east:world?180:longitude(b.getEast()),south:Math.max(-90,b.getSouth()),north:Math.min(90,b.getNorth())})}
function stopUserSearch(){userMoved=false;expandSearch=false;clearTimeout(moveTimer)}
${clusterMapPointsScript}
var expandSearch=false;
function renderMarkers(){
 markers.forEach(function(m){m.marker.remove()});markers=[];
 clusterMapPoints(points,function(p){return map.project([p.longitude,p.latitude])},map.getZoom()<18?64:0,lastSelected).forEach(function(g){
 var p=g.points[0], clustered=g.points.length>1, coords=clustered?map.unproject([g.x,g.y]).toArray():[p.longitude,p.latitude];
 var el=document.createElement('button');el.className=clustered?'pin cluster':'pin';el.textContent=String(g.count);
 el.setAttribute('aria-label',clustered?g.count+' sessions at '+g.points.length+' venues. Zoom in':p.name+', '+p.count+' sessions');
 el.classList.toggle('selected',!clustered && p.id===lastSelected);el.setAttribute('aria-pressed',String(!clustered && p.id===lastSelected));
 el.onclick=function(e){e.stopPropagation();if(clustered){stopUserSearch();expandSearch=true;map.easeTo({center:coords,zoom:Math.min(18,map.getZoom()+2),duration:350});}else report('select',p.id)};
 var marker=new maplibregl.Marker({element:el}).setLngLat(coords).addTo(map);markers.push({id:clustered?null:p.id,el:el,coords:coords,marker:marker});
 });
}
window.updatePoints=function(next){points=next;renderMarkers()};
window.selectPoint=function(id,bottom,top){
 stopUserSearch();var nextBottom=Math.min(bottom,Math.max(104,window.innerHeight-padding.top-100));
 var nextTop=Math.min(top,Math.max(0,window.innerHeight-160))+24;
 if(padding.bottom!==nextBottom || padding.top!==nextTop){padding.bottom=nextBottom;padding.top=nextTop;map.setPadding(padding)}
 var changed=lastSelected!==id;lastSelected=id;renderMarkers();
 var point=points.find(function(p){return p.id===id});if(changed && point)map.easeTo({center:[point.longitude,point.latitude],duration:300});
};
window.updatePoints(points);
if(initialBounds){var east=initialBounds.east<initialBounds.west?initialBounds.east+360:initialBounds.east;map.fitBounds([[initialBounds.west,initialBounds.south],[east,initialBounds.north]],{padding:0,duration:0})}
else if(!${Boolean(center)} && points.length>1){var b=new maplibregl.LngLatBounds();points.forEach(function(p){b.extend([p.longitude,p.latitude])});map.fitBounds(b,{padding:padding,maxZoom:14,duration:0})}
var ready=false;map.once('idle',function(){ready=true;renderMarkers();report('loaded');reportBounds()});
map.on('movestart',function(e){clearTimeout(moveTimer);userMoved=Boolean(e.originalEvent)});
map.on('moveend',function(){renderMarkers();if(!userMoved && !expandSearch)return;userMoved=false;expandSearch=false;moveTimer=setTimeout(reportBounds,500)});
map.on('error',function(){if(!ready)report('error')});
}catch(e){report('error')}</script></body></html>`;
}
