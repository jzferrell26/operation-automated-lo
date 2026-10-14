begin;
select plan(28);
create function pg_temp.check_ok(result boolean, description text) returns text
language sql security definer as $f$ select ok(result,description) $f$;
set local role migration_owner;
insert into platform.locations(id,display_name,status) values
 ('00000000-0000-4000-8000-000000002301','Webinar tenant A','active'),
 ('00000000-0000-4000-8000-000000002302','Webinar tenant B','active');
insert into platform.app_users(id,safe_display_name) values
 ('00000000-0000-4000-8000-000000002311','Webinar creator'),
 ('00000000-0000-4000-8000-000000002312','Distinct reviewer'),
 ('00000000-0000-4000-8000-000000002313','Other creator'),
 ('00000000-0000-4000-8000-000000002314','Viewer'),
 ('00000000-0000-4000-8000-000000002315','Foreign creator');
insert into platform.role_bindings(location_id,user_id,role) values
 ('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002311','creator'),
 ('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002312','approver'),
 ('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002313','creator'),
 ('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002314','analyst'),
 ('00000000-0000-4000-8000-000000002302','00000000-0000-4000-8000-000000002315','creator');
insert into campaign.funnel_publications(id,location_id,user_id,kind,source_revision,snapshot,created_at,expires_at) values
 ('00000000-0000-4000-8000-000000002321','00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002311','live-webinar','00000000-0000-4000-8000-000000002331','{"kind":"live-webinar"}',now(),now()+interval '10 days'),
 ('00000000-0000-4000-8000-000000002322','00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002313','on-demand','00000000-0000-4000-8000-000000002332','{"kind":"on-demand"}',now(),now()+interval '10 days'),
 ('00000000-0000-4000-8000-000000002323','00000000-0000-4000-8000-000000002302','00000000-0000-4000-8000-000000002315','live-webinar','00000000-0000-4000-8000-000000002333','{"kind":"live-webinar"}',now(),now()+interval '10 days'),
 ('00000000-0000-4000-8000-000000002324','00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002311','buyer','00000000-0000-4000-8000-000000002334','{"kind":"buyer"}',now(),now()+interval '10 days');
insert into campaign.campaigns(id,location_id,campaign_ref,created_by_actor_id,status) values
 ('00000000-0000-4000-8000-000000002341','00000000-0000-4000-8000-000000002301','campaign_01Webinar','00000000-0000-4000-8000-000000002311','draft');
-- Minimal persisted JSON here deliberately tests DB ownership, not the strict
-- app manifest. Full snapshot/hash validation is separately exercised by unit tests.
insert into campaign.campaign_versions(location_id,campaign_id,campaign_ref,campaign_version_ref,version_no,location_ref,input_versions,manifest,manifest_hash,created_by_actor_id,created_by_actor_ref) values
 ('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002341','campaign_01Webinar','version_01Owned',1,'location_01Webinar','{}','{"blueprintId":"webinar-ad","destination":{"publicationId":"00000000-0000-4000-8000-000000002321","publisherActorRef":"actor_00000000000040008000000000002311"}}',repeat('a',64),'00000000-0000-4000-8000-000000002311','actor_00000000000040008000000000002311'),
 ('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002341','campaign_01Webinar','version_02WrongOwner',2,'location_01Webinar','{}','{"blueprintId":"webinar-ad","destination":{"publicationId":"00000000-0000-4000-8000-000000002322","publisherActorRef":"actor_00000000000040008000000000002311"}}',repeat('b',64),'00000000-0000-4000-8000-000000002311','actor_00000000000040008000000000002311'),
 ('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002341','campaign_01Webinar','version_03Foreign',3,'location_01Webinar','{}','{"blueprintId":"webinar-ad","destination":{"publicationId":"00000000-0000-4000-8000-000000002323","publisherActorRef":"actor_00000000000040008000000000002311"}}',repeat('c',64),'00000000-0000-4000-8000-000000002311','actor_00000000000040008000000000002311');
