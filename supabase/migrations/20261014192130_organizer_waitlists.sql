-- Organizer-only waitlist management. Player entrypoints remain deferred.
create function private.waitlist_block(s public.sessions) returns text
language sql stable set search_path='' as $$
 select case when s.status<>'published' then 'session_unavailable'
   when not s.waitlist_enabled then 'disabled'
   when s.registration_opens_at is not null and now()<s.registration_opens_at then 'not_open'
   when now()>=least(s.starts_at,coalesce(s.registration_closes_at,s.starts_at)) then 'deadline'
   when (select count(*) from public.registrations where session_id=s.id and status='confirmed')>=s.capacity then 'full'
   else null end;
$$;
revoke all on function private.waitlist_block(public.sessions) from public,anon,authenticated;

create or replace function private.guard_registration() returns trigger
language plpgsql security definer set search_path='' as $$
declare s public.sessions; entering boolean;
begin
 select * into s from public.sessions where id=new.session_id for update;
 if tg_op='UPDATE' and (new.id<>old.id or new.session_id<>old.session_id or new.player_id<>old.player_id) then
   raise exception 'Registration identity cannot change';
 end if;
 if new.status in ('confirmed','waitlisted') and s.status<>'published' then raise exception 'Session unavailable'; end if;
 if new.status='confirmed' and (select count(*) from public.registrations where session_id=new.session_id and status='confirmed' and id<>new.id)>=s.capacity then raise exception 'Session capacity exceeded'; end if;
 entering:=new.status='waitlisted' and (tg_op='INSERT' or old.status<>'waitlisted');
 if entering then
   if not s.waitlist_enabled then raise exception 'Waitlist disabled'; end if;
   if now()>=least(s.starts_at,coalesce(s.registration_closes_at,s.starts_at)) or (s.registration_opens_at is not null and now()<s.registration_opens_at) then raise exception 'Registration unavailable'; end if;
   if s.waitlist_capacity is not null and (select count(*) from public.registrations where session_id=s.id and status='waitlisted' and id<>new.id)>=s.waitlist_capacity then raise exception 'Waitlist capacity exceeded'; end if;
   select coalesce(max(waitlist_sequence),0)+1 into new.waitlist_sequence from public.registrations where session_id=s.id;
 end if;
 new.updated_at:=clock_timestamp();
 return new;
end;
$$;

