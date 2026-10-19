-- Add existing session timing to the authorized review context; no new stored data.
create or replace function private.review_context(p_registration uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.registrations;s public.sessions;v public.session_reviews;begin
 select * into r from public.registrations where id=p_registration;
 select * into s from public.sessions where id=r.session_id;
 select * into v from public.session_reviews where registration_id=r.id;
 if auth.uid() is null or r.id is null or not (r.player_id=auth.uid() or (s.organizer_id=auth.uid() and v.id is not null)) then raise exception 'Review unavailable' using errcode='42501';end if;
 return jsonb_build_object('registration_id',r.id,'session_id',s.id,'session_title',s.title,'starts_at',s.starts_at,'timezone',coalesce((select timezone from public.session_series where id=s.series_id),'America/Argentina/Buenos_Aires'),'ends_at',s.ends_at,'deadline',s.ends_at+interval '14 days','host_name',(select btrim(concat_ws(' ',first_name,last_name)) from public.profiles where id=s.organizer_id),'reviewer_name',(select btrim(concat_ws(' ',first_name,last_name)) from public.profiles where id=r.player_id),
 'is_author',r.player_id=auth.uid(),'eligible',r.player_id=auth.uid() and r.player_id<>s.organizer_id and r.status='confirmed' and s.status in ('published','completed') and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and coalesce(v.status,'')<>'removed',
 'reported',exists(select 1 from private.review_reports where review_id=v.id),
 'review',case when v.id is null then null else jsonb_build_object('id',v.id,'rating',v.rating,'comment',case when v.status='removed' then null else v.comment end,'status',v.status,'created_at',v.created_at,'updated_at',v.updated_at) end);
end$$;
