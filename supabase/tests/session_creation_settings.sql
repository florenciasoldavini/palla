-- Run against the isolated migrated database. All fixture writes roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000f01'), ('00000000-0000-4000-8000-000000000f02');
insert into public.profiles(id,first_name,preferred_mode,onboarding_completed_at) values ('00000000-0000-4000-8000-000000000f01','Settings QA','organizer',now()), ('00000000-0000-4000-8000-000000000f02','Other QA','organizer',now());
insert into public.organizers(profile_id,display_name,status) values ('00000000-0000-4000-8000-000000000f01','Settings QA','active'),('00000000-0000-4000-8000-000000000f02','Other QA','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000f01',true);
do $$
declare input jsonb; first_id uuid; first_version timestamptz; first_start timestamptz; second_id uuid; second_version timestamptz; venue uuid; result uuid;
begin
  input := jsonb_build_object('title','Settings QA','venueId','','venueName','Settings QA Club','venueAddress','QA address','courtLabel','Court 1','date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+28,'YYYY-MM-DD'),'startTime','19:00','endTime','20:30','repeat','weekly','capacity','4','price','0','description','','courtConfirmed',true,
    'settings',jsonb_build_object('visibility','public','allowed_categories',jsonb_build_array(5,7),'waitlist_enabled',true,'waitlist_promotion_mode','manual','waitlist_capacity',3,'registration_opens_minutes_before',10080,'registration_closes_minutes_before',120,'cancellation_notice_minutes',null));
  result := public.save_organizer_session('00000000-0000-4000-8000-000000000f10',input,true);
  assert (select count(*)=3 from public.sessions where series_id=result), 'Weekly occurrences missing';
  assert (select bool_and(allowed_categories=array[5,7]::smallint[] and visibility='public' and waitlist_enabled and waitlist_promotion_mode='manual' and waitlist_capacity=3 and registration_opens_at=starts_at-interval '7 days' and registration_closes_at=starts_at-interval '2 hours' and cancellation_deadline_at is null) from public.sessions where series_id=result), 'Settings did not propagate';
  assert (select registration_opens_minutes_before=10080 and allowed_categories=array[5,7]::smallint[] from public.session_series where id=result), 'Series defaults missing';
  perform public.save_organizer_session(result,input,true);
  assert (select count(*)=3 from public.sessions where series_id=result), 'Publish retry duplicated dates';
  select id,updated_at,starts_at,venue_id into first_id,first_version,first_start,venue from public.sessions where series_id=result order by starts_at limit 1;
  select id,updated_at into second_id,second_version from public.sessions where series_id=result order by starts_at offset 1 limit 1;
  input := jsonb_set(input,'{settings}', jsonb_build_object('visibility','private','allowed_categories',null,'waitlist_enabled',false,'waitlist_promotion_mode','automatic','waitlist_capacity',null,'registration_opens_minutes_before',null,'registration_closes_minutes_before',null,'cancellation_notice_minutes',null));
  perform public.save_organizer_session(result,input,true,first_id,'one',first_version);
  assert (select allowed_categories is null and visibility='private' and registration_opens_at is null and registration_closes_at is null and cancellation_deadline_at is null and not waitlist_enabled from public.sessions where id=first_id), 'Optional values failed';
  assert (select allowed_categories=array[5,7]::smallint[] from public.sessions where id=second_id), 'One-date edit changed future';
  begin
    perform public.save_organizer_session(result,input,true,first_id,'one',first_version);
    raise exception 'Stale version unexpectedly accepted';
  exception when raise_exception then if sqlerrm not like 'Session changed%' then raise; end if; end;
  input := jsonb_set(input,'{settings,waitlist_enabled}','true');
  input := jsonb_set(input,'{settings,waitlist_promotion_mode}','"automatic"');
  input := jsonb_set(input,'{settings,waitlist_capacity}','5');
  input := jsonb_set(input,'{date}',to_jsonb(to_char(first_start at time zone 'America/Argentina/Buenos_Aires' + interval '7 days','YYYY-MM-DD')));
  perform public.save_organizer_session(result,input,true,second_id,'future',second_version);
  assert (select count(*)=2 from public.sessions where series_id=result and waitlist_enabled and waitlist_capacity=5), 'Future scope wrong';
  assert (select waitlist_enabled and waitlist_capacity=5 from public.session_series where id=result), 'Future defaults not updated';
  assert not public.valid_session_categories(array[5,5]::smallint[]) and not public.valid_session_categories(array[0,9]::smallint[]) and not public.valid_session_categories(array[]::smallint[]) and not public.valid_session_categories(array[null]::smallint[]), 'Invalid categories accepted';
  begin
    update public.sessions set allowed_categories=array[5,5]::smallint[] where id=first_id;
    raise exception 'Constraint unexpectedly accepted duplicates';
  exception when check_violation then null; end;
  input := jsonb_set(input,'{settings,registration_opens_minutes_before}','120');
  input := jsonb_set(input,'{settings,registration_closes_minutes_before}','120');
  begin
    perform public.save_organizer_session('00000000-0000-4000-8000-000000000f11',input,true);
    raise exception 'Invalid window unexpectedly accepted';
  exception when raise_exception then if sqlerrm <> 'Invalid session settings' then raise; end if; end;
  input := jsonb_set(input,'{settings,registration_opens_minutes_before}','null');
  input := jsonb_set(input,'{settings,registration_closes_minutes_before}','null');
  input := jsonb_set(input,'{settings,waitlist_capacity}','0');
  begin
    perform public.save_organizer_session('00000000-0000-4000-8000-000000000f12',input,true);
    raise exception 'Invalid queue unexpectedly accepted';
  exception when raise_exception then if sqlerrm <> 'Invalid session settings' then raise; end if; end;
  input := (input-'settings') || jsonb_build_object('categoryMode','range','categoryMin','6','categoryMax','7','registrationHours','2','cancellationHours','24','repeat','once');
  perform public.save_organizer_session('00000000-0000-4000-8000-000000000f13',input,true);
  assert (select allowed_categories=array[6,7]::smallint[] and visibility='private' and registration_closes_at=starts_at-interval '2 hours' from public.sessions where series_id='00000000-0000-4000-8000-000000000f13'), 'Legacy form compatibility failed';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000f02',true);
do $$ begin
  assert not exists(select 1 from public.sessions where organizer_id='00000000-0000-4000-8000-000000000f01'), 'Visibility flag widened RLS';
  begin
    perform public.save_organizer_session('00000000-0000-4000-8000-000000000f10','{}',false);
    raise exception 'Cross-organizer write accepted';
  exception when insufficient_privilege or unique_violation then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  assert not has_function_privilege(current_user,'public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz)','EXECUTE'), 'Anonymous mutation allowed';
end $$;
rollback;
