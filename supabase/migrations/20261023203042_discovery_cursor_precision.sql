-- JSON float serialization can round a cursor below its source distance.
-- Use a millimetre numeric key consistently for nearest ordering and boundaries.
do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('private.discover_sessions_page(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb,jsonb,integer)'::regprocedure);
 definition:=replace(definition,'after_distance double precision','after_distance numeric');
 definition:=replace(definition,'(p_after->>''distance_m'')::double precision','(p_after->>''distance_m'')::numeric');
 definition:=replace(definition,'after_distance=''Infinity''::double precision or after_distance=''NaN''::double precision','after_distance>21000000');
 definition:=replace(definition,'(s.distance_m,s.starts_at,s.id)>(after_distance,after_start,after_id)','(round(s.distance_m::numeric,3),s.starts_at,s.id)>(after_distance,after_start,after_id)');
 definition:=replace(definition,'then distance_m end','then round(distance_m::numeric,3) end');
 definition:=replace(definition,'''price_minor'',price_minor,''distance_m'',distance_m)', '''price_minor'',price_minor,''distance_m'',round(distance_m::numeric,3))');
 execute definition;
end $migration$;
