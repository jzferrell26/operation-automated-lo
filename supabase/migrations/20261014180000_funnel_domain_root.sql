-- Additive public root capability. Catalog/function creation only; no table rewrite.
-- The existing domain and publication checks remain the routing authority.
begin;
set local role migration_owner;
set local lock_timeout = '5s';
create function campaign.funnel_domain_default(wanted_host text)
returns jsonb language sql stable security definer set search_path = '' as $function$
  with binding as materialized (
    select campaign.funnel_domain_binding(wanted_host) as value
  ), latest as materialized (
    select publication.*
    from campaign.funnel_publications publication cross join binding
    where publication.location_id = (binding.value->>'locationId')::uuid
      and publication.user_id = (binding.value->>'userId')::uuid
      and publication.kind = binding.value->>'defaultKind'
    order by publication.created_at desc, publication.id desc
    limit 1
  )
  select jsonb_build_object('id', publication.id)
  from latest publication
  where publication.active and publication.expires_at > statement_timestamp()
    and campaign.funnel_domain_snapshot(wanted_host, publication.id) is not null
$function$;
revoke all on function campaign.funnel_domain_default(text) from public;
grant execute on function campaign.funnel_domain_default(text) to app_runtime;
commit;