reset role;
select ok(has_function_privilege('app_runtime','campaign.webinar_destination_for_version(text,text,text,bigint,text,uuid)','EXECUTE'),'server has version-scoped capability');
select ok(not has_function_privilege('anon','campaign.webinar_destination_for_version(text,text,text,bigint,text,uuid)','EXECUTE'),'anonymous UUID possession gives no ownership capability');
select ok(not has_function_privilege('authenticated','campaign.webinar_destination_owned(uuid,text,bigint,text,uuid)','EXECUTE'),'browser role cannot resolve private destination');
select ok(not has_function_privilege('app_runtime','campaign.webinar_destination_authorized(text,bigint,text,uuid)','EXECUTE'),'authorization predicate is private');
select ok(not has_function_privilege('anon','campaign.webinar_destination_history_for_version(text,text,text,bigint,text,uuid)','EXECUTE'),'anonymous cannot read raw historical snapshot');
select ok(not has_function_privilege('authenticated','campaign.webinar_destination_history_for_version(text,text,text,bigint,text,uuid)','EXECUTE'),'browser RPC cannot read raw historical snapshot');
select ok(not has_function_privilege('support_runtime','campaign.webinar_destination_history_for_version(text,text,text,bigint,text,uuid)','EXECUTE'),'support cannot read historical gated URLs');
select ok((select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc where pronamespace='campaign'::regnamespace and proname like 'webinar_destination_%'),'fixed empty function search paths');

set local role app_runtime;
select platform.set_app_context('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002311','webinar.owner');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002321','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'embedded',null) is not null,'creator resolves own publication');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002322','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'embedded',null) is null,'same-tenant other creator is inaccessible');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002323','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'embedded',null) is null,'foreign publication is inaccessible');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002324','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'embedded',null) is null,'buyer publication cannot qualify');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002321','campaign_creator',1,'embedded',null) is null,'stale role version refused');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002321','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'local_synthetic',null) is null,'synthetic authority refused');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002321','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'first_party',null) is null,'first-party session must be an actual matching unrevoked row');

select platform.set_app_context('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002312','webinar.reviewer');
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_01Owned','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is not null,'distinct approver resolves version-owned publication');
select pg_temp.check_ok((select count(*)=0 from campaign.funnel_publications),'reviewer still cannot list another publisher publications');
select pg_temp.check_ok(campaign.webinar_destination_owned('00000000-0000-4000-8000-000000002321','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is null,'reviewer cannot use free-standing publication lookup');
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_02WrongOwner','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is null,'version cannot claim another creator publication');
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_03Foreign','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is null,'version cannot claim foreign publication');
select platform.set_app_context('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002313','webinar.other-creator');
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_01Owned','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'embedded',null) is null,'another creator cannot use reviewer exception');
select platform.set_app_context('00000000-0000-4000-8000-000000002302','00000000-0000-4000-8000-000000002315','webinar.foreign');
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_01Owned','campaign_creator',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'creator'),'embedded',null) is null,'foreign tenant cannot enumerate version');
set local role migration_owner;
update campaign.funnel_publications set active=false where id='00000000-0000-4000-8000-000000002321';
set local role app_runtime;
select platform.set_app_context('00000000-0000-4000-8000-000000002301','00000000-0000-4000-8000-000000002312','webinar.offline');
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_01Owned','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is null,'offline version destination refused');
select pg_temp.check_ok(campaign.webinar_destination_history_for_version('campaign_01Webinar','version_01Owned','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is not null,'authorized server can resolve exact inactive historical source');
set local role migration_owner;
update campaign.funnel_publications set active=true where id='00000000-0000-4000-8000-000000002321';
update platform.role_bindings set revoked_at=now() where user_id='00000000-0000-4000-8000-000000002311';
set local role app_runtime;
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_01Owned','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is null,'withdrawn publisher role makes public capability unavailable');
select pg_temp.check_ok(campaign.webinar_destination_history_for_version('campaign_01Webinar','version_01Owned','campaign_approver',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'approver'),'embedded',null) is not null,'publisher withdrawal preserves scoped historical evidence');
set local role migration_owner;
update platform.role_bindings set revoked_at=now() where user_id='00000000-0000-4000-8000-000000002312';
set local role app_runtime;
select pg_temp.check_ok(campaign.webinar_destination_for_version('campaign_01Webinar','version_01Owned','campaign_approver',1,'embedded',null) is null,'revoked reviewer cannot retain capability in an already-established transaction');
select pg_temp.check_ok(campaign.webinar_destination_history_for_version('campaign_01Webinar','version_01Owned','campaign_approver',1,'embedded',null) is null,'historical capability also refuses revoked reviewer');
reset role;
select * from finish();
rollback;
