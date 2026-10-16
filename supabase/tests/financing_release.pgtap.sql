begin;
select plan(42);
create function pg_temp.assert_ok(actual boolean,description text) returns text language sql security definer as $$ select ok(actual,description) $$;
create function pg_temp.assert_is(actual anyelement,expected anyelement,description text) returns text language sql security definer as $$ select is(actual,expected,description) $$;
set local role migration_owner;
create function pg_temp.capture(statement text) returns text language plpgsql as $$ begin execute statement; return 'ok'; exception when others then return sqlstate; end $$;
select pg_temp.assert_ok(c.relrowsecurity and c.relforcerowsecurity,t.name||' has forced RLS')
 from (values('financing_release_evidence'),('financing_release_sources'),('financing_release_source_evidence'),('financing_releases'),('financing_release_operations'),('financing_release_inquiries'),('financing_release_delivery')) t(name)
 join pg_class c on c.oid=('campaign.'||t.name)::regclass;
select pg_temp.assert_ok(not has_table_privilege('app_runtime','campaign.'||t.name,'INSERT'),t.name||' has no runtime direct insertion')
 from (values('financing_release_evidence'),('financing_release_sources'),('financing_release_source_evidence'),('financing_releases'),('financing_release_operations'),('financing_release_inquiries'),('financing_release_delivery')) t(name);
select pg_temp.assert_ok(not has_table_privilege('app_runtime','campaign.'||t.name,'UPDATE') and not has_table_privilege('app_runtime','campaign.'||t.name,'DELETE'),t.name||' has no runtime direct mutation')
 from (values('financing_release_evidence'),('financing_release_sources'),('financing_release_source_evidence'),('financing_releases'),('financing_release_operations'),('financing_release_inquiries'),('financing_release_delivery')) t(name);
select pg_temp.assert_ok(not has_function_privilege('app_runtime','campaign.financing_release_admit_evidence(uuid,text,jsonb,jsonb)','EXECUTE'),'runtime cannot admit verification records');
select pg_temp.assert_ok(has_function_privilege('financing_verifier_runtime','campaign.financing_release_admit_evidence(uuid,text,jsonb,jsonb)','EXECUTE'),'separate verifier can admit verification records');
select pg_temp.assert_ok(not has_table_privilege('financing_verifier_runtime','campaign.financing_release_evidence','INSERT'),'verifier has no direct table mutation grant');
select pg_temp.assert_ok(not has_function_privilege('app_runtime','campaign.financing_release_assert_source(uuid,jsonb)','EXECUTE'),'source guard helper stays private');
select pg_temp.assert_ok(has_function_privilege('scheduler_runtime','campaign.purge_expired_financing_inquiries()','EXECUTE'),'scheduler can perform bounded purge');
select pg_temp.assert_ok(not has_function_privilege('app_runtime','campaign.purge_expired_financing_inquiries()','EXECUTE'),'runtime cannot perform cross-tenant purge');
select pg_temp.assert_ok(has_function_privilege('scheduler_runtime','campaign.purge_expired_marketing_inquiries()','EXECUTE'),'scheduler can purge both inquiry families within the combined bound');
select pg_temp.assert_ok(not has_function_privilege('app_runtime','campaign.purge_expired_marketing_inquiries()','EXECUTE'),'runtime cannot invoke combined scheduler cleanup');
select pg_temp.assert_ok((select not(rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolreplication or rolbypassrls) from pg_roles where rolname='financing_verifier_runtime'),'verifier role has no elevation attributes');
select pg_temp.assert_ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='campaign.financing_release_public_scopes'::regclass),'protected anonymous scope has forced RLS');
select pg_temp.assert_ok(not has_table_privilege('financing_public_runtime','campaign.financing_release_public_scopes','SELECT,INSERT,UPDATE,DELETE'),'anonymous role cannot inspect or forge protected scopes');
select pg_temp.assert_ok(not has_table_privilege('app_runtime','campaign.financing_release_public_scopes','SELECT,INSERT,UPDATE,DELETE'),'native runtime cannot inspect or forge protected anonymous scopes');
select pg_temp.assert_ok(not has_function_privilege('financing_public_runtime','campaign.financing_release_public_scope()','EXECUTE'),'protected scope helper cannot be invoked directly');
select pg_temp.assert_ok(not has_function_privilege('financing_public_runtime','campaign.financing_release_authorize(text,bigint,text,uuid)','EXECUTE'),'anonymous role cannot invoke native owner authorization');
select pg_temp.assert_ok(not has_function_privilege('financing_public_runtime','campaign.financing_release_export()','EXECUTE'),'anonymous role cannot invoke owner inquiry export');
insert into platform.locations(id,display_name,status) values ('00000000-0000-4000-8000-000000005101','Finance A','active'),('00000000-0000-4000-8000-000000005102','Finance B','active');
insert into platform.app_users(id,safe_display_name) values ('00000000-0000-4000-8000-000000005111','Finance owner A'),('00000000-0000-4000-8000-000000005112','Finance owner B');
insert into platform.role_bindings(location_id,user_id,role) values ('00000000-0000-4000-8000-000000005101','00000000-0000-4000-8000-000000005111','location_admin'),('00000000-0000-4000-8000-000000005102','00000000-0000-4000-8000-000000005112','location_admin');
select campaign.financing_release_admit_evidence('00000000-0000-4000-8000-000000005101','quote',jsonb_build_object(
 'recordRef','evidence_quote001','revisionRef','revision_quote001','locationRef','location_quote001','contentHash',repeat('a',64),
 'verificationRef','verification_quote001','verifiedBy','actor_quote001','verifiedAt',now()-interval '1 hour','issuedAt',now()-interval '2 hours',
 'expiresAt',now()+interval '1 day','revokedAt',null,'channels',jsonb_build_array('site','pdf')),
 jsonb_build_object('qualificationRef','verification_quote001','receiptHash',repeat('b',64),'verifierRef','verifier_quote001','method','lender-record'));
select pg_temp.assert_is(pg_temp.capture($sql$ update campaign.financing_release_evidence set evidence=evidence||'{}'::jsonb $sql$),'55000','verification evidence cannot be rewritten');
set local role app_runtime;
select platform.set_app_context('00000000-0000-4000-8000-000000005101','00000000-0000-4000-8000-000000005111','correlation_finance001');
select pg_temp.assert_is((select count(*)::integer from campaign.financing_release_evidence),1,'same tenant reads admitted evidence');
select pg_temp.assert_is(pg_temp.capture($sql$ select campaign.financing_release_reserve('prepare',gen_random_uuid(),repeat('c',64)) $sql$),'42501','context alone does not grant command authority');
select pg_temp.assert_ok(campaign.financing_release_authorize('location_admin',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'location_admin'),'embedded',null),'current sole LO owner is authorized');
select platform.set_app_context('00000000-0000-4000-8000-000000005102','00000000-0000-4000-8000-000000005112','correlation_finance002');
select pg_temp.assert_is((select count(*)::integer from campaign.financing_release_evidence),0,'foreign tenant evidence is hidden');
select campaign.financing_release_authorize('location_admin',platform.current_role_version(platform.current_location_id(),platform.current_actor_id(),'location_admin'),'embedded',null);
select pg_temp.assert_is(campaign.financing_release_withdraw_evidence('evidence_quote001','revision_quote001'),false,'foreign tenant cannot withdraw guessed evidence');
reset role;
select * from finish();
rollback;
