begin;
select plan(18);
create function pg_temp.assert_is(actual anyelement, expected anyelement, description text)
returns text language sql security definer as $$ select is(actual,expected,description) $$;
create function pg_temp.assert_ok(actual boolean, description text)
returns text language sql security definer as $$ select ok(actual,description) $$;
set local role migration_owner;
create function pg_temp.capture(statement text) returns text language plpgsql as $$
begin execute statement; return 'ok'; exception when others then return sqlstate; end $$;
insert into platform.locations(id,display_name,status) values
('00000000-0000-4000-8000-000000003101','Media A','active'),
('00000000-0000-4000-8000-000000003102','Media B','active');
insert into platform.app_users(id,safe_display_name) values
('00000000-0000-4000-8000-000000003111','Media creator'),
('00000000-0000-4000-8000-000000003112','Media viewer'),
('00000000-0000-4000-8000-000000003113','Foreign creator');
insert into platform.role_bindings(location_id,user_id,role) values
('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003111','creator'),
('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003112','analyst'),
('00000000-0000-4000-8000-000000003102','00000000-0000-4000-8000-000000003113','creator');
create function pg_temp.add_media(loc uuid, actor uuid, ref text) returns void language sql as $$
insert into campaign.financing_media(location_id,media_ref,location_ref,created_by,created_by_ref,request_id,request_hash,source_sha256,sha256,mime_type,byte_size,width,height,normalization_version,rights_basis,created_at)
values(loc,ref,'location_media0001',actor,'actor_media0001',gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('c',64),'image/jpeg',1000,600,400,'1.0.0','owned','2026-10-13T12:00:00Z') $$;
select pg_temp.add_media('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003111','media_11111111111111111111111111111111');
select pg_temp.assert_ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='campaign.financing_media'::regclass),'media RLS enabled and forced');
select pg_temp.assert_ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='campaign.financing_media_revocations'::regclass),'revocation RLS enabled and forced');
select pg_temp.assert_ok(not has_table_privilege('app_runtime','campaign.financing_media','UPDATE'),'runtime metadata has no update grant');
select pg_temp.assert_ok(not has_table_privilege('app_runtime','campaign.financing_media','DELETE'),'runtime metadata has no delete grant');
select pg_temp.assert_ok(not has_table_privilege('app_runtime','campaign.financing_media_revocations','UPDATE'),'revocation has no update grant');
select pg_temp.assert_ok(not has_table_privilege('app_runtime','campaign.financing_media_revocations','DELETE'),'revocation has no delete grant');
select pg_temp.assert_is(pg_temp.capture($sql$ update campaign.financing_media set byte_size=1001 $sql$),'55000','owner cannot mutate ready metadata');
set local role app_runtime;
select platform.set_app_context('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003111','correlation_media0001');
select pg_temp.assert_is((select count(*)::integer from campaign.financing_media),1,'same tenant can read ready media');
select pg_temp.assert_is(pg_temp.capture($sql$ select pg_temp.add_media('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003111','media_22222222222222222222222222222222') $sql$),'ok','active creator can insert own media');
select pg_temp.assert_is(pg_temp.capture($sql$ select pg_temp.add_media('00000000-0000-4000-8000-000000003102','00000000-0000-4000-8000-000000003111','media_33333333333333333333333333333333') $sql$),'42501','foreign tenant insertion denied');
select pg_temp.assert_is(pg_temp.capture($sql$ select pg_temp.add_media('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003112','media_44444444444444444444444444444444') $sql$),'42501','foreign actor insertion denied');
select platform.set_app_context('00000000-0000-4000-8000-000000003102','00000000-0000-4000-8000-000000003113','correlation_media0002');
select pg_temp.assert_is((select count(*)::integer from campaign.financing_media),0,'foreign reference read hidden by RLS');
select platform.set_app_context('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003112','correlation_media0003');
select pg_temp.assert_is(pg_temp.capture($sql$ select pg_temp.add_media('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003112','media_55555555555555555555555555555555') $sql$),'42501','reader cannot insert media');
select pg_temp.assert_is(pg_temp.capture($sql$ insert into campaign.financing_media_revocations(location_id,media_ref,revoked_by,revoked_by_ref) values('00000000-0000-4000-8000-000000003101','media_11111111111111111111111111111111','00000000-0000-4000-8000-000000003112','actor_reader0001') $sql$),'42501','reader cannot revoke media');
select platform.set_app_context('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003111','correlation_media0004');
select pg_temp.assert_is(pg_temp.capture($sql$ insert into campaign.financing_media_revocations(location_id,media_ref,revoked_by,revoked_by_ref) values('00000000-0000-4000-8000-000000003101','media_11111111111111111111111111111111','00000000-0000-4000-8000-000000003111','actor_creator0001') $sql$),'ok','creator can append rights revocation');
select pg_temp.assert_is((select count(*)::integer from campaign.financing_media_revocations),1,'revocation retained separately');
select pg_temp.assert_is(pg_temp.capture($sql$ insert into campaign.financing_media_revocations(location_id,media_ref,revoked_by,revoked_by_ref) values('00000000-0000-4000-8000-000000003101','media_11111111111111111111111111111111','00000000-0000-4000-8000-000000003111','actor_creator0001') $sql$),'23505','duplicate revocation cannot overwrite original');
set local role migration_owner;
select pg_temp.assert_is(pg_temp.capture($sql$ delete from campaign.financing_media_revocations $sql$),'55000','owner cannot erase revocation');
reset role;
select * from finish();
rollback;
