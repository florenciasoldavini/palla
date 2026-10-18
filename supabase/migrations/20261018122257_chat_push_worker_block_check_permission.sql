-- The invoker worker needs the internal block predicate; clients remain excluded.
grant execute on function private.chat_pair_blocked(uuid,uuid) to service_role;
