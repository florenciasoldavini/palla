-- Keep the private schema closed; the public entry point exposes only the
-- bounded discovery projection, like get_public_session_detail.
alter function public.discover_sessions(text,text,date,date,integer,text,text) security definer;
revoke all on function private.discover_sessions(text,text,date,date,integer,text,text) from anon,authenticated;