create function private.fill_waitlist(p_session_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare s public.sessions; candidate uuid; promoted integer:=0;
begin
 select * into s from public.sessions where id=p_session_id for update;
 if not found or s.waitlist_promotion_mode<>'automatic' or not exists(select 1 from public.organizers where profile_id=s.organizer_id and status='active') then return 0; end if;
 while private.waitlist_block(s) is null loop
   select r.id into candidate from public.registrations r join public.profiles p on p.id=r.player_id
   where r.session_id=s.id and r.status='waitlisted' and
     (not s.strict_category_enforcement or s.allowed_categories is null or p.playing_category=any(s.allowed_categories))
   order by r.waitlist_sequence,r.joined_at,r.id limit 1 for update of r;
   exit when candidate is null;
   update public.registrations set status='confirmed',confirmed_at=clock_timestamp() where id=candidate;
   promoted:=promoted+1;
 end loop;
 return promoted;
end;
$$;
revoke all on function private.fill_waitlist(uuid) from public,anon,authenticated;

create function private.refresh_waitlist_after_registration() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' and new.status='waitlisted') or
    (tg_op='UPDATE' and old.status='confirmed' and new.status='cancelled') then
   perform private.fill_waitlist(new.session_id);
 end if;
 return new;
end;
$$;
revoke all on function private.refresh_waitlist_after_registration() from public,anon,authenticated;
create trigger refresh_waitlist_after_registration after insert or update of status on public.registrations for each row execute function private.refresh_waitlist_after_registration();

create function private.refresh_waitlist_after_session() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform private.fill_waitlist(new.id); return new; end;
$$;
revoke all on function private.refresh_waitlist_after_session() from public,anon,authenticated;
create trigger refresh_waitlist_after_session after update of capacity,waitlist_enabled,waitlist_promotion_mode,registration_opens_at,registration_closes_at,starts_at,allowed_categories,strict_category_enforcement on public.sessions for each row execute function private.refresh_waitlist_after_session();

create function private.organizer_waitlist(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.sessions; entries jsonb;
begin
 select s0.* into s from public.sessions s0 join public.organizers o on o.profile_id=s0.organizer_id where s0.id=p_session_id and s0.organizer_id=auth.uid() and o.status='active';
 if s.id is null then raise exception 'Organizer access required'; end if;
 select coalesce(jsonb_agg((to_jsonb(r)||jsonb_build_object('waitlist_sequence',r.waitlist_sequence::text,
   'category_eligible',not s.strict_category_enforcement or s.allowed_categories is null or coalesce(p.playing_category=any(s.allowed_categories),false),
   'player',jsonb_build_object('first_name',p.first_name,'last_name',p.last_name,'avatar_url',p.avatar_url,'playing_category',p.playing_category))) order by r.waitlist_sequence,r.joined_at,r.id),'[]'::jsonb) into entries
 from public.registrations r join public.profiles p on p.id=r.player_id where r.session_id=s.id and r.status='waitlisted';
 return jsonb_build_object('session_id',s.id,'session_version',s.updated_at,'enabled',s.waitlist_enabled,
   'promotion_mode',s.waitlist_promotion_mode,'capacity',s.capacity,'waitlist_capacity',s.waitlist_capacity,
   'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'),
   'blocked_reason',private.waitlist_block(s),'entries',entries);
end;
$$;
create function public.get_organizer_waitlist(p_session_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.organizer_waitlist(p_session_id); $$;

create function private.manage_waitlist(p_registration_id uuid,p_action text,p_expected_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.sessions; r public.registrations; blocked text;
begin
 if p_action is null or p_action not in ('promote','remove') or p_expected_version is null then raise exception 'Invalid waitlist request'; end if;
 select s0.* into s from public.sessions s0 join public.registrations r0 on r0.session_id=s0.id join public.organizers o on o.profile_id=s0.organizer_id where r0.id=p_registration_id and s0.organizer_id=auth.uid() and o.status='active';
 if s.id is null then raise exception 'Organizer access required'; end if;
 select * into s from public.sessions where id=s.id for update;
 select * into r from public.registrations where id=p_registration_id for update;
 if s.status<>'published' then raise exception 'Session unavailable'; end if;
 if (p_action='promote' and r.status='confirmed') or (p_action='remove' and r.status='cancelled') then return to_jsonb(r)||jsonb_build_object('waitlist_sequence',r.waitlist_sequence::text); end if;
 if r.status<>'waitlisted' then raise exception 'Player is no longer waitlisted'; end if;
 if r.updated_at<>p_expected_version then raise exception 'Waitlist changed. Reload before saving'; end if;
 if p_action='promote' then
   blocked:=private.waitlist_block(s);
   if blocked is not null then raise exception 'Promotion unavailable: %',blocked; end if;
   if s.strict_category_enforcement and s.allowed_categories is not null and not exists(select 1 from public.profiles where id=r.player_id and playing_category=any(s.allowed_categories)) then raise exception 'Player category is not eligible'; end if;
   update public.registrations set status='confirmed',confirmed_at=clock_timestamp() where id=r.id returning * into r;
 else
   update public.registrations set status='cancelled',cancelled_at=clock_timestamp(),cancelled_by=auth.uid(),cancellation_reason='Removed from waitlist by organizer' where id=r.id returning * into r;
 end if;
 return to_jsonb(r)||jsonb_build_object('waitlist_sequence',r.waitlist_sequence::text);
end;
$$;
create function public.manage_organizer_waitlist(p_registration_id uuid,p_action text,p_expected_version timestamptz) returns jsonb
language sql security invoker set search_path='' as $$ select private.manage_waitlist(p_registration_id,p_action,p_expected_version); $$;

create function private.set_waitlist_mode(p_session_id uuid,p_mode text,p_expected_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.sessions;
begin
 if p_mode is null or p_mode not in ('manual','automatic') or p_expected_version is null then raise exception 'Invalid waitlist mode'; end if;
 select s0.* into s from public.sessions s0 join public.organizers o on o.profile_id=s0.organizer_id where s0.id=p_session_id and s0.organizer_id=auth.uid() and o.status='active' for update of s0;
 if s.id is null then raise exception 'Organizer access required'; end if;
 if s.status<>'published' or not s.waitlist_enabled then raise exception 'Waitlist unavailable'; end if;
 if s.waitlist_promotion_mode<>p_mode then
   if s.updated_at<>p_expected_version then raise exception 'Session changed. Reload before saving'; end if;
   update public.sessions set waitlist_promotion_mode=p_mode,updated_at=clock_timestamp() where id=s.id;
 else perform private.fill_waitlist(s.id); end if;
 return private.organizer_waitlist(s.id);
end;
$$;
create function public.set_organizer_waitlist_mode(p_session_id uuid,p_mode text,p_expected_version timestamptz) returns jsonb
language sql security invoker set search_path='' as $$ select private.set_waitlist_mode(p_session_id,p_mode,p_expected_version); $$;
revoke all on function private.organizer_waitlist(uuid),private.manage_waitlist(uuid,text,timestamptz),private.set_waitlist_mode(uuid,text,timestamptz),public.get_organizer_waitlist(uuid),public.manage_organizer_waitlist(uuid,text,timestamptz),public.set_organizer_waitlist_mode(uuid,text,timestamptz) from public,anon;
grant execute on function private.organizer_waitlist(uuid),private.manage_waitlist(uuid,text,timestamptz),private.set_waitlist_mode(uuid,text,timestamptz),public.get_organizer_waitlist(uuid),public.manage_organizer_waitlist(uuid,text,timestamptz),public.set_organizer_waitlist_mode(uuid,text,timestamptz) to authenticated;
