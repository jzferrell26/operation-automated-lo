begin;

select plan(5);

select ok(current_database() is not null, 'local database is reachable');
select hasnt_table('public', 'locations', 'Phase 0 has no tenant location table');
select hasnt_table('public', 'campaigns', 'Phase 0 has no production campaign table');
select hasnt_table('public', 'oauth_tokens', 'Phase 0 has no OAuth token table');
select hasnt_table('public', 'provider_operations', 'Phase 0 has no provider operation table');

select * from finish();

rollback;
