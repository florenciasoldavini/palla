-- All account and session fixtures roll back.
begin;
-- Isolated identities generated for this transaction; never reuse real accounts.
select set_config('qa.host_id',gen_random_uuid()::text,true);
select set_config('qa.guest_id',gen_random_uuid()::text,true);
create function pg_temp.qa_host() returns uuid language sql stable as $$ select current_setting('qa.host_id')::uuid $$;
create function pg_temp.qa_guest() returns uuid language sql stable as $$ select current_setting('qa.guest_id')::uuid $$;
insert into auth.users(id) values(pg_temp.qa_host()),(pg_temp.qa_guest());
insert into public.profiles(id,first_name,onboarding_completed_at,category_status,playing_category)
values(pg_temp.qa_host(),'Rollback host',now(),'known',6),(pg_temp.qa_guest(),'Rollback guest',now(),'known',6);
insert into public.organizers(profile_id,display_name) values(pg_temp.qa_host(),'Rollback host');
create function pg_temp.coverage_rejected(statement text) returns void language plpgsql as $$
begin begin execute statement; exception when others then return; end;raise exception 'Expected coverage rejection: %',statement;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.qa_host()::text,true);
do $$ declare input jsonb;version timestamptz;v uuid;first_id uuid;second_id uuid;response jsonb;begin
 input:=jsonb_build_object('title','Coverage rollback','venueId','','venueName','Coverage rollback club','venueAddress','CoverageRollbackCity 123','courtLabel','Court 1','date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+28,'YYYY-MM-DD'),'startTime','19:00','endTime','20:30','repeat','weekly','capacity','4','price','0','description','','courtConfirmed',true,'categoryMode','all','registrationHours','2','cancellationHours','0',
 'settings',jsonb_build_object('visibility','public','allowed_categories',null,'waitlist_enabled',false,'waitlist_promotion_mode','automatic','waitlist_capacity',null,'registration_opens_minutes_before',null,'registration_closes_minutes_before',120,'cancellation_notice_minutes',0),
 'venueCourtCoverage',jsonb_build_array('covered'),'venueCourtCoverageBaseline','[]'::jsonb,'venueCourtCoverageEdited',true,'courtCoverage',null);
 perform public.save_organizer_session('ce100000-0000-4000-8000-000000000001',input,false);
 select updated_at into version from public.session_series where id='ce100000-0000-4000-8000-000000000001';
 perform public.save_organizer_session('ce100000-0000-4000-8000-000000000001',input,true,null,'one',version);
 select venue_id into v from public.session_series where id='ce100000-0000-4000-8000-000000000001';
 assert (select court_coverage from public.venues where id=v)=array['covered'],'Venue roof coverage saved';
 assert (select count(*) from public.sessions where series_id='ce100000-0000-4000-8000-000000000001' and court_coverage='covered')=3,'Single-type venue fills occurrence snapshots';
 assert (select court_coverage from public.session_series where id='ce100000-0000-4000-8000-000000000001')='covered','Series template stores coverage';
 select id into first_id from public.sessions where series_id='ce100000-0000-4000-8000-000000000001' order by starts_at limit 1;
 select id into second_id from public.sessions where series_id='ce100000-0000-4000-8000-000000000001' order by starts_at offset 1 limit 1;
 assert public.get_public_session_detail(first_id)->>'court_coverage'='covered','Public detail shows actual occurrence coverage';
 response:=public.discover_sessions('CoverageRollbackCity');
 assert response->'sessions'->0->>'court_coverage'='covered','Discovery receives occurrence coverage';
 assert response->'sessions'->0->'venue'->'court_coverage'=jsonb_build_array('covered'),'Discovery receives venue choices';
 -- Make the venue mixed, edit only the first occurrence, leaving other snapshots intact.
 input:=input||jsonb_build_object('venueId',v,'venueCourtCoverage',jsonb_build_array('uncovered','covered'),'venueCourtCoverageBaseline',jsonb_build_array('covered'),'courtCoverage','uncovered');
 select updated_at into version from public.sessions where id=first_id;
 perform public.save_organizer_session('ce100000-0000-4000-8000-000000000001',input,true,first_id,'one',version);
 assert (select court_coverage from public.sessions where id=first_id)='uncovered','Single occurrence uses chosen mixed-venue court';
 assert (select court_coverage from public.sessions where id=second_id)='covered','Other occurrences retain snapshots';
 assert (select court_coverage from public.session_series where id='ce100000-0000-4000-8000-000000000001')='covered','Single occurrence does not change series';
 perform pg_temp.coverage_rejected(format('select private.prepare_court_coverage(%L,%L::jsonb,null)',v,'{"courtCoverage":null}'));
 perform pg_temp.coverage_rejected(format('select private.prepare_court_coverage(%L,%L::jsonb,null)',v,'{"courtCoverage":"indoor"}'));
 perform pg_temp.coverage_rejected(format('select private.prepare_court_coverage(%L,%L::jsonb,null)',v,'{"venueCourtCoverageEdited":true,"venueCourtCoverage":["covered"],"venueCourtCoverageBaseline":[]}'));
 input:=input||jsonb_build_object('date',to_char(current_date+21,'YYYY-MM-DD'),'venueCourtCoverageEdited',false,'courtCoverage','uncovered');
 select updated_at into version from public.sessions where id=second_id;
 perform public.save_organizer_session('ce100000-0000-4000-8000-000000000001',input,true,second_id,'future',version);
 assert (select count(*) from public.sessions where series_id='ce100000-0000-4000-8000-000000000001' and court_coverage='uncovered')=3,'Future edit updates selected and subsequent occurrences';
 assert (select court_coverage from public.session_series where id='ce100000-0000-4000-8000-000000000001')='uncovered','Future edit updates template';
 perform pg_temp.coverage_rejected(format('update public.venues set court_coverage=array[''covered''] where id=%L',v));
end $$;
reset role;
do $$ declare v uuid;begin
 select id into v from public.venues where name='Coverage rollback club';
 perform pg_temp.coverage_rejected(format('update public.venues set court_coverage=array[''indoor''] where id=%L',v));
 perform pg_temp.coverage_rejected(format('update public.venues set court_coverage=array[''covered'',''covered''] where id=%L',v));
 update public.venues set court_coverage='{}' where id=v;
 assert (select count(*) from public.sessions where venue_id=v and court_coverage='uncovered')=3,'Changing venue does not rewrite session history';
end $$;
insert into public.organizers(profile_id,display_name) values(pg_temp.qa_guest(),'Coverage rollback host B') on conflict(profile_id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.qa_guest()::text,true);
do $$ declare v uuid;begin
 select id into v from public.venues where name='Coverage rollback club';
 perform pg_temp.coverage_rejected(format('select private.prepare_court_coverage(%L,%L::jsonb,null)',v,'{"venueCourtCoverageEdited":true,"venueCourtCoverage":["covered"],"venueCourtCoverageBaseline":[]}'));
 assert private.prepare_court_coverage(v,'{}'::jsonb,null) is null,'Unknown venue remains unspecified';
 assert private.prepare_court_coverage(v,'{"courtCoverage":"covered"}'::jsonb,null)='covered','A host can specify own session coverage without changing unknown venue metadata';
end $$;
reset role;
set local role anon;
do $$ declare response jsonb;begin
 response:=public.discover_sessions('CoverageRollbackCity');
 assert jsonb_array_length(response->'sessions')=3,'Anonymous browse still works';
 perform pg_temp.coverage_rejected('select private.prepare_court_coverage(null,''{}''::jsonb,null)');
end $$;
reset role;
rollback;
