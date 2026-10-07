-- Bounded expiration of encrypted inquiries; no publication or provider action.
set role migration_owner;
create function campaign.purge_expired_funnel_inquiries()
returns integer language plpgsql security definer set search_path='' as $f$
declare removed integer;
begin
 with expired as (
  select publication_id,request_id from campaign.funnel_inquiries
  where expires_at<now() order by expires_at limit 5000 for update skip locked
 ), deleted as (
  delete from campaign.funnel_inquiries target using expired
  where target.publication_id=expired.publication_id and target.request_id=expired.request_id
  returning 1
 ) select count(*)::integer into removed from deleted;
 return removed;
end
$f$;
revoke all on function campaign.purge_expired_funnel_inquiries() from public;
grant execute on function campaign.purge_expired_funnel_inquiries() to scheduler_runtime;
reset role;
