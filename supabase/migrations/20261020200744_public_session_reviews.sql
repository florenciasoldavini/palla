-- Public feedback projection; base profile/registration access remains private.
create or replace function public.get_public_session_reviews(
  p_session_id uuid, p_limit integer default 20,
  p_before_created_at timestamptz default null, p_before_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 20 or
    ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'Invalid review page' using errcode = '22023';
  end if;
  if public.get_public_session_detail(p_session_id) is null then return null; end if;
  with target as (
    select id, series_id, organizer_id from public.sessions where id=p_session_id
  ), eligible as materialized (
    select r.id, r.rating, r.comment, r.created_at, r.reviewer_id,
      s.starts_at session_starts_at,
      coalesce(ss.timezone,'America/Argentina/Buenos_Aires') timezone
    from target t join public.sessions s on s.organizer_id=t.organizer_id
      and (s.id=t.id or (t.series_id is not null and s.series_id=t.series_id))
    join public.session_reviews r on r.session_id=s.id and r.organizer_id=s.organizer_id
    left join public.session_series ss on ss.id=s.series_id
    where r.status='published' and s.visibility='public'
      and s.status in ('published','completed') and s.ends_at <= now()
  ), summary as (
    select count(*) total, round(avg(rating),1) average,
      jsonb_build_array(count(*) filter(where rating=5), count(*) filter(where rating=4),
        count(*) filter(where rating=3), count(*) filter(where rating=2), count(*) filter(where rating=1)) distribution
    from eligible
  ), page as materialized (
    select * from eligible
    where p_before_created_at is null or (created_at,id)<(p_before_created_at,p_before_id)
    order by created_at desc,id desc limit p_limit+1
  ), visible as materialized (
    select * from page order by created_at desc,id desc limit p_limit
  )
  select jsonb_build_object(
    'total',summary.total,'average',summary.average,'distribution',summary.distribution,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',v.id,'rating',v.rating,'comment',v.comment,'created_at',v.created_at,
      'session_starts_at',v.session_starts_at,'timezone',v.timezone,
      'reviewer_name',coalesce(nullif(concat_ws(' ',p.first_name,p.last_name),''),'Player'),
      'reviewer_avatar_url',p.avatar_url
    ) order by v.created_at desc,v.id desc)
    from visible v join public.profiles p on p.id=v.reviewer_id),'[]'::jsonb),
    'next_cursor',case when (select count(*) from page)>p_limit then
      (select jsonb_build_object('created_at',created_at,'id',id) from visible order by created_at,id limit 1)
      else null end
  ) into result from summary;
  return result;
end $$;
revoke all on function public.get_public_session_reviews(uuid,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.get_public_session_reviews(uuid,integer,timestamptz,uuid) to anon,authenticated;
comment on function public.get_public_session_reviews(uuid,integer,timestamptz,uuid) is 'Published reviews of ended public occurrences in the same series. One-off sessions use their own reviews. Summary spans all pages; cursor order is stable for equal timestamps. No registration/contact/attendance fields.';
