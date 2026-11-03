-- DESTRUCTIVE REVIEW ARTIFACT ONLY: separate approval required for action + target.
-- Disable the feature in clients first. Export relationship data privately if required.
-- Intentionally no CASCADE: unexpected dependents must abort rather than be removed.
begin;
revoke all on function public.get_profile_connections(uuid),public.list_profile_connections(text,text,integer),public.mutate_profile_connection(uuid,text,uuid,integer,boolean,uuid[]) from authenticated;
drop function public.get_profile_connections(uuid);
drop function public.list_profile_connections(text,text,integer);
drop function public.mutate_profile_connection(uuid,text,uuid,integer,boolean,uuid[]);
drop function private.connection_mutate(uuid,text,uuid,integer,boolean,uuid[]);
drop function private.connection_list(text,text,integer);
drop function private.connection_summary(uuid);
drop table private.connection_notifications;
drop table private.connection_friendships;
drop table private.connection_follows;
drop table private.connection_requests;
drop policy profiles_connection_identity on public.profiles;
revoke select(id,username,display_name,avatar_path) on public.profiles from connection_rpc;
revoke execute on function auth.uid() from connection_rpc;
revoke usage on schema public,private,auth from connection_rpc;
drop role connection_rpc;
commit;
