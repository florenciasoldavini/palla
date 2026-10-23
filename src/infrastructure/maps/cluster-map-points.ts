/** Shared embedded implementation: Hermes does not retain Function.toString source. */
export const clusterMapPointsScript = `function clusterMapPoints(points,project,radius,selectedId){
 var groups=[];
 points.slice().sort(function(a,b){return a.id.localeCompare(b.id)}).forEach(function(point){
  var pixel=project(point);
  var group=point.id===selectedId?null:groups.find(function(g){return g.points[0].id!==selectedId && Math.hypot(g.x-pixel.x,g.y-pixel.y)<radius});
  if(group){var size=group.points.length;group.x=(group.x*size+pixel.x)/(size+1);group.y=(group.y*size+pixel.y)/(size+1);group.points.push(point);group.count+=point.count;}
  else groups.push({points:[point],x:pixel.x,y:pixel.y,count:point.count});
 });
 return groups;
}`;
