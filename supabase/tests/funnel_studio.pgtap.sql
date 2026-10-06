begin;
select plan(12);
create function pg_temp.assert_is(actual anyelement,expected anyelement,description text)
returns text language sql security definer as $f$ select is(actual,expected,description) $f$;
create function pg_temp.capture_state(statement text)
returns text language plpgsql as $f$ begin execute statement;return null;exception when others then return sqlstate;end $f$;

select has_table('campaign','funnel_drafts','the private studio table exists');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='campaign.funnel_drafts'::regclass),'studio rows force RLS');
select ok(has_table_privilege('app_runtime','campaign.funnel_drafts','SELECT,INSERT,UPDATE'),'app runtime can perform bounded private draft operations');
select ok(not has_table_privilege('app_runtime','campaign.funnel_drafts','DELETE'),'runtime cannot delete drafts through SQL');
select ok(not has_table_privilege('support_runtime','campaign.funnel_drafts','SELECT'),'support does not inherit private draft/photo content');

set local role migration_owner;
insert into platform.agencies(id,display_name) values('99000000-0000-4000-8000-000000000001','Funnel test agency');
insert into platform.locations(id,agency_id,display_name,status) values
('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000001','First workspace','active'),
('99000000-0000-4000-8000-000000000102','99000000-0000-4000-8000-000000000001','Second workspace','active');
insert into platform.app_users(id,safe_display_name) values
('99000000-0000-4000-8000-000000000201','First author'),('99000000-0000-4000-8000-000000000202','Second author');
insert into platform.role_bindings(location_id,user_id,role) values
('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000201','location_admin'),
('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000202','creator'),
('99000000-0000-4000-8000-000000000102','99000000-0000-4000-8000-000000000202','location_admin');
insert into campaign.funnel_drafts(location_id,user_id,kind,revision,draft) values
('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000201','buyer','99000000-0000-4000-8000-000000000301','{"kind":"buyer","revision":"99000000-0000-4000-8000-000000000301","publicationAuthorized":false}'),
('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000202','buyer','99000000-0000-4000-8000-000000000302','{"kind":"buyer","revision":"99000000-0000-4000-8000-000000000302","publicationAuthorized":false}'),
('99000000-0000-4000-8000-000000000102','99000000-0000-4000-8000-000000000202','buyer','99000000-0000-4000-8000-000000000303','{"kind":"buyer","revision":"99000000-0000-4000-8000-000000000303","publicationAuthorized":false}');
reset role;
set local role app_runtime;
select platform.set_app_context('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000201','corr.funnel-test');
select pg_temp.assert_is((select count(*)::int from campaign.funnel_drafts),1,'only the current author draft is visible');
select pg_temp.assert_is((select count(*)::int from campaign.funnel_drafts where user_id='99000000-0000-4000-8000-000000000202'),0,'same-workspace authors cannot see each other private draft');
select pg_temp.assert_is((select count(*)::int from campaign.funnel_drafts where location_id='99000000-0000-4000-8000-000000000102'),0,'other workspace is not enumerable');
select pg_temp.assert_is(pg_temp.capture_state($sql$
insert into campaign.funnel_drafts(location_id,user_id,kind,revision,draft) values
('99000000-0000-4000-8000-000000000102','99000000-0000-4000-8000-000000000202','refinance','99000000-0000-4000-8000-000000000304','{"kind":"refinance","revision":"99000000-0000-4000-8000-000000000304","publicationAuthorized":false}')
$sql$),'42501','runtime cannot forge another author or workspace');
select pg_temp.assert_is(pg_temp.capture_state($sql$ update campaign.funnel_drafts set draft=jsonb_set(draft,'{publicationAuthorized}','true') $sql$),'23514','draft storage cannot become public authorization');
select pg_temp.assert_is(pg_temp.capture_state($sql$ update campaign.funnel_drafts set draft=draft-'publicationAuthorized' $sql$),'23514','missing publication flag cannot bypass the check through SQL NULL');
select pg_temp.assert_is(pg_temp.capture_state($sql$ update campaign.funnel_drafts set revision='99000000-0000-4000-8000-000000000399' $sql$),'23514','row and content revisions cannot diverge');
reset role;
select * from finish();
rollback;
