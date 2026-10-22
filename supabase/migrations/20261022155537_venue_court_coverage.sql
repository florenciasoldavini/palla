-- Venue choices may contain either or both roof types; empty means unknown.
create function public.valid_venue_court_coverage(choices text[]) returns boolean
language sql immutable set search_path='' as $$
 select choices is not null and cardinality(choices)<=2
   and choices <@ array['covered','uncovered']::text[]
   and array_position(choices,null) is null
   and cardinality(choices)=(select count(distinct item) from unnest(choices) item);
$$;
alter table public.venues add column court_coverage text[] not null default '{}'
  check(public.valid_venue_court_coverage(court_coverage));
alter table public.session_series add column court_coverage text check(court_coverage in ('covered','uncovered'));
alter table public.sessions add column court_coverage text check(court_coverage in ('covered','uncovered'));

create function private.prepare_court_coverage(p_venue uuid,p_input jsonb,p_session uuid)
returns text language plpgsql security definer set search_path='' as $$
declare current_coverage text[]; next_coverage text[]; baseline text[]; creator uuid; selected text;
begin
 if auth.uid() is null or not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501'; end if;
 select court_coverage,created_by into current_coverage,creator from public.venues where id=p_venue and is_active for update;
 if not found then raise exception 'Choose an available venue'; end if;
 if p_input ? 'venueCourtCoverageEdited' and jsonb_typeof(p_input->'venueCourtCoverageEdited') is distinct from 'boolean' then raise exception 'Invalid venue court coverage'; end if;
 if coalesce((p_input->>'venueCourtCoverageEdited')::boolean,false) then
   if creator<>auth.uid() then raise exception 'Only the venue creator can change court coverage' using errcode='42501'; end if;
   if jsonb_typeof(p_input->'venueCourtCoverage') is distinct from 'array' or jsonb_typeof(p_input->'venueCourtCoverageBaseline') is distinct from 'array' then raise exception 'Invalid venue court coverage'; end if;
   next_coverage:=array(select jsonb_array_elements_text(p_input->'venueCourtCoverage') order by 1);
   baseline:=array(select jsonb_array_elements_text(p_input->'venueCourtCoverageBaseline') order by 1);
   if not public.valid_venue_court_coverage(next_coverage) or not public.valid_venue_court_coverage(baseline) then raise exception 'Invalid venue court coverage'; end if;
   current_coverage:=array(select unnest(current_coverage) order by 1);
   if current_coverage<>baseline then raise exception 'Venue court coverage changed. Reload before saving' using errcode='40001'; end if;
   update public.venues set court_coverage=next_coverage where id=p_venue;
   current_coverage:=next_coverage;
 end if;
 if p_input ? 'courtCoverage' then
   if jsonb_typeof(p_input->'courtCoverage') not in ('string','null') then raise exception 'Invalid session court coverage'; end if;
   selected:=p_input->>'courtCoverage';
 else
   select court_coverage into selected from public.sessions where id=p_session and organizer_id=auth.uid() and venue_id=p_venue;
 end if;
 if selected is not null and selected not in ('covered','uncovered') then raise exception 'Invalid session court coverage'; end if;
 if selected is null and cardinality(current_coverage)=1 then selected:=current_coverage[1]; end if;
 if selected is null and cardinality(current_coverage)=2 then raise exception 'Choose court coverage for this session'; end if;
 if selected is not null and cardinality(current_coverage)>0 and not(selected=any(current_coverage)) then raise exception 'Session court coverage is not available at this venue'; end if;
 return selected;
end $$;
revoke all on function private.prepare_court_coverage(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function private.prepare_court_coverage(uuid,jsonb,uuid) to authenticated;

do $$ declare definition text;needle text;begin
 definition:=pg_get_functiondef('private.save_organizer_session_without_covers(uuid,jsonb,boolean,uuid,text,timestamptz)'::regprocedure);
 needle:='attribute_json jsonb;';
 if position(needle in definition)=0 then raise exception 'Unexpected publisher declarations'; end if;
 definition:=replace(definition,needle,needle || ' coverage_value text;');
 needle:='if not exists (select 1 from public.venues where id = venue and is_active) then raise exception ''Choose an available venue''; end if;';
 if position(needle in definition)=0 then raise exception 'Unexpected publisher venue'; end if;
 definition:=replace(definition,needle,needle || ' coverage_value:=private.prepare_court_coverage(venue,p_input,p_session_id);');
 definition:=replace(definition,'set draft_input = p_input, status = ''active'', venue_id=venue','set draft_input = p_input, status = ''active'', court_coverage=coverage_value, venue_id=venue');
 needle:='court_label, capacity, allowed_categories';
 if position(needle in definition)=0 then raise exception 'Unexpected occurrence insert'; end if;
 definition:=replace(definition,needle,'court_label, court_coverage, capacity, allowed_categories');
 needle:='nullif(btrim(p_input->>''courtLabel''), ''''), (p_input->>''capacity'')';
 if position(needle in definition)=0 then raise exception 'Unexpected occurrence values'; end if;
 definition:=replace(definition,needle,'nullif(btrim(p_input->>''courtLabel''), ''''), coverage_value, (p_input->>''capacity'')');
 definition:=replace(definition,'update public.sessions set venue_id = venue, title','update public.sessions set court_coverage=coverage_value, venue_id = venue, title');
 definition:=replace(definition,'if p_scope=''future'' then update public.session_series set venue_id=venue','if p_scope=''future'' then update public.session_series set court_coverage=coverage_value, venue_id=venue');
 execute definition;
 definition:=pg_get_functiondef('public.get_public_session_detail(uuid)'::regprocedure);
 needle:='''court_label'', s.court_label';
 if position(needle in definition)=0 then raise exception 'Unexpected public detail'; end if;
 definition:=replace(definition,needle,needle || ',''court_coverage'',s.court_coverage');
 definition:=replace(definition,'''latitude'',v.latitude','''court_coverage'',v.court_coverage,''latitude'',v.latitude');
 execute definition;
 definition:=pg_get_functiondef('private.discover_sessions(text,text,date,date,integer,text,text)'::regprocedure);
 definition:=replace(definition,'v.latitude venue_latitude,','v.court_coverage venue_court_coverage,v.latitude venue_latitude,');
 definition:=replace(definition,'''title'',title,','''title'',title,''court_coverage'',court_coverage,');
 definition:=replace(definition,'''latitude'',venue_latitude','''court_coverage'',venue_court_coverage,''latitude'',venue_latitude');
 execute definition;
end $$;
